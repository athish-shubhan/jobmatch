require("dotenv").config();
// ═══════════════════════════════════════════════════════════════
//  JobMatch — Express.js Backend
//  Setup:
//    npm init -y
//    npm install express mysql2 cors bcryptjs jsonwebtoken
//    node server.js
// ═══════════════════════════════════════════════════════════════

const express = require("express");
const mysql   = require("mysql2/promise");
const cors    = require("cors");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");

const app = express();
app.use(cors({ }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "jobmatch_secret_key_change_in_production";
const PORT       = 5001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ── DB Pool ───────────────────────────────────────────────────
const pool = mysql.createPool({
  host:               "localhost",
  user:               "db_admin",
  password:           process.env.DB_PASSWORD || "",
  database:           "jobmatch",
  waitForConnections: true,
  connectionLimit:    10,
});

// ── Auth Middleware ───────────────────────────────────────────
const auth = (roles = []) => (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token provided" });
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (roles.length && !roles.includes(decoded.role))
      return res.status(403).json({ error: "Access forbidden" });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

app.get("/", (req, res) => {
  res.send("JobMatch API running 🚀");
});
// ── Async wrapper ─────────────────────────────────────────────
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ═══════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════

app.post("/api/auth/register", wrap(async (req, res) => {
  const { name, email, password, experience_years, resume_url } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "name, email, password required" });
  const hash = await bcrypt.hash(password, 10);
  try {
    const [result] = await pool.query(
      `INSERT INTO APPLICANT (name, email, password_hash, experience_years, resume_url)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, hash, parseInt(experience_years) || 0, resume_url || null]
    );
    res.status(201).json({ applicant_id: result.insertId, name, email });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "Email already registered" });
    throw e;
  }
}));

app.post("/api/auth/login/applicant", wrap(async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.query("SELECT * FROM APPLICANT WHERE email = ?", [email]);
  if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });
  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid)  return res.status(401).json({ error: "Invalid credentials" });
  const u = rows[0];
  const token = jwt.sign(
    { id: u.applicant_id, name: u.name, email: u.email, role: "applicant" },
    JWT_SECRET, { expiresIn: "8h" }
  );
  res.json({ token, user: { id: u.applicant_id, name: u.name, email: u.email, role: "applicant" } });
}));

app.post("/api/auth/login/employer", wrap(async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.query(
    `SELECT e.*, c.name AS company_name FROM EMPLOYER e
     JOIN COMPANY c ON c.company_id = e.company_id WHERE e.email = ?`, [email]
  );
  if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });
  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid)  return res.status(401).json({ error: "Invalid credentials" });
  const u = rows[0];
  const token = jwt.sign(
    { id: u.employer_id, name: u.name, company_id: u.company_id, role: "employer" },
    JWT_SECRET, { expiresIn: "8h" }
  );
  res.json({ token, user: { id: u.employer_id, name: u.name, company_id: u.company_id, company_name: u.company_name, role: "employer" } });
}));

app.post("/api/auth/login/dba", wrap(async (req, res) => {
  const { username, password } = req.body;
  const DBA_USERS = {
    db_admin:  { password: "admin123", dbRole: "DBA Admin",     permissions: ["SELECT","INSERT","UPDATE","DELETE","CREATE","CREATE USER"] },
    db_viewer: { password: "view123",  dbRole: "View Only",     permissions: ["SELECT"] },
    db_editor: { password: "edit123",  dbRole: "View & Update", permissions: ["SELECT","UPDATE"] },
  };
  const u = DBA_USERS[username];
  if (!u || u.password !== password)
    return res.status(401).json({ error: "Invalid DB credentials" });
  const token = jwt.sign(
    { username, role: "dba", dbRole: u.dbRole, permissions: u.permissions },
    JWT_SECRET, { expiresIn: "4h" }
  );
  res.json({ token, user: { name: username, role: "dba", dbRole: u.dbRole, permissions: u.permissions } });
}));

// ═══════════════════════════════════════════════════════════════
//  JOBS
// ═══════════════════════════════════════════════════════════════

app.get("/api/jobs", wrap(async (req, res) => {
  const [jobs] = await pool.query(`
    SELECT j.job_id, j.title, j.description, j.min_experience, j.posted_date,
           c.company_id, c.name AS company_name, c.location, c.industry
    FROM JOB j JOIN COMPANY c ON c.company_id = j.company_id
    WHERE j.is_active = 1 ORDER BY j.posted_date DESC`);
  const [skills] = await pool.query(`
    SELECT js.job_id, js.importance, s.skill_id, s.skill_name
    FROM JOB_SKILL js JOIN SKILL s ON s.skill_id = js.skill_id`);
  res.json(jobs.map(j => ({ ...j, skills: skills.filter(s => s.job_id === j.job_id) })));
}));

app.post("/api/jobs", auth(["employer"]), wrap(async (req, res) => {
  const { title, description, min_experience, skills } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO JOB (company_id, title, description, min_experience) VALUES (?, ?, ?, ?)`,
      [req.user.company_id, title, description || "", parseInt(min_experience) || 0]
    );
    const jobId = result.insertId;
    if (Array.isArray(skills) && skills.length) {
      for (const s of skills)
        await conn.query(`INSERT INTO JOB_SKILL (job_id, skill_id, importance) VALUES (?, ?, ?)`,
          [jobId, s.skill_id, s.importance]);
    }
    await conn.commit();
    res.status(201).json({ job_id: jobId });
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}));

// ═══════════════════════════════════════════════════════════════
//  SKILLS
// ═══════════════════════════════════════════════════════════════

app.get("/api/skills", wrap(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM SKILL ORDER BY skill_name");
  res.json(rows);
}));

// ═══════════════════════════════════════════════════════════════
//  APPLICANT
// ═══════════════════════════════════════════════════════════════

app.get("/api/applicants/me", auth(["applicant"]), wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT applicant_id, name, email, experience_years, resume_url
     FROM APPLICANT WHERE applicant_id = ?`, [req.user.id]);
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
}));

app.put("/api/applicants/me", auth(["applicant"]), wrap(async (req, res) => {
  const { name, experience_years, resume_url } = req.body;
  await pool.query(
    `UPDATE APPLICANT SET name=?, experience_years=?, resume_url=? WHERE applicant_id=?`,
    [name, parseInt(experience_years) || 0, resume_url || null, req.user.id]);
  res.json({ ok: true });
}));

app.get("/api/applicants/me/skills", auth(["applicant"]), wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT aps.skill_id, aps.proficiency_level, s.skill_name
     FROM APPLICANT_SKILL aps JOIN SKILL s ON s.skill_id = aps.skill_id
     WHERE aps.applicant_id = ? ORDER BY s.skill_name`, [req.user.id]);
  res.json(rows);
}));

