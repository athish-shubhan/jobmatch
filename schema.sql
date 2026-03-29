
CREATE DATABASE IF NOT EXISTS jobmatch;
USE jobmatch;

-- ── DBA User Setup ────────────────────────────────────────────
-- Full admin (read, write, create user/table)
CREATE USER IF NOT EXISTS 'db_admin'@'localhost' IDENTIFIED BY 'admin_pass';
GRANT ALL PRIVILEGES ON jobmatch.* TO 'db_admin'@'localhost';
GRANT CREATE USER ON *.* TO 'db_admin'@'localhost';

-- View-only user (SELECT only, no write, no create)
CREATE USER IF NOT EXISTS 'db_viewer'@'localhost' IDENTIFIED BY 'view_pass';
GRANT SELECT ON jobmatch.* TO 'db_viewer'@'localhost';

-- View + Update user (no CREATE USER right)
CREATE USER IF NOT EXISTS 'db_editor'@'localhost' IDENTIFIED BY 'edit_pass';
GRANT SELECT, UPDATE ON jobmatch.* TO 'db_editor'@'localhost';
-- NOTE: db_editor intentionally has NO CREATE USER privilege

FLUSH PRIVILEGES;

-- ═══════════════════════════════════════════════════════════════
--  TABLES
-- ═══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS APPLICATION;
DROP TABLE IF EXISTS APPLICANT_SKILL;
DROP TABLE IF EXISTS JOB_SKILL;
DROP TABLE IF EXISTS JOB;
DROP TABLE IF EXISTS EMPLOYER;
DROP TABLE IF EXISTS APPLICANT;
DROP TABLE IF EXISTS SKILL;
DROP TABLE IF EXISTS COMPANY;

-- ── COMPANY ───────────────────────────────────────────────────
CREATE TABLE COMPANY (
    company_id  INT           NOT NULL AUTO_INCREMENT,
    name        VARCHAR(255)  NOT NULL,
    location    VARCHAR(255),
    industry    VARCHAR(100),
    created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_company PRIMARY KEY (company_id),
    CONSTRAINT chk_company_name CHECK (CHAR_LENGTH(name) > 0)
);

CREATE INDEX idx_company_industry ON COMPANY(industry);

-- ── APPLICANT ─────────────────────────────────────────────────
CREATE TABLE APPLICANT (
    applicant_id     INT          NOT NULL AUTO_INCREMENT,
    name             VARCHAR(255) NOT NULL,
    email            VARCHAR(255) NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,
    experience_years INT          NOT NULL DEFAULT 0,
    resume_url       VARCHAR(500),
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_applicant    PRIMARY KEY (applicant_id),
    CONSTRAINT uq_applicant_email UNIQUE (email),
    CONSTRAINT chk_experience  CHECK (experience_years >= 0)
);

CREATE INDEX idx_applicant_email      ON APPLICANT(email);
CREATE INDEX idx_applicant_experience ON APPLICANT(experience_years);

