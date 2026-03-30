import { S } from "../../styles";

const SQL_SCHEMA = `-- JobMatch MySQL Schema Summary

-- USERS WITH PRIVILEGES
CREATE USER 'db_admin'@'localhost'  → ALL PRIVILEGES + CREATE USER
CREATE USER 'db_viewer'@'localhost' → SELECT only (no write, no create)
CREATE USER 'db_editor'@'localhost' → SELECT + UPDATE (NO CREATE USER)

-- TABLES
COMPANY       (company_id PK, name, location, industry)
APPLICANT     (applicant_id PK, name, email UNIQUE, password_hash, experience_years, resume_url)
EMPLOYER      (employer_id PK, company_id FK→COMPANY, name, email UNIQUE, password_hash)
SKILL         (skill_id PK, skill_name UNIQUE)
JOB           (job_id PK, company_id FK→COMPANY, title, description, min_experience, posted_date, is_active)
JOB_SKILL     (job_id FK, skill_id FK → PK composite, importance ENUM required/preferred)
APPLICANT_SKILL (applicant_id FK, skill_id FK → PK composite, proficiency_level CHECK 1-5)
APPLICATION   (application_id PK, applicant_id FK, job_id FK, UNIQUE(applicant_id,job_id),
               status ENUM Pending/Under Review/Shortlisted/Rejected, match_score FLOAT CHECK 0-1)

-- VIEW
CREATE VIEW v_job_applicant_match AS
  SELECT ... ROUND(0.20*exp_score + 0.60*req_skill_score + 0.20*pref_skill_score, 2) AS match_score
  FROM APPLICANT CROSS JOIN JOB JOIN COMPANY ...

-- STORED PROCEDURE
CREATE PROCEDURE RankApplicantsForJob(IN p_job_id INT)
  SELECT ..., RANK() OVER (ORDER BY match_score DESC) AS applicant_rank
  FROM v_job_applicant_match JOIN APPLICANT JOIN APPLICATION
  WHERE job_id = p_job_id ORDER BY match_score DESC;

-- INDEXES
idx_applicant_email, idx_applicant_experience
idx_job_company, idx_job_active
idx_app_job, idx_app_applicant, idx_app_status`;

export function SchemaView() {
  return (
    <div>
      <h1 style={S.h1}>Database Schema</h1>
      <p style={S.muted}>MySQL 8.0 · schema.sql · run: mysql -u root -p < schema.sql</p>
      <div style={{ background:"#08090d", border:"1px solid #1e2a3a", borderRadius:10, padding:24, overflowX:"auto" }}>
        <pre style={{ margin:0, fontSize:12, color:"#94a3b8", lineHeight:1.8, fontFamily:"'IBM Plex Mono',monospace", whiteSpace:"pre-wrap" }}>
          {SQL_SCHEMA.split("\n").map((line,i) => {
            let color = "#94a3b8";
            if (line.trim().startsWith("--")) color = "#475569";
            else if (/^(CREATE|GRANT|FLUSH|INSERT|DROP)/i.test(line.trim())) color = "#818cf8";
            else if (/^(SELECT|FROM|WHERE|JOIN|RANK|OVER|ORDER|GROUP)/i.test(line.trim())) color = "#7dd3fc";
            else if (/\b(PK|FK|UNIQUE|CHECK|ENUM|INT|VARCHAR|FLOAT|TEXT|DATE|TIMESTAMP)\b/.test(line)) color = "#fbbf24";
            return <span key={i} style={{ color }}>{line+"\n"}</span>;
          })}
        </pre>
      </div>
    </div>
  );
}