app.post("/api/applicants/me/skills", auth(["applicant"]), wrap(async (req, res) => {
  const { skill_id, proficiency_level } = req.body;
  await pool.query(
    `INSERT INTO APPLICANT_SKILL (applicant_id, skill_id, proficiency_level)
     VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE proficiency_level = VALUES(proficiency_level)`,
    [req.user.id, skill_id, proficiency_level]);
  res.json({ ok: true });
}));

app.delete("/api/applicants/me/skills/:skill_id", auth(["applicant"]), wrap(async (req, res) => {
  await pool.query(
    `DELETE FROM APPLICANT_SKILL WHERE applicant_id=? AND skill_id=?`,
    [req.user.id, req.params.skill_id]);
  res.json({ ok: true });
}));
// ═══════════════════════════════════════════════════════════════
//  APPLICATIONS
// ═══════════════════════════════════════════════════════════════

app.get("/api/applications/me", auth(["applicant"]), wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT ap.application_id, ap.job_id, ap.applied_date, ap.status, ap.match_score,
            j.title AS job_title, c.name AS company_name
     FROM APPLICATION ap
     JOIN JOB j ON j.job_id = ap.job_id
     JOIN COMPANY c ON c.company_id = j.company_id
     WHERE ap.applicant_id = ? ORDER BY ap.applied_date DESC`, [req.user.id]);
  res.json(rows);
}));

app.post("/api/applications", auth(["applicant"]), wrap(async (req, res) => {
  const { job_id } = req.body;
  if (!job_id) return res.status(400).json({ error: "job_id required" });
  // Score from SQL view
  const [scoreRows] = await pool.query(
    `SELECT match_score FROM v_job_applicant_match WHERE applicant_id=? AND job_id=?`,
    [req.user.id, job_id]);
  const score = scoreRows[0]?.match_score ?? 0;
  try {
    const [result] = await pool.query(
      `INSERT INTO APPLICATION (applicant_id, job_id, match_score) VALUES (?, ?, ?)`,
      [req.user.id, job_id, score]);
    res.status(201).json({ application_id: result.insertId, match_score: score });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "Already applied to this job" });
    throw e;
  }
}));

// ═══════════════════════════════════════════════════════════════
//  EMPLOYER
// ═══════════════════════════════════════════════════════════════

app.get("/api/employer/jobs", auth(["employer"]), wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT j.*, COUNT(ap.application_id) AS application_count
     FROM JOB j LEFT JOIN APPLICATION ap ON ap.job_id = j.job_id
     WHERE j.company_id = ? GROUP BY j.job_id ORDER BY j.posted_date DESC`,
    [req.user.company_id]);
  res.json(rows);
}));

