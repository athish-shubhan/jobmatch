// Unit tests: the database is replaced by a fake pool, so these run anywhere.
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { start, token, call, fakePool } = require("./helpers");

const applicant = token({ id: 1, name: "Alice", role: "applicant" });
const employer  = token({ id: 1, name: "Sarah", company_id: 1, role: "employer" });
const dbaAdmin  = token({ username: "db_admin", role: "dba", permissions: ["SELECT", "UPDATE", "CREATE USER"] });

describe("auth middleware", () => {
  let srv;
  before(async () => { srv = await start({ pool: fakePool() }); });
  after(() => srv.close());

  test("health check responds", async () => {
    const r = await call(srv.url, "/");
    assert.equal(r.status, 200);
  });

  test("missing token is 401", async () => {
    assert.equal((await call(srv.url, "/api/applicants/me")).status, 401);
  });

  test("non-Bearer header is 401", async () => {
    const r = await call(srv.url, "/api/applicants/me", { auth: "Basic abc" });
    assert.equal(r.status, 401);
  });

  test("token signed with another secret is 401", async () => {
    const forged = require("jsonwebtoken").sign({ id: 1, role: "applicant" }, "other");
    assert.equal((await call(srv.url, "/api/applicants/me", { auth: forged })).status, 401);
  });

  test("wrong role is 403", async () => {
    assert.equal((await call(srv.url, "/api/applicants/me", { auth: employer })).status, 403);
  });
});

describe("input validation (never reaches the database)", () => {
  let srv, pool;
  before(async () => { pool = fakePool(); srv = await start({ pool, geminiApiKey: "k" }); });
  after(() => srv.close());

  const cases = [
    ["login without password", "POST", "/api/auth/login/applicant", { email: "a@b.c" }, null],
    ["employer login with non-string email", "POST", "/api/auth/login/employer", { email: 1, password: "x" }, null],
    ["register without name", "POST", "/api/auth/register", { email: "a@b.c", password: "x" }, null],
    ["skill proficiency out of range", "POST", "/api/applicants/me/skills", { skill_id: 1, proficiency_level: 7 }, applicant],
    ["skill without id", "POST", "/api/applicants/me/skills", { proficiency_level: 3 }, applicant],
    ["job with bad skill importance", "POST", "/api/jobs", { title: "T", skills: [{ skill_id: 1, importance: "nice" }] }, employer],
    ["job with non-array skills", "POST", "/api/jobs", { title: "T", skills: "python" }, employer],
    ["apply without job_id", "POST", "/api/applications", {}, applicant],
    ["invalid application status", "PATCH", "/api/applications/1/status", { status: "Hired" }, employer],
    ["AI advice with bad job_id", "POST", "/api/ai/advice", { job_id: "abc" }, applicant],
    ["DBA create user with unsafe name", "POST", "/api/dba/users", { username: "x'@'%", password: "p", grants: ["SELECT"] }, dbaAdmin],
  ];

  for (const [name, method, path, body, auth] of cases) {
    test(`${name} is 400`, async () => {
      const r = await call(srv.url, path, { method, body, auth });
      assert.equal(r.status, 400, JSON.stringify(r.body));
      assert.ok(r.body.error);
    });
  }

  test("none of the above touched the database", () => {
    assert.deepEqual(pool.queries, []);
  });

  test("malformed JSON body is a 400 JSON error", async () => {
    const r = await call(srv.url, "/api/auth/login/applicant", { method: "POST", raw: "{bad" });
    assert.equal(r.status, 400);
    assert.match(r.type, /json/);
  });
});

describe("error handler", () => {
  test("database errors return a JSON 500 without internal details", async () => {
    const pool = fakePool([[/SKILL/, () => { throw new Error("ER_ACCESS_DENIED: secret detail"); }]]);
    const srv = await start({ pool });
    try {
      const r = await call(srv.url, "/api/skills");
      assert.equal(r.status, 500);
      assert.match(r.type, /json/);
      assert.deepEqual(r.body, { error: "Internal server error" });
    } finally { await srv.close(); }
  });
});

