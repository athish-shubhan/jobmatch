# Improvements log

## Round 1 — 2026-11-05

### What changed
1. **Bug: the demo logins didn't work.** The login page shows `alice@email.com / pass123` and `hr@techcorp.com / hr123`, but the bcrypt hashes in `schema.sql` didn't match those passwords (the employer hash was for `password`). I replaced them with real hashes of `pass123` / `hr123`, and `test/schema.test.js` now checks each seed hash against the advertised password.
2. **Bug: employers could act on other companies' applications.** `GET /api/jobs/:id/ranked-applicants` and `PATCH /api/applications/:id/status` never checked the job's `company_id`, so any employer could see or change applicants for any company. Both are now limited to the employer's own company and return 404 otherwise.
3. **Bug: DBA login bypass.** `DBA_USERS[username]` with `username: "constructor"` and no password resolved to `Object.prototype.constructor`. Its `.password` is `undefined`, which matched the missing password, so a DBA token was issued. The lookup now uses `Object.hasOwn`.
4. **Bug: the error handler was registered before the routes.** Express never reached it, so errors came back as Express's default HTML page. It now sits after the routes and returns JSON, without echoing internal error messages such as SQL errors.
5. **Input validation and timeout.** Missing or invalid login fields, skill levels outside 1-5, bad skill importance, non-numeric `job_id`, unsafe MySQL usernames, and malformed JSON bodies now return 400 instead of reaching MySQL and failing with 500. Applying to a job that doesn't exist now returns 404 instead of silently storing a score of 0. The Gemini call has a 15 s timeout and returns 504 when it expires.
6. **Testable server.** `server.js` exports `createApp({ pool, jwtSecret, geminiApiKey, fetchImpl })` and `createPool()`, and only listens when run directly. `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME` and `PORT` can now be set by environment variable (same defaults as before). With `NODE_ENV=production` the server refuses to start without `JWT_SECRET`.
7. **Tests (`test/`, `node:test`, no new dependencies).** 35 unit tests use a fake pool and a fake `fetch`. 11 integration tests run against MySQL loaded with `schema.sql` and cover logins, the `v_job_applicant_match` view, the `RankApplicantsForJob` procedure, the cross-company checks, transactions and the DBA viewer.
8. **CI.** `.github/workflows/ci.yml` runs the backend tests against a MySQL 8.0 service container, plus frontend `npm run lint` and `npm run build`.
9. **Frontend.** Fixed the 3 existing ESLint errors. `MyJobs` and `PostJob` used to swallow load errors and show a spinner forever; they now show the error.
10. **Repo hygiene and README.** Stopped tracking `node_modules/` (1,064 files) and `.DS_Store`. Added `.env.example`. The README Quick start now matches `schema.sql`: `db_admin`'s password is `admin_pass`, not "your MySQL password". Added demo logins and a Testing section.

### Why it matters
A reviewer following the README couldn't log in with the credentials on the login page. Three of the bugs above were access-control holes in a multi-tenant app. Nothing had automated tests or CI before this.

### How it was verified
Bugs reproduced against the original `server.js` + `schema.sql` (MySQL 8.0 in Docker):
```
$ curl -XPOST :5001/api/auth/login/applicant -d '{"email":"alice@email.com","password":"pass123"}'
{"error":"Invalid credentials"}
$ curl -XPOST :5001/api/auth/login/employer -d '{"email":"hr@techcorp.com","password":"hr123"}'
{"error":"Invalid credentials"}
$ curl -XPOST :5001/api/auth/login/dba -d '{"username":"constructor"}'
{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
$ curl -i -XPOST :5001/api/auth/login/applicant -d '{"email":"alice@email.com"}'
HTTP/1.1 500 Internal Server Error
Content-Type: text/html; charset=utf-8
$ curl :5001/api/jobs/3/ranked-applicants -H "Authorization: Bearer <TechCorp employer>"   # job 3 is DataSystems'
200
```
After the changes:
```
$ npm test                                   # unit tests only
# tests 35
# pass 35
# fail 0
$ mysql -uroot -proot < schema.sql
$ JOBMATCH_DB_TESTS=1 DB_HOST=127.0.0.1 DB_USER=root DB_PASSWORD=root npm test
# tests 46
# suites 7
# pass 46
# fail 0
$ cd jobmatch && npm run lint && npm run build   # lint was 3 errors before
✓ built in 229ms
```
Quick start from a clean clone of this branch: `npm ci`, `npm test` (35 pass), `cp .env.example .env` (with `DB_HOST=127.0.0.1` for Docker), then `npm start`. Logging in as `alice@email.com / pass123` and `hr@techcorp.com / hr123` both return a token. The frontend `npm ci && npm run lint && npm run build` passes.

**Not verified:** the AI Advisor against the real Gemini API (no API key; it is tested with a fake `fetch` only). The frontend was built and linted but not clicked through in a browser.

### Files touched
`server.js`, `schema.sql`, `package.json`, `package-lock.json`, `.gitignore`, `.env.example` (new), `README.md`, `test/` (new), `.github/workflows/ci.yml` (new), `jobmatch/src/pages/Applicant/ApplicantDashboard.jsx`, `jobmatch/src/pages/Employer/MyJobs.jsx`, `jobmatch/src/pages/Employer/PostJob.jsx`, `IMPROVEMENTS.md` (new); removed `node_modules/` and `.DS_Store` from git.
