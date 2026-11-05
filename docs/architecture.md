# Architecture

JobMatch has three parts: a React + Vite single-page app (`jobmatch/`), an Express API (`server.js`) and a MySQL 8 database (`schema.sql`). The API is the only component that talks to MySQL and to Gemini. The browser never sees the Gemini key.

```mermaid
flowchart LR
  subgraph Browser
    UI["React SPA<br/>jobmatch/src"]
  end
  subgraph API["Express API (server.js, :5001)"]
    AUTH["auth(roles) middleware<br/>JWT, 8h / 4h expiry"]
    R["Routes<br/>/api/auth · /api/jobs · /api/applicants<br/>/api/applications · /api/employer · /api/dba"]
    AI["/api/ai/advice<br/>15 s timeout"]
    ERR["Error handler<br/>DB constraint errors → 4xx"]
  end
  subgraph DB["MySQL 8 (schema.sql)"]
    T[("Tables")]
    V[["View v_job_applicant_match"]]
    P[["Procedure RankApplicantsForJob"]]
  end
  G["Gemini 2.5 Flash"]

  UI -- "fetch + Bearer token" --> AUTH --> R
  R -- "mysql2 pool, parameterised SQL" --> T
  R -- "score on apply" --> V
  R -- "CALL (own company's jobs only)" --> P
  P --> V
  V --> T
  AUTH --> AI -- "applicant profile + job" --> G
  R -.-> ERR
```

## Roles

| Role | How they log in | What they can do |
|---|---|---|
| Applicant | `APPLICANT` row, bcrypt password | Edit profile and skills, browse and apply to jobs, ask the AI advisor |
| Employer | `EMPLOYER` row, bcrypt password | Post jobs, see and rank applicants **for their own company's jobs only**, set application status |
| DBA | Demo accounts hard-coded in `server.js` | View whitelisted tables (no password hashes). Update whitelisted columns (`UPDATE` permission). Create MySQL users (`CREATE USER` permission) |

## Data model

```mermaid
erDiagram
  COMPANY ||--o{ EMPLOYER : employs
  COMPANY ||--o{ JOB : posts
  JOB ||--o{ JOB_SKILL : requires
  SKILL ||--o{ JOB_SKILL : "used in"
  APPLICANT ||--o{ APPLICANT_SKILL : has
  SKILL ||--o{ APPLICANT_SKILL : "held as"
  APPLICANT ||--o{ APPLICATION : submits
  JOB ||--o{ APPLICATION : receives

  JOB_SKILL {
    enum importance "required or preferred"
  }
  APPLICANT_SKILL {
    int proficiency_level "1 to 5"
  }
  APPLICATION {
    enum status "Pending, Under Review, Shortlisted, Rejected"
    float match_score "0 to 1"
  }
```

`APPLICATION` has a unique `(applicant_id, job_id)` pair, so an applicant can apply to a job only once. `CHECK` constraints keep experience non-negative, proficiency between 1 and 5, and `match_score` between 0 and 1. The API turns violations of these into 400/409 responses.

## Match score

`v_job_applicant_match` scores every (applicant, active job) pair:

```
score = 0.20 × experience  (1 if experience ≥ min_experience, else experience / min_experience)
      + 0.60 × share of the job's required skills the applicant has   (1 if the job lists none)
      + 0.20 × share of the job's preferred skills the applicant has  (1 if the job lists none)
```

It is rounded to 2 decimals. `POST /api/applications` stores the score at apply time. `RankApplicantsForJob(job_id)` joins the view with `APPLICATION` and ranks applicants with `RANK() OVER (ORDER BY match_score DESC)`.

## Testing

`test/api.test.js` runs the Express app against a fake pool. `test/db.test.js` runs it against a real MySQL loaded with `schema.sql`, which exercises the view, the procedure and the constraints. See the README for how to run both.