-- ── EMPLOYER ──────────────────────────────────────────────────
CREATE TABLE EMPLOYER (
    employer_id   INT          NOT NULL AUTO_INCREMENT,
    company_id    INT          NOT NULL,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_employer       PRIMARY KEY (employer_id),
    CONSTRAINT uq_employer_email UNIQUE (email),
    CONSTRAINT fk_employer_company
        FOREIGN KEY (company_id) REFERENCES COMPANY(company_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ── SKILL ─────────────────────────────────────────────────────
CREATE TABLE SKILL (
    skill_id   INT          NOT NULL AUTO_INCREMENT,
    skill_name VARCHAR(100) NOT NULL,

    CONSTRAINT pk_skill    PRIMARY KEY (skill_id),
    CONSTRAINT uq_skill_name UNIQUE (skill_name),
    CONSTRAINT chk_skill_name CHECK (CHAR_LENGTH(skill_name) > 0)
);

-- ── JOB ───────────────────────────────────────────────────────
CREATE TABLE JOB (
    job_id          INT          NOT NULL AUTO_INCREMENT,
    company_id      INT          NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    min_experience  INT          NOT NULL DEFAULT 0,
    posted_date     DATE         NOT NULL DEFAULT (CURDATE()),
    is_active       TINYINT(1)   NOT NULL DEFAULT 1,

    CONSTRAINT pk_job          PRIMARY KEY (job_id),
    CONSTRAINT fk_job_company
        FOREIGN KEY (company_id) REFERENCES COMPANY(company_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_min_exp CHECK (min_experience >= 0)
);

CREATE INDEX idx_job_company ON JOB(company_id);
CREATE INDEX idx_job_active  ON JOB(is_active);

-- ── JOB_SKILL ─────────────────────────────────────────────────
CREATE TABLE JOB_SKILL (
    job_id     INT         NOT NULL,
    skill_id   INT         NOT NULL,
    importance ENUM('required', 'preferred') NOT NULL DEFAULT 'preferred',

    CONSTRAINT pk_job_skill PRIMARY KEY (job_id, skill_id),
    CONSTRAINT fk_js_job
        FOREIGN KEY (job_id)   REFERENCES JOB(job_id)   ON DELETE CASCADE,
    CONSTRAINT fk_js_skill
        FOREIGN KEY (skill_id) REFERENCES SKILL(skill_id) ON DELETE CASCADE
);

-- ── APPLICANT_SKILL ───────────────────────────────────────────
CREATE TABLE APPLICANT_SKILL (
    applicant_id      INT NOT NULL,
    skill_id          INT NOT NULL,
    proficiency_level INT NOT NULL DEFAULT 1,

    CONSTRAINT pk_applicant_skill PRIMARY KEY (applicant_id, skill_id),
    CONSTRAINT fk_as_applicant
        FOREIGN KEY (applicant_id) REFERENCES APPLICANT(applicant_id) ON DELETE CASCADE,
    CONSTRAINT fk_as_skill
        FOREIGN KEY (skill_id)     REFERENCES SKILL(skill_id)         ON DELETE CASCADE,
    CONSTRAINT chk_proficiency CHECK (proficiency_level BETWEEN 1 AND 5)
);

-- ── APPLICATION ───────────────────────────────────────────────
CREATE TABLE APPLICATION (
    application_id INT        NOT NULL AUTO_INCREMENT,
    applicant_id   INT        NOT NULL,
    job_id         INT        NOT NULL,
    applied_date   DATE       NOT NULL DEFAULT (CURDATE()),
    status         ENUM('Pending', 'Under Review', 'Shortlisted', 'Rejected')
                              NOT NULL DEFAULT 'Pending',
    match_score    FLOAT,

    CONSTRAINT pk_application  PRIMARY KEY (application_id),
    CONSTRAINT uq_one_per_job  UNIQUE (applicant_id, job_id),
    CONSTRAINT fk_app_applicant
        FOREIGN KEY (applicant_id) REFERENCES APPLICANT(applicant_id) ON DELETE CASCADE,
    CONSTRAINT fk_app_job
        FOREIGN KEY (job_id)       REFERENCES JOB(job_id)             ON DELETE CASCADE,
    CONSTRAINT chk_match_score CHECK (match_score IS NULL OR match_score BETWEEN 0 AND 1)
);

CREATE INDEX idx_app_job       ON APPLICATION(job_id);
CREATE INDEX idx_app_applicant ON APPLICATION(applicant_id);
CREATE INDEX idx_app_status    ON APPLICATION(status);

-- ═══════════════════════════════════════════════════════════════
--  VIEW: v_job_applicant_match
--  Computes match score using experience + required skills + preferred skills
--  Weights: 20% experience · 60% required skills · 20% preferred skills
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_job_applicant_match AS
SELECT
    a.applicant_id,
    a.name             AS applicant_name,
    a.experience_years,
    j.job_id,
    j.title            AS job_title,
    c.company_id,
    c.name             AS company_name,
    c.location,
    c.industry,
    j.min_experience,
    j.posted_date,

    -- experience score (0–1)
    ROUND(
        0.20 * IF(a.experience_years >= j.min_experience, 1.0,
                  a.experience_years / NULLIF(j.min_experience, 0))
      + 0.60 * COALESCE(
                  (SELECT COUNT(*)
                   FROM JOB_SKILL js_req
                   JOIN APPLICANT_SKILL aps_req
                     ON aps_req.skill_id    = js_req.skill_id
                    AND aps_req.applicant_id = a.applicant_id
                   WHERE js_req.job_id = j.job_id
                     AND js_req.importance = 'required')
                  /
                  NULLIF(
                    (SELECT COUNT(*) FROM JOB_SKILL js_cnt
                     WHERE js_cnt.job_id = j.job_id AND js_cnt.importance = 'required'),
                  0),
               1.0)
      + 0.20 * COALESCE(
                  (SELECT COUNT(*)
                   FROM JOB_SKILL js_pref
                   JOIN APPLICANT_SKILL aps_pref
                     ON aps_pref.skill_id    = js_pref.skill_id
                    AND aps_pref.applicant_id = a.applicant_id
                   WHERE js_pref.job_id = j.job_id
                     AND js_pref.importance = 'preferred')
                  /
                  NULLIF(
                    (SELECT COUNT(*) FROM JOB_SKILL js_pcnt
                     WHERE js_pcnt.job_id = j.job_id AND js_pcnt.importance = 'preferred'),
                  0),
               1.0)
    , 2) AS match_score

FROM APPLICANT a
CROSS JOIN JOB j
JOIN COMPANY c ON c.company_id = j.company_id
WHERE j.is_active = 1;

-- ═══════════════════════════════════════════════════════════════
--  STORED PROCEDURE: RankApplicantsForJob
--  Uses RANK() window function to rank applicants by match score
-- ═══════════════════════════════════════════════════════════════
DROP PROCEDURE IF EXISTS RankApplicantsForJob;

DELIMITER //
CREATE PROCEDURE RankApplicantsForJob(IN p_job_id INT)
BEGIN
    SELECT
        v.applicant_id,
        v.applicant_name        AS name,
        a.email,
        v.experience_years,
        v.match_score,
        ap.application_id,
        ap.applied_date,
        ap.status,
        RANK() OVER (ORDER BY v.match_score DESC) AS applicant_rank
    FROM v_job_applicant_match v
    JOIN APPLICANT a  ON a.applicant_id  = v.applicant_id
    JOIN APPLICATION ap
      ON ap.applicant_id = v.applicant_id
     AND ap.job_id       = v.job_id
    WHERE v.job_id = p_job_id
    ORDER BY v.match_score DESC;
END //
DELIMITER ;

-- ═══════════════════════════════════════════════════════════════
--  SAMPLE DATA
-- ═══════════════════════════════════════════════════════════════

INSERT INTO COMPANY (name, location, industry) VALUES
    ('TechCorp Solutions',      'Bangalore',  'Software'),
    ('DataSystems Inc.',        'Mumbai',     'Analytics'),
    ('CloudBase Technologies',  'Hyderabad',  'Cloud');

INSERT INTO SKILL (skill_name) VALUES
    ('Python'), ('JavaScript'), ('React'), ('Node.js'),
    ('MySQL'), ('Machine Learning'), ('Docker'), ('AWS'),
    ('Data Analysis'), ('Git');

-- Passwords: bcrypt of 'pass123' and 'hr123'
-- In production run: node -e "const b=require('bcryptjs');console.log(b.hashSync('pass123',10))"
-- For demo we store a known bcrypt hash:
INSERT INTO APPLICANT (name, email, password_hash, experience_years, resume_url) VALUES
    ('Alice Johnson', 'alice@email.com',
     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- pass123
     3, 'https://resume.example.com/alice'),
    ('Bob Smith', 'bob@email.com',
     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- pass123
     2, 'https://resume.example.com/bob');

INSERT INTO EMPLOYER (company_id, name, email, password_hash) VALUES
    (1, 'Sarah HR',     'hr@techcorp.com',
     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'), -- hr123
    (2, 'Mike Recruit', 'recruit@datasystems.com',
     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'); -- hr123

INSERT INTO JOB (company_id, title, description, min_experience) VALUES
    (1, 'Full Stack Developer',
     'Build scalable web apps using React and Node.js. Own features end-to-end across the full stack.', 2),
    (1, 'ML Engineer',
     'Develop and deploy ML models for production. Strong Python and model optimization skills required.', 3),
    (2, 'Data Analyst',
     'Analyze large datasets and create actionable business insights. SQL and visualization essential.', 1),
    (3, 'DevOps Engineer',
     'Manage CI/CD pipelines and AWS cloud infrastructure. Experience with containerization required.', 2);

-- JOB 1: Full Stack Developer
INSERT INTO JOB_SKILL (job_id, skill_id, importance) VALUES
    (1, 2, 'required'),   -- JavaScript required
    (1, 3, 'required'),   -- React required
    (1, 4, 'preferred'),  -- Node.js preferred
    (1, 5, 'preferred');  -- MySQL preferred

-- JOB 2: ML Engineer
INSERT INTO JOB_SKILL (job_id, skill_id, importance) VALUES
    (2, 1, 'required'),   -- Python required
    (2, 6, 'required'),   -- Machine Learning required
    (2, 5, 'preferred');  -- MySQL preferred

-- JOB 3: Data Analyst
INSERT INTO JOB_SKILL (job_id, skill_id, importance) VALUES
    (3, 1, 'required'),   -- Python required
    (3, 9, 'required'),   -- Data Analysis required
    (3, 5, 'preferred');  -- MySQL preferred

-- JOB 4: DevOps Engineer
INSERT INTO JOB_SKILL (job_id, skill_id, importance) VALUES
    (4, 7, 'required'),   -- Docker required
    (4, 8, 'required'),   -- AWS required
    (4, 10,'preferred');  -- Git preferred

-- Alice's skills
INSERT INTO APPLICANT_SKILL (applicant_id, skill_id, proficiency_level) VALUES
    (1, 1, 4),  -- Python: Advanced
    (1, 2, 5),  -- JavaScript: Expert
    (1, 3, 4),  -- React: Advanced
    (1, 6, 3);  -- ML: Intermediate

-- Bob's skills
INSERT INTO APPLICANT_SKILL (applicant_id, skill_id, proficiency_level) VALUES
    (2, 2, 3),  -- JavaScript: Intermediate
    (2, 4, 4),  -- Node.js: Advanced
    (2, 5, 4),  -- MySQL: Advanced
    (2, 10,4);  -- Git: Advanced

-- Sample applications
INSERT INTO APPLICATION (applicant_id, job_id, status, match_score) VALUES
    (1, 2, 'Under Review', 0.85),
    (2, 1, 'Shortlisted',  0.78);
