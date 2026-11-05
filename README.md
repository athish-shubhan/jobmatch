# JobMatch

A skill-based job matching platform built with React, Express.js, and MySQL.

---

## Technical Stack

- **Frontend**: React + Vite (Modular architecture)
- **Backend**: Node.js + Express
- **Database**: MySQL 8.0 (Views & Stored Procedures)
- **AI**: Gemini 2.5 Flash (via Secure Backend Proxy)

See [docs/architecture.md](docs/architecture.md) for a component diagram, the data model and how the match score is computed.

---

## Quick start

Needs Node.js 20+ and MySQL 8.0.

### 1. Database
`schema.sql` creates the `jobmatch` database, the MySQL users `db_admin` / `db_viewer` / `db_editor`, the match-score view, the ranking procedure and some sample data. Run it as a MySQL user that can create users (usually `root`):
```bash
mysql -u root -p < schema.sql
```
Re-running it drops and recreates the tables, which resets the sample data.

### 2. Backend
```bash
cp .env.example .env      # defaults match schema.sql; set JWT_SECRET
npm install
npm start                 # http://localhost:5001
```

| Variable | Default | Notes |
|---|---|---|
| `DB_HOST` / `DB_PORT` | `localhost` / `3306` | |
| `DB_USER` / `DB_PASSWORD` | `db_admin` / *(empty)* | `schema.sql` sets `db_admin`'s password to `admin_pass` |
| `DB_NAME` | `jobmatch` | |
| `PORT` | `5001` | The frontend expects `5001` unless you set `VITE_API_BASE` |
| `JWT_SECRET` | insecure dev value | Required when `NODE_ENV=production` |
| `GEMINI_API_KEY` | none | Only the AI Advisor page needs it |

### 3. Frontend
```bash
cd jobmatch
npm install
npm run dev               # http://localhost:5173
```

### Demo logins (from the sample data)
| Role | Login |
|---|---|
| Applicant | `alice@email.com` / `pass123` |
| Employer | `hr@techcorp.com` / `hr123` |
| DBA panel | `db_admin` / `admin123`, `db_viewer` / `view123`, `db_editor` / `edit123` |

The DBA panel logins are demo accounts hard-coded in `server.js`. They are not the MySQL users.

---

## Testing

```bash
npm test
```
This runs the unit tests in `test/`. The database and the Gemini call are faked, so they need no setup. They cover auth and roles, input validation, the error handler, DBA permissions and the AI proxy timeout.

To also run the integration tests against a real MySQL (logins, match scores from the view, the ranking procedure, and employers being limited to their own company's jobs), load a fresh `schema.sql` first, then:
```bash
JOBMATCH_DB_TESTS=1 DB_USER=root DB_PASSWORD=<root password> npm test
```
The integration tests change data, so reload `schema.sql` before running them again.

A browser smoke test logs in as an applicant, an employer and a DBA in headless Chromium, using the built frontend, the real API and MySQL. It also checks that applying to a job shows a match score and that an employer only sees their own jobs. With a freshly loaded `schema.sql`:
```bash
npm install && npx playwright install chromium
(cd jobmatch && npm install && npm run build)
DB_USER=root DB_PASSWORD=<root password> npm run test:e2e
```
It starts the API on port 5001 itself, so stop any running `npm start` first.

CI (`.github/workflows/ci.yml`) runs the unit, integration and browser tests against a MySQL 8.0 service, and runs `npm run lint` and `npm run build` for the frontend.