// Calls stored procedure RankApplicantsForJob
app.get("/api/jobs/:id/ranked-applicants", auth(["employer"]), wrap(async (req, res) => {
  const [rows] = await pool.query("CALL RankApplicantsForJob(?)", [req.params.id]);
  res.json(rows[0]);
}));

app.patch("/api/applications/:id/status", auth(["employer"]), wrap(async (req, res) => {
  const { status } = req.body;
  const allowed = ["Pending","Under Review","Shortlisted","Rejected"];
  if (!allowed.includes(status))
    return res.status(400).json({ error: "Invalid status" });
  await pool.query(
    `UPDATE APPLICATION SET status=? WHERE application_id=?`,
    [status, req.params.id]);
  res.json({ ok: true });
}));

// ═══════════════════════════════════════════════════════════════
//  DBA
// ═══════════════════════════════════════════════════════════════

app.get("/api/dba/tables/:table", auth(["dba"]), wrap(async (req, res) => {
  const ALLOWED = ["APPLICANT","JOB","COMPANY","SKILL","APPLICATION","APPLICANT_SKILL","JOB_SKILL","EMPLOYER"];
  const t = req.params.table.toUpperCase();
  if (!ALLOWED.includes(t)) return res.status(400).json({ error: "Unknown table" });
  const safeCols = t === "APPLICANT" ? "applicant_id, name, email, experience_years, resume_url, created_at"
                 : t === "EMPLOYER"  ? "employer_id, company_id, name, email, created_at"
                 : "*";
  const [rows] = await pool.query(`SELECT ${safeCols} FROM ${t} LIMIT 100`);
  res.json(rows);
}));

// PATCH /api/dba/update/:table/:id  — db_editor UPDATE
// PATCH /api/dba/update/:table/:id  — db_editor UPDATE
app.patch("/api/dba/update/:table/:id", auth(["dba"]), wrap(async (req, res) => {
  if (!req.user.permissions?.includes("UPDATE"))
    return res.status(403).json({ error: "Permission denied: no UPDATE right" });

  const ALLOWED = {
    APPLICATION: { id: "application_id", cols: ["status"] },
    APPLICANT:   { id: "applicant_id",   cols: ["name", "experience_years", "resume_url"] },
    JOB:         { id: "job_id",         cols: ["title", "description", "min_experience", "is_active"] },
    COMPANY:     { id: "company_id",     cols: ["name", "location", "industry"] },
    EMPLOYER:    { id: "employer_id",    cols: ["name", "email"] },
    SKILL:       { id: "skill_id",       cols: ["skill_name"] },
  };

  const t = req.params.table.toUpperCase();
  if (!ALLOWED[t]) return res.status(400).json({ error: "Table not updatable" });

  const { field, value } = req.body;
  if (!ALLOWED[t].cols.includes(field))
    return res.status(400).json({ error: `Field '${field}' not allowed` });

  await pool.query(
    `UPDATE ${t} SET ${field}=? WHERE ${ALLOWED[t].id}=?`,
    [value, req.params.id]
  );
  res.json({ ok: true });
}));

