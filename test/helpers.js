const jwt = require("jsonwebtoken");
const { createApp } = require("../server.js");

const SECRET = "test-secret";

/** Start the app on a random port; returns { url, close }. */
async function start(opts = {}) {
  const app = createApp({ jwtSecret: SECRET, ...opts });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, close: () => new Promise((r) => server.close(r)) };
}

const token = (payload) => jwt.sign(payload, SECRET, { expiresIn: "1h" });

/** fetch() wrapper returning { status, body, type }. */
async function call(url, path, { method = "GET", body, auth, raw } = {}) {
  const headers = {};
  if (body !== undefined || raw !== undefined) headers["Content-Type"] = "application/json";
  if (auth) headers.Authorization = auth.startsWith("Bearer") ? auth : `Bearer ${auth}`;
  const res = await fetch(url + path, {
    method,
    headers,
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get("content-type") || "";
  const text = await res.text();
  return { status: res.status, type, body: type.includes("json") ? JSON.parse(text) : text };
}

/** A pool whose query() answers from a list of handlers; records every SQL string. */
function fakePool(handlers = []) {
  const queries = [];
  return {
    queries,
    async query(sql, params) {
      queries.push({ sql, params });
      for (const [match, result] of handlers) {
        if (match.test(sql)) return typeof result === "function" ? result(sql, params) : result;
      }
      throw new Error(`unexpected query: ${sql}`);
    },
  };
}

module.exports = { start, token, call, fakePool };