describe("DBA login", () => {
  let srv;
  before(async () => { srv = await start({ pool: fakePool() }); });
  after(() => srv.close());

  test("valid demo credentials get a token", async () => {
    const r = await call(srv.url, "/api/auth/login/dba", { method: "POST", body: { username: "db_viewer", password: "view123" } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.user.permissions, ["SELECT"]);
  });

  test("wrong password is 401", async () => {
    const r = await call(srv.url, "/api/auth/login/dba", { method: "POST", body: { username: "db_admin", password: "nope" } });
    assert.equal(r.status, 401);
  });

  // Object.prototype keys used to resolve to a function whose .password is undefined,
  // which matched a missing password and issued a DBA token.
  for (const username of ["constructor", "__proto__", "toString"]) {
    test(`prototype key "${username}" without password is 401`, async () => {
      const r = await call(srv.url, "/api/auth/login/dba", { method: "POST", body: { username } });
      assert.equal(r.status, 401);
    });
  }
});

describe("DBA permissions", () => {
  let srv;
  before(async () => { srv = await start({ pool: fakePool([[/^SELECT/, [[{ skill_id: 1 }]]]]) }); });
  after(() => srv.close());

  test("viewer cannot update", async () => {
    const viewer = token({ username: "db_viewer", role: "dba", permissions: ["SELECT"] });
    const r = await call(srv.url, "/api/dba/update/SKILL/1", { method: "PATCH", body: { field: "skill_name", value: "x" }, auth: viewer });
    assert.equal(r.status, 403);
  });

  test("update rejects columns outside the allow-list", async () => {
    const r = await call(srv.url, "/api/dba/update/APPLICANT/1", { method: "PATCH", body: { field: "password_hash", value: "x" }, auth: dbaAdmin });
    assert.equal(r.status, 400);
  });

  test("unknown table is rejected", async () => {
    const r = await call(srv.url, "/api/dba/tables/mysql.user", { auth: dbaAdmin });
    assert.equal(r.status, 400);
  });
});

describe("AI advisor proxy", () => {
  const pool = () => fakePool([
    [/FROM APPLICANT WHERE/, [[{ name: "Alice", experience_years: 3 }]]],
    [/FROM APPLICANT_SKILL/, [[{ skill_name: "Python" }]]],
    [/FROM JOB j JOIN COMPANY/, [[{ title: "ML Engineer", description: "d", company_name: "TechCorp" }]]],
  ]);

  test("missing API key is reported", async () => {
    const srv = await start({ pool: pool(), geminiApiKey: "" });
    try {
      const r = await call(srv.url, "/api/ai/advice", { method: "POST", body: { job_id: 2 }, auth: applicant });
      assert.equal(r.status, 500);
      assert.match(r.body.error, /not configured/);
    } finally { await srv.close(); }
  });

  test("returns the model's text and sends the profile in the prompt", async () => {
    let sent;
    const fetchImpl = async (url, init) => {
      sent = JSON.parse(init.body).contents[0].parts[0].text;
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "Learn MLOps." }] } }] }) };
    };
    const srv = await start({ pool: pool(), geminiApiKey: "k", fetchImpl });
    try {
      const r = await call(srv.url, "/api/ai/advice", { method: "POST", body: { job_id: 2 }, auth: applicant });
      assert.equal(r.status, 200);
      assert.equal(r.body.advice, "Learn MLOps.");
      assert.match(sent, /Skills: Python/);
      assert.match(sent, /ML Engineer at TechCorp/);
    } finally { await srv.close(); }
  });

  test("a hung upstream call times out with 504", async () => {
    const fetchImpl = (url, init) => new Promise((_, reject) => {
      init.signal.addEventListener("abort", () => reject(init.signal.reason));
    });
    const srv = await start({ pool: pool(), geminiApiKey: "k", fetchImpl, aiTimeoutMs: 50 });
    try {
      const r = await call(srv.url, "/api/ai/advice", { method: "POST", body: { job_id: 2 }, auth: applicant });
      assert.equal(r.status, 504);
    } finally { await srv.close(); }
  });
});