app.post("/api/dba/users", auth(["dba"]), wrap(async (req, res) => {
  if (!req.user.permissions?.includes("CREATE USER"))
    return res.status(403).json({ error: "Permission denied: no CREATE USER right" });
  const { username, password, grants } = req.body;
  const validGrants = ["SELECT","INSERT","UPDATE","DELETE","CREATE"];
  const safeGrants  = (grants || []).filter(g => validGrants.includes(g));
  if (!safeGrants.length) return res.status(400).json({ error: "At least one valid grant required" });
  const conn = await pool.getConnection();
  try {
    await conn.query(`CREATE USER ?@'localhost' IDENTIFIED BY ?`, [username, password]);
    for (const g of safeGrants)
      await conn.query(`GRANT ${g} ON jobmatch.* TO ?@'localhost'`, [username]);
    await conn.query("FLUSH PRIVILEGES");
    res.json({ ok: true, message: `User '${username}' created with: ${safeGrants.join(", ")}` });
  } catch (e) {
    if (e.code === "ER_CANNOT_USER")
      return res.status(409).json({ error: "Username already exists in MySQL" });
    throw e;
  } finally { conn.release(); }
}));

// ═══════════════════════════════════════════════════════════════
//  AI PROXY
// ═══════════════════════════════════════════════════════════════

app.post("/api/ai/advice", auth(["applicant"]), wrap(async (req, res) => {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_key_here") {
    return res.status(500).json({ error: "Gemini API key not configured on server" });
  }

  const { job_id } = req.body;
  if (!job_id) return res.status(400).json({ error: "job_id required" });

  try {
    // 1. Fetch applicant profile & skills
    const [profileRows] = await pool.query(
      `SELECT name, experience_years FROM APPLICANT WHERE applicant_id = ?`, [req.user.id]
    );
    const [skillRows] = await pool.query(
      `SELECT s.skill_name FROM APPLICANT_SKILL aps 
       JOIN SKILL s ON s.skill_id = aps.skill_id 
       WHERE aps.applicant_id = ?`, [req.user.id]
    );

    // 2. Fetch job details
    const [jobRows] = await pool.query(
      `SELECT j.title, j.description, c.name AS company_name 
       FROM JOB j JOIN COMPANY c ON c.company_id = j.company_id 
       WHERE j.job_id = ?`, [job_id]
    );

    if (!profileRows.length || !jobRows.length) {
      return res.status(404).json({ error: "Applicant or Job not found" });
    }

    const profileData = profileRows[0];
    const jobData     = jobRows[0];
    const skills      = skillRows.map(s => s.skill_name).join(", ");

    const prompt = `You are a career advisor.\n\nApplicant: ${profileData.name}, ${profileData.experience_years} years experience\nSkills: ${skills}\n\nJob: ${jobData.title} at ${jobData.company_name}\nDescription: ${jobData.description}\n\nGive short, specific career advice for this match.`;

    // 3. Call Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );

    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      throw new Error(data.error?.message || "Gemini API error");
    }

    const advice = data.candidates?.[0]?.content?.parts?.[0]?.text || "No advice available.";
    res.json({ advice });

  } catch (e) {
    console.error("AI Advisor Error:", e);
    res.status(500).json({ error: e.message });
  }
}));

app.listen(PORT, () => console.log(`JobMatch API → http://localhost:${PORT}`));
