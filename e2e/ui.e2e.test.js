// Browser smoke test: the built React app against the real API and MySQL.
// Skipped unless JOBMATCH_E2E=1. Needs: schema.sql freshly loaded, DB_* env vars
// for the API, `npm run build` in jobmatch/, and a Playwright Chromium.
// The API is started in-process on :5001 because the built app calls
// http://localhost:5001/api (VITE_API_BASE default).
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const enabled = process.env.JOBMATCH_E2E === "1";
const DIST = path.join(__dirname, "..", "jobmatch", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };

// Minimal static server for jobmatch/dist (SPA: unknown paths serve index.html).
function serveDist() {
  return http.createServer((req, res) => {
    const file = path.join(DIST, decodeURIComponent(new URL(req.url, "http://x").pathname));
    const target = file.startsWith(DIST) && fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(DIST, "index.html");
    res.writeHead(200, { "Content-Type": TYPES[path.extname(target)] || "application/octet-stream" });
    fs.createReadStream(target).pipe(res);
  });
}

describe("UI smoke test (built frontend + API + MySQL)", { skip: !enabled && "set JOBMATCH_E2E=1 to run" }, () => {
  let api, web, pool, browser, base;

  before(async () => {
    const { chromium } = require("playwright");
    const { createApp, createPool } = require("../server.js");
    assert.ok(fs.existsSync(path.join(DIST, "index.html")), "run `npm run build` in jobmatch/ first");
    pool = createPool();
    api = await new Promise((r) => { const s = createApp({ pool, jwtSecret: "e2e" }).listen(5001, () => r(s)); });
    web = await new Promise((r) => { const s = serveDist().listen(0, "127.0.0.1", () => r(s)); });
    base = `http://127.0.0.1:${web.address().port}`;
    browser = await chromium.launch();
  });

  after(async () => {
    await browser?.close();
    await new Promise((r) => web ? web.close(r) : r());
    await new Promise((r) => api ? api.close(r) : r());
    await pool?.end();
  });

  async function login(tab, user, password) {
    const page = await browser.newPage();
    page.errors = [];
    page.on("pageerror", (e) => page.errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") page.errors.push(m.text()); });
    await page.goto(base);
    await page.getByRole("button", { name: tab, exact: true }).click();
    if (tab === "DBA") await page.getByPlaceholder("db_admin / db_viewer / db_editor").fill(user);
    else await page.locator('input[type="email"]').fill(user);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('input[type="password"]').press("Enter");
    return page;
  }

  test("applicant: browse jobs, apply, see the application", async () => {
    const page = await login("Applicant", "alice@email.com", "pass123");
    await page.getByRole("heading", { name: "Browse Jobs" }).waitFor();
    assert.ok(await page.getByText("Data Analyst", { exact: true }).isVisible());

    const card = page.locator("div", { has: page.getByText("Data Analyst", { exact: true }) })
      .filter({ has: page.getByRole("button", { name: "Apply →" }) }).last();
    await card.getByRole("button", { name: "Apply →" }).click();
    await page.getByText(/Applied! Match score: \d+%/).waitFor();

    await page.getByText("My Applications", { exact: true }).click();
    await page.getByRole("heading", { name: "My Applications" }).waitFor();
    await page.getByText("Data Analyst").first().waitFor();
    assert.deepEqual(page.errors, []);
    await page.close();
  });

  test("employer: rank applicants for an own job", async () => {
    const page = await login("Employer", "hr@techcorp.com", "hr123");
    await page.getByRole("heading", { name: "Rank & Shortlist" }).waitFor();
    await page.locator("select").first().selectOption("1"); // job 1: Full Stack Developer (TechCorp)
    await page.getByText("Bob Smith").waitFor();
    await page.getByText("My Jobs", { exact: true }).click();
    await page.getByRole("heading", { name: "My Jobs" }).waitFor();
    assert.ok(await page.getByText("ML Engineer").isVisible());
    assert.ok(!(await page.getByText("Data Analyst").isVisible()), "other companies' jobs are not listed");
    assert.deepEqual(page.errors, []);
    await page.close();
  });

  test("DBA viewer: schema and table viewer", async () => {
    const page = await login("DBA", "db_viewer", "view123");
    await page.getByRole("heading", { name: "Database Schema" }).waitFor();
    await page.getByText("Table Viewer", { exact: true }).click();
    await page.getByRole("heading", { name: "Table Viewer" }).waitFor();
    assert.deepEqual(page.errors, []);
    await page.close();
  });

  test("wrong password shows an error and stays on the login page", async () => {
    const page = await login("Applicant", "alice@email.com", "nope");
    await page.getByText("Invalid credentials").waitFor();
    assert.ok(await page.locator('input[type="password"]').isVisible());
    // The 401 response is logged by the browser as a console error; that is expected here.
    await page.close();
  });
});
