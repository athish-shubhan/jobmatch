// Integration tests against a real MySQL loaded with schema.sql.
// Skipped unless JOBMATCH_DB_TESTS=1; see README "Testing" for how to run them.
// They modify data, so reload schema.sql before each run.
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { createPool } = require("../server.js");
const { start, call } = require("./helpers");

const enabled = process.env.JOBMATCH_DB_TESTS === "1";

describe("API against MySQL", { skip: !enabled && "set JOBMATCH_DB_TESTS=1 to run" }, () => {
  let srv, pool;
  const tokens = {};

  const login = async (kind, email, password) => {
    const r = await call(srv.url, `/api/auth/login/${kind}`, { method: "POST", body: { email, password } });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return r.body.token;
  };

  before(async () => {
    pool = createPool();
    srv = await start({ pool });
    tokens.alice = await login("applicant", "alice@email.com", "pass123");
    tokens.techcorp = await login("employer", "hr@techcorp.com", "hr123");
    tokens.datasys = await login("employer", "recruit@datasystems.com", "hr123");
  });
  after(async () => { await srv.close(); await pool.end(); });

  test("wrong password is rejected", async () => {
    const r = await call(srv.url, "/api/auth/login/applicant", { method: "POST", body: { email: "alice@email.com", password: "x" } });
    assert.equal(r.status, 401);
  });

  test("lists active jobs with their skills", async () => {
    const r = await call(srv.url, "/api/jobs");
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 4);
    const fullStack = r.body.find((j) => j.title === "Full Stack Developer");
    assert.deepEqual(fullStack.skills.map((s) => s.skill_name).sort(), ["JavaScript", "MySQL", "Node.js", "React"]);
  });

  test("register then log in as a new applicant; duplicate email is 409", async () => {
    const body = { name: "Carol", email: "carol@email.com", password: "pw", experience_years: 1 };
    assert.equal((await call(srv.url, "/api/auth/register", { method: "POST", body })).status, 201);
    assert.equal((await call(srv.url, "/api/auth/register", { method: "POST", body })).status, 409);
    await login("applicant", "carol@email.com", "pw");
  });

  test("applying stores the score from v_job_applicant_match", async () => {
    const [[expected]] = await pool.query(
      "SELECT match_score FROM v_job_applicant_match WHERE applicant_id = 1 AND job_id = 3");
    const r = await call(srv.url, "/api/applications", { method: "POST", body: { job_id: 3 }, auth: tokens.alice });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.match_score, expected.match_score);
    const dup = await call(srv.url, "/api/applications", { method: "POST", body: { job_id: 3 }, auth: tokens.alice });
    assert.equal(dup.status, 409);
  });

  test("applying to a job that does not exist is 404", async () => {
    const r = await call(srv.url, "/api/applications", { method: "POST", body: { job_id: 9999 }, auth: tokens.alice });
    assert.equal(r.status, 404);
  });

  test("employer can rank applicants for their own job", async () => {
    const r = await call(srv.url, "/api/jobs/1/ranked-applicants", { auth: tokens.techcorp });
    assert.equal(r.status, 200);
    assert.ok(r.body.length >= 1);
    assert.equal(r.body[0].applicant_rank, 1);
  });

  test("employer cannot rank applicants for another company's job", async () => {
    // Job 3 belongs to DataSystems (company 2); hr@techcorp.com is company 1.
    const r = await call(srv.url, "/api/jobs/3/ranked-applicants", { auth: tokens.techcorp });
    assert.equal(r.status, 404);
  });

  test("employer can only change status on their own company's applications", async () => {
    const [[app]] = await pool.query("SELECT application_id FROM APPLICATION WHERE applicant_id = 1 AND job_id = 3");
    const path = `/api/applications/${app.application_id}/status`;

    const other = await call(srv.url, path, { method: "PATCH", body: { status: "Rejected" }, auth: tokens.techcorp });
    assert.equal(other.status, 404);

    const own = await call(srv.url, path, { method: "PATCH", body: { status: "Shortlisted" }, auth: tokens.datasys });
    assert.equal(own.status, 200);

    const [[row]] = await pool.query("SELECT status FROM APPLICATION WHERE application_id = ?", [app.application_id]);
    assert.equal(row.status, "Shortlisted");
  });

  test("employer posts a job with skills inside a transaction", async () => {
    const body = { title: "Backend Dev", min_experience: 1, skills: [{ skill_id: 4, importance: "required" }] };
    const r = await call(srv.url, "/api/jobs", { method: "POST", body, auth: tokens.techcorp });
    assert.equal(r.status, 201);
    const [rows] = await pool.query("SELECT skill_id, importance FROM JOB_SKILL WHERE job_id = ?", [r.body.job_id]);
    assert.deepEqual(rows.map((x) => ({ ...x })), [{ skill_id: 4, importance: "required" }]);
  });

  test("applicant skills: add, update proficiency, delete", async () => {
    const add = (lvl) => call(srv.url, "/api/applicants/me/skills", { method: "POST", body: { skill_id: 7, proficiency_level: lvl }, auth: tokens.alice });
    assert.equal((await add(2)).status, 200);
    assert.equal((await add(4)).status, 200);
    let mine = (await call(srv.url, "/api/applicants/me/skills", { auth: tokens.alice })).body;
    assert.equal(mine.find((s) => s.skill_id === 7).proficiency_level, 4);
    await call(srv.url, "/api/applicants/me/skills/7", { method: "DELETE", auth: tokens.alice });
    mine = (await call(srv.url, "/api/applicants/me/skills", { auth: tokens.alice })).body;
    assert.ok(!mine.some((s) => s.skill_id === 7));
  });

  test("DBA table viewer hides password hashes", async () => {
    const r = await call(srv.url, "/api/auth/login/dba", { method: "POST", body: { username: "db_viewer", password: "view123" } });
    const t = await call(srv.url, "/api/dba/tables/applicant", { auth: r.body.token });
    assert.equal(t.status, 200);
    assert.ok(t.body.length >= 2);
    assert.ok(!("password_hash" in t.body[0]));
  });
});
