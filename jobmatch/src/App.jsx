import { useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_KEY;
const API_BASE       = "http://localhost:5001/api";

// ═══════════════════════════════════════════════════════════════
//  API CLIENT — every function is a real fetch() to Express
// ═══════════════════════════════════════════════════════════════
const api = async (path, { method = "GET", body, token } = {}) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

// ═══════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════
const S = {
  page:    { minHeight: "100vh", background: "#08090d", color: "#e2e8f0", fontFamily: "'IBM Plex Mono','Courier New',monospace" },
  sidebar: { width: 220, background: "#0d1117", borderRight: "1px solid #1e2a3a", display: "flex", flexDirection: "column", height: "100vh", position: "fixed", top: 0, left: 0, zIndex: 100 },
  main:    { marginLeft: 220, padding: "28px 32px", minHeight: "100vh" },
  card:    { background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 10, padding: 24 },
  cardSm:  { background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 8, padding: 16 },
  input:   { background: "#0a0f1a", border: "1px solid #1e2a3a", borderRadius: 6, padding: "10px 14px", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box", outline: "none" },
  select:  { background: "#0a0f1a", border: "1px solid #1e2a3a", borderRadius: 6, padding: "10px 14px", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  label:   { display: "block", marginBottom: 6, fontSize: 11, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" },
  btnP:    { background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, padding: "10px 20px", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 },
  btnS:    { background: "transparent", color: "#94a3b8", border: "1px solid #1e2a3a", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" },
  h1:      { fontSize: 26, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px" },
  h3:      { fontSize: 15, fontWeight: 600, color: "#e2e8f0", margin: "0 0 12px" },
  muted:   { fontSize: 13, color: "#64748b", margin: "0 0 20px" },
  tag:     { background: "#1e2a3a", color: "#7dd3fc", borderRadius: 4, padding: "2px 8px", fontSize: 11, marginRight: 4, marginBottom: 4, display: "inline-block" },
  badge:   (c) => ({ background: c + "22", color: c, border: `1px solid ${c}55`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }),
  navItem: (a) => ({ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", borderRadius: 6, margin: "1px 8px", fontSize: 13, fontWeight: a ? 600 : 400, color: a ? "#a5b4fc" : "#64748b", background: a ? "#1e1b4b22" : "transparent", borderLeft: a ? "2px solid #4f46e5" : "2px solid transparent" }),
};

const scColor = (s) => s >= 0.8 ? "#22c55e" : s >= 0.6 ? "#f59e0b" : "#ef4444";

// ── Small helpers ─────────────────────────────────────────────
const Spinner = () => (
  <div style={{ padding: 60, textAlign: "center", color: "#334155" }}>
    <div style={{ fontSize: 22 }}>⏳</div>
    <div style={{ marginTop: 8, fontSize: 13 }}>Loading from MySQL...</div>
  </div>
);

const ErrBox = ({ msg }) => (
  <div style={{ background: "#7f1d1d22", border: "1px solid #991b1b", borderRadius: 8, padding: "12px 16px", color: "#fca5a5", fontSize: 13, marginBottom: 16 }}>
    ⚠ {msg}
  </div>
);

function Toast({ t }) {
  const bg = t.type === "error" ? "#7f1d1d" : t.type === "warn" ? "#78350f" : "#14532d";
  const bd = t.type === "error" ? "#991b1b" : t.type === "warn" ? "#92400e" : "#166534";
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: bg, border: `1px solid ${bd}`, borderRadius: 8, padding: "12px 20px", fontSize: 13, color: "#fff", maxWidth: 340, boxShadow: "0 8px 24px #0008" }}>
      {t.msg}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ items, active, onNav, user, onLogout, accent = "#4f46e5" }) {
  return (
    <div style={S.sidebar}>
      <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid #1e2a3a" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: accent, letterSpacing: "0.06em" }}>JOBMATCH</div>
        <div style={{ fontSize: 11, color: "#334155", marginTop: 2 }}>CSF212 Project</div>
      </div>
      <div style={{ padding: "10px 8px", flex: 1, overflowY: "auto" }}>
        {items.map(item => (
          <div key={item.id} style={S.navItem(active === item.id)} onClick={() => onNav(item.id)}>
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: 12, borderTop: "1px solid #1e2a3a" }}>
        <div style={{ fontSize: 11, color: "#334155", marginBottom: 4 }}>Signed in as</div>
        <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, marginBottom: 10 }}>{user?.name}</div>
        <button style={{ ...S.btnS, width: "100%", textAlign: "center" }} onClick={onLogout}>Sign Out</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  LOGIN
// ═══════════════════════════════════════════════════════════════
function LoginPage({ setAuth, setPage, showToast }) {
  const [tab, setTab]      = useState("applicant");
  const [email, setEmail]  = useState("");
  const [pass, setPass]    = useState("");
  const [dbUser, setDbUser]= useState("");
  const [err, setErr]      = useState("");
  const [loading, setLoad] = useState(false);

  const login = async () => {
    setErr(""); setLoad(true);
    try {
      let path, body;
      if      (tab === "applicant") { path = "/auth/login/applicant"; body = { email, password: pass }; }
      else if (tab === "employer")  { path = "/auth/login/employer";  body = { email, password: pass }; }
      else                          { path = "/auth/login/dba";       body = { username: dbUser, password: pass }; }
      const data = await api(path, { method: "POST", body });
      setAuth(data);
    } catch (e) { setErr(e.message); }
    setLoad(false);
  };

  const tabs = [{ id: "applicant", label: "Applicant" }, { id: "employer", label: "Employer" }, { id: "dba", label: "DBA" }];

  return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ width: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9" }}>Job<span style={{ color: "#4f46e5" }}>Match</span></div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Sign in to continue</div>
        </div>

        <div style={S.card}>
          {/* Role tabs */}
          <div style={{ display: "flex", gap: 4, background: "#08090d", borderRadius: 6, padding: 4, marginBottom: 22 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "8px 0", background: tab === t.id ? "#4f46e5" : "transparent", color: tab === t.id ? "#fff" : "#64748b", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: tab === t.id ? 600 : 400 }}>
                {t.label}
              </button>
            ))}
          </div>

          {err && <ErrBox msg={err} />}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {tab === "dba"
              ? <div><label style={S.label}>DB Username</label><input style={S.input} value={dbUser} onChange={e => setDbUser(e.target.value)} placeholder="db_admin / db_viewer / db_editor" /></div>
              : <div><label style={S.label}>Email</label><input style={S.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={tab === "applicant" ? "alice@email.com" : "hr@techcorp.com"} /></div>
            }
            <div>
              <label style={S.label}>Password</label>
              <input style={S.input} type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} />
            </div>
            <button style={{ ...S.btnP, width: "100%", padding: "12px", opacity: loading ? 0.6 : 1 }} onClick={login} disabled={loading}>
              {loading ? "Connecting to server..." : "Sign In →"}
            </button>
          </div>

          {tab === "applicant" && (
            <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "#64748b" }}>
              No account? <span style={{ color: "#818cf8", cursor: "pointer" }} onClick={() => setPage("register")}>Register here</span>
            </div>
          )}
        </div>

        <div style={{ ...S.cardSm, marginTop: 12, fontSize: 11, color: "#334155" }}>
          <div style={{ color: "#475569", fontWeight: 600, marginBottom: 4 }}>DEMO CREDENTIALS</div>
          Applicant: alice@email.com / pass123<br />
          Employer: hr@techcorp.com / hr123<br />
          DBA: db_admin/admin123 · db_viewer/view123 · db_editor/edit123
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  REGISTER
// ═══════════════════════════════════════════════════════════════
function RegisterPage({ setPage, showToast }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", experience_years: "", resume_url: "" });
  const [err, setErr]   = useState("");
  const [loading, setLoad] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setErr(""); setLoad(true);
    try {
      await api("/auth/register", { method: "POST", body: form });
      showToast("Account created! Please sign in.");
      setPage("login");
    } catch (e) { setErr(e.message); }
    setLoad(false);
  };

  return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ width: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>Job<span style={{ color: "#4f46e5" }}>Match</span></div>
          <div style={{ fontSize: 13, color: "#475569" }}>Create your applicant account</div>
        </div>
        <div style={S.card}>
          {err && <ErrBox msg={err} />}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[["name","Full Name","Jane Doe","text"],["email","Email","jane@email.com","email"],["password","Password","Min 6 chars","password"],["experience_years","Years of Experience","0","number"],["resume_url","Resume URL (optional)","https://...","text"]].map(([k, label, ph, type]) => (
              <div key={k}>
                <label style={S.label}>{label}</label>
                <input style={S.input} type={type} value={form[k]} onChange={e => upd(k, e.target.value)} placeholder={ph} />
              </div>
            ))}
            <button style={{ ...S.btnP, width: "100%", padding: "12px", opacity: loading ? 0.6 : 1 }} onClick={submit} disabled={loading}>
              {loading ? "Sending to server..." : "Create Account →"}
            </button>
          </div>
          <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "#64748b" }}>
            Have an account? <span style={{ color: "#818cf8", cursor: "pointer" }} onClick={() => setPage("login")}>Sign In</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  APPLICANT DASHBOARD
// ═══════════════════════════════════════════════════════════════
function ApplicantDashboard({ auth: authData, logout, showToast }) {
  const [view, setView] = useState("browse");
  const tok = authData.token;
  const call = (path, opts) => api(path, { ...opts, token: tok });
  const nav = [
    { id: "browse",       icon: "🔍", label: "Browse Jobs" },
    { id: "applications", icon: "📋", label: "My Applications" },
    { id: "profile",      icon: "👤", label: "Profile" },
    { id: "skills",       icon: "⚡", label: "My Skills" },
    { id: "ai",           icon: "🤖", label: "AI Advisor" },
  ];
  return (
    <div style={S.page}>
      <Sidebar items={nav} active={view} onNav={setView} user={authData.user} onLogout={logout} />
      <div style={S.main}>
        {view === "browse"       && <BrowseJobs       call={call} showToast={showToast} />}
        {view === "applications" && <MyApplications   call={call} />}
        {view === "profile"      && <ApplicantProfile call={call} showToast={showToast} />}
        {view === "skills"       && <SkillsEditor     call={call} showToast={showToast} />}
        {view === "ai"           && <AIAdvisor        call={call} />}
      </div>
    </div>
  );
}

function BrowseJobs({ call, showToast }) {
  const [jobs, setJobs]     = useState(null);
  const [applied, setApplied] = useState(new Set());
  const [search, setSearch] = useState("");
  const [err, setErr]       = useState("");

  const load = useCallback(async () => {
    try {
      const [jobsData, appsData] = await Promise.all([call("/jobs"), call("/applications/me")]);
      setJobs(jobsData);
      setApplied(new Set(appsData.map(a => a.job_id)));
    } catch (e) { setErr(e.message); }
  }, []);

  if (!jobs && !err) { load(); return <Spinner />; }

  const apply = async (job_id) => {
    try {
      const res = await call("/applications", { method: "POST", body: { job_id } });
      setApplied(s => new Set([...s, job_id]));
      showToast(`Applied! Match score: ${Math.round(res.match_score * 100)}%`);
    } catch (e) { showToast(e.message, "error"); }
  };

  const filtered = (jobs || []).filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 style={S.h1}>Browse Jobs</h1>
      <p style={S.muted}>Live data from MySQL · GET /api/jobs</p>
      {err && <ErrBox msg={err} />}
      <input style={{ ...S.input, maxWidth: 380, marginBottom: 20 }} placeholder="🔍  Search jobs or companies..." value={search} onChange={e => setSearch(e.target.value)} />
      <div style={{ display: "grid", gap: 14 }}>
        {filtered.map(job => (
          <div key={job.job_id} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>{job.title}</span>
                  {applied.has(job.job_id) && <span style={S.badge("#22c55e")}>✓ Applied</span>}
                </div>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>
                  {job.company_name} · {job.location} · {job.industry}
                </div>
                <div>
                  <span style={{ ...S.badge("#64748b"), marginRight: 8 }}>≥{job.min_experience}y exp</span>
                  {job.skills?.map(s => (
                    <span key={s.skill_id} style={{ ...S.tag, color: s.importance === "required" ? "#a5b4fc" : "#7dd3fc" }}>
                      {s.skill_name}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ marginLeft: 16, textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#334155", marginBottom: 10 }}>Posted {job.posted_date?.slice(0, 10)}</div>
                {!applied.has(job.job_id) && (
                  <button style={S.btnP} onClick={() => apply(job.job_id)}>Apply →</button>
                )}
              </div>
            </div>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, margin: "14px 0 0" }}>{job.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyApplications({ call }) {
  const [apps, setApps] = useState(null);
  const [err, setErr]   = useState("");
  const statusColor = { "Pending": "#64748b", "Under Review": "#f59e0b", "Shortlisted": "#22c55e", "Rejected": "#ef4444" };

  const load = useCallback(async () => {
    try { setApps(await call("/applications/me")); }
    catch (e) { setErr(e.message); }
  }, []);
  if (!apps && !err) { load(); return <Spinner />; }

  return (
    <div>
      <h1 style={S.h1}>My Applications</h1>
      <p style={S.muted}>GET /api/applications/me · JOINs APPLICATION, JOB, COMPANY</p>
      {err && <ErrBox msg={err} />}
      {apps?.length === 0 && <div style={{ ...S.card, color: "#475569", textAlign: "center", padding: 48 }}>No applications yet. Browse jobs to apply.</div>}
      <div style={{ display: "grid", gap: 12 }}>
        {apps?.map(a => (
          <div key={a.application_id} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>{a.job_title}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{a.company_name} · Applied {a.applied_date?.slice(0, 10)}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: scColor(a.match_score) }}>{Math.round(a.match_score * 100)}%</div>
                <div style={{ fontSize: 11, color: "#334155" }}>match</div>
              </div>
              <span style={S.badge(statusColor[a.status] || "#64748b")}>{a.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplicantProfile({ call, showToast }) {
  const [profile, setProfile] = useState(null);
  const [edit, setEdit]       = useState(false);
  const [form, setForm]       = useState({});
  const [err, setErr]         = useState("");

  const load = useCallback(async () => {
    try { const d = await call("/applicants/me"); setProfile(d); setForm(d); }
    catch (e) { setErr(e.message); }
  }, []);
  if (!profile && !err) { load(); return <Spinner />; }

  const save = async () => {
    try {
      await call("/applicants/me", { method: "PUT", body: form });
      setProfile({ ...profile, ...form });
      setEdit(false);
      showToast("Profile updated in MySQL");
    } catch (e) { showToast(e.message, "error"); }
  };

  return (
    <div>
      <h1 style={S.h1}>Profile</h1>
      <p style={S.muted}>GET · PUT /api/applicants/me → APPLICANT table</p>
      {err && <ErrBox msg={err} />}
      <div style={{ ...S.card, maxWidth: 500 }}>
        {edit ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[["name","Full Name"], ["email","Email"], ["experience_years","Years of Experience"], ["resume_url","Resume URL"]].map(([k, l]) => (
              <div key={k}><label style={S.label}>{l}</label>
                <input style={S.input} value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 8 }}>
              <button style={S.btnP} onClick={save}>Save to DB</button>
              <button style={S.btnS} onClick={() => setEdit(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            {[["Full Name", profile?.name], ["Email", profile?.email], ["Experience", `${profile?.experience_years} years`], ["Resume", profile?.resume_url || "Not provided"]].map(([k, v]) => (
              <div key={k} style={{ marginBottom: 16 }}>
                <div style={S.label}>{k}</div>
                <div style={{ fontSize: 14, color: "#e2e8f0" }}>{v}</div>
              </div>
            ))}
            <button style={S.btnP} onClick={() => setEdit(true)}>Edit Profile</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SkillsEditor({ call, showToast }) {
  const [mySkills, setMySkills]   = useState(null);
  const [allSkills, setAllSkills] = useState([]);
  const [newSkill, setNewSkill]   = useState("");
  const [newLevel, setNewLevel]   = useState(3);
  const [err, setErr]             = useState("");

  const load = useCallback(async () => {
    try {
      const [ms, all] = await Promise.all([call("/applicants/me/skills"), call("/skills")]);
      setMySkills(ms); setAllSkills(all);
    } catch (e) { setErr(e.message); }
  }, []);
  if (!mySkills && !err) { load(); return <Spinner />; }

  const addSkill = async () => {
    const sk = allSkills.find(s => s.skill_name.toLowerCase() === newSkill.toLowerCase());
    if (!sk) { showToast("Skill not found in SKILL table", "error"); return; }
    try {
      await call("/applicants/me/skills", { method: "POST", body: { skill_id: sk.skill_id, proficiency_level: newLevel } });
      showToast("Skill saved to APPLICANT_SKILL");
      setNewSkill(""); load();
    } catch (e) { showToast(e.message, "error"); }
  };

  const remove = async (skill_id) => {
    try {
      await call(`/applicants/me/skills/${skill_id}`, { method: "DELETE" });
      load();
    } catch (e) { showToast(e.message, "error"); }
  };

  const pBar = ["#ef4444","#f97316","#f59e0b","#22c55e","#10b981"];

  return (
    <div>
      <h1 style={S.h1}>My Skills</h1>
      <p style={S.muted}>GET · POST · DELETE /api/applicants/me/skills → APPLICANT_SKILL table</p>
      {err && <ErrBox msg={err} />}
      <div style={{ ...S.card, marginBottom: 20 }}>
        <h3 style={S.h3}>Add Skill</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={S.label}>Skill Name</label>
            <input style={S.input} list="skills-dl" value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="Python, React, Docker..." />
            <datalist id="skills-dl">{allSkills.map(s => <option key={s.skill_id} value={s.skill_name} />)}</datalist>
          </div>
          <div style={{ width: 180 }}>
            <label style={S.label}>Proficiency (1–5)</label>
            <select style={S.select} value={newLevel} onChange={e => setNewLevel(parseInt(e.target.value))}>
              {[1,2,3,4,5].map(l => <option key={l} value={l}>{l} – {["Beginner","Basic","Intermediate","Advanced","Expert"][l-1]}</option>)}
            </select>
          </div>
          <button style={S.btnP} onClick={addSkill}>+ Add</button>
        </div>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {mySkills?.map(ms => (
          <div key={ms.skill_id} style={{ ...S.cardSm, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 6 }}>{ms.skill_name}</div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[1,2,3,4,5].map(l => (
                  <div key={l} style={{ width: 28, height: 6, borderRadius: 3, background: l <= ms.proficiency_level ? pBar[ms.proficiency_level-1] : "#1e2a3a" }} />
                ))}
                <span style={{ fontSize: 11, color: "#64748b", marginLeft: 6 }}>{["Beginner","Basic","Intermediate","Advanced","Expert"][ms.proficiency_level-1]}</span>
              </div>
            </div>
            <button onClick={() => remove(ms.skill_id)} style={{ background: "#7f1d1d", color: "#fca5a5", border: "1px solid #991b1b", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AI Advisor (Gemini) ───────────────────────────────────────
function AIAdvisor({ call }) {
  const [jobs, setJobs]         = useState(null);
  const [jobId, setJobId]       = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoad]      = useState(false);
  const [err, setErr]           = useState("");

  const loadJobs = useCallback(async () => {
    try { setJobs(await call("/jobs")); }
    catch (e) { setErr(e.message); }
  }, []);
  if (!jobs && !err) { loadJobs(); return <Spinner />; }

  const runAI = async () => {
  if (!GEMINI_API_KEY) {
    setResponse("⚠ Add your Gemini API key");
    return;
  }

  setLoad(true);
  setResponse("");

  try {
    const [profile, mySkills] = await Promise.all([
      call("/applicants/me"),
      call("/applicants/me/skills"),
    ]);

    const job = jobs.find(j => j.job_id === parseInt(jobId));

    const prompt = `You are a career advisor.

Applicant: ${profile.name}, ${profile.experience_years} years
Skills: ${mySkills.map(s => s.skill_name).join(", ")}

Job: ${job.title}
Description: ${job.description}

Give short advice.`;

    const res = await fetch(
  `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    }),
  }
);

    const data = await res.json();

    if (!res.ok) {
      setResponse("Gemini Error: " + (data.error?.message || "Unknown"));
      return;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    setResponse(text || "No response from Gemini.");
  } catch (e) {
    setResponse("Error: " + e.message);
  }

  setLoad(false);
};

  return (
    <div>
      <h1 style={S.h1}>AI Career Advisor</h1>
      <p style={S.muted}>Profile fetched from MySQL via Express → sent to Gemini 2.5 Flash (free)</p>
      {err && <ErrBox msg={err} />}

      <div style={{ ...S.card, marginBottom: 16, borderColor: "#4f46e544" }}>
        <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
          Calls <strong style={{ color: "#a5b4fc" }}>GET /api/applicants/me</strong> + <strong style={{ color: "#a5b4fc" }}>GET /api/applicants/me/skills</strong> to get real profile from MySQL, then sends it to <strong style={{ color: "#86efac" }}>Gemini 2 Flash</strong> API.
          {!GEMINI_API_KEY && <span style={{ color: "#fca5a5" }}> ← Add your free Gemini key at the top of App.jsx</span>}
        </div>
      </div>

      <div style={{ ...S.card, maxWidth: 560 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Select Job to Analyze</label>
          <select style={S.select} value={jobId} onChange={e => setJobId(e.target.value)}>
            <option value="">— Choose a job —</option>
            {jobs?.map(j => <option key={j.job_id} value={j.job_id}>{j.title} @ {j.company_name}</option>)}
          </select>
        </div>
        <button style={{ ...S.btnP, opacity: loading || !jobId ? 0.6 : 1 }} onClick={runAI} disabled={loading || !jobId}>
          {loading ? "⏳ Fetching profile + calling Gemini..." : "🤖 Get AI Advice"}
        </button>
        {response && (
          <div style={{ marginTop: 20, background: "#0a0f1a", border: "1px solid #1e2a3a", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 10, letterSpacing: "0.1em" }}>GEMINI 2.5 FLASH — RESPONSE</div>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{response}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  EMPLOYER DASHBOARD
// ═══════════════════════════════════════════════════════════════
function EmployerDashboard({ auth: authData, logout, showToast }) {
  const [view, setView] = useState("rank");
  const tok = authData.token;
  const call = (path, opts) => api(path, { ...opts, token: tok });
  const nav = [
    { id: "rank", icon: "🏆", label: "Rank Applicants" },
    { id: "post", icon: "📝", label: "Post a Job" },
    { id: "jobs", icon: "💼", label: "My Jobs" },
  ];
  return (
    <div style={S.page}>
      <Sidebar items={nav} active={view} onNav={setView} user={authData.user} onLogout={logout} accent="#f59e0b" />
      <div style={S.main}>
        {view === "rank" && <RankApplicants call={call} user={authData.user} showToast={showToast} />}
        {view === "post" && <PostJob        call={call} showToast={showToast} />}
        {view === "jobs" && <MyJobs        call={call} />}
      </div>
    </div>
  );
}

function RankApplicants({ call, showToast }) {
  const [jobs, setJobs]     = useState(null);
  const [jobId, setJobId]   = useState("");
  const [ranked, setRanked] = useState(null);
  const [err, setErr]       = useState("");

  const loadJobs = useCallback(async () => {
    try { setJobs(await call("/employer/jobs")); }
    catch (e) { setErr(e.message); }
  }, []);
  if (!jobs && !err) { loadJobs(); return <Spinner />; }

  const loadRanked = async (jid) => {
    setJobId(jid); setRanked(null);
    if (!jid) return;
    try {
      const data = await call(`/jobs/${jid}/ranked-applicants`);
      setRanked(data);
    } catch (e) { setErr(e.message); }
  };

  const updateStatus = async (appId, status) => {
    try {
      await call(`/applications/${appId}/status`, { method: "PATCH", body: { status } });
      showToast("Status updated → APPLICATION table");
      loadRanked(jobId);
    } catch (e) { showToast(e.message, "error"); }
  };

  return (
    <div>
      <h1 style={S.h1}>Rank & Shortlist</h1>
      <p style={S.muted}>Calls stored procedure RankApplicantsForJob() · RANK() window function</p>
      {err && <ErrBox msg={err} />}
      <div style={{ ...S.card, marginBottom: 20, maxWidth: 440 }}>
        <label style={S.label}>Select Job</label>
        <select style={S.select} value={jobId} onChange={e => loadRanked(e.target.value)}>
          <option value="">— Choose a job —</option>
          {jobs?.map(j => <option key={j.job_id} value={j.job_id}>{j.title} ({j.application_count} applicants)</option>)}
        </select>
      </div>
      {jobId && !ranked && <Spinner />}
      {ranked?.length === 0 && <div style={{ ...S.card, color: "#475569", textAlign: "center", padding: 40 }}>No applications yet.</div>}
      <div style={{ display: "grid", gap: 12 }}>
        {ranked?.map((r, i) => (
          <div key={r.application_id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: i === 0 ? "#f59e0b22" : "#1e2a3a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: i === 0 ? "#f59e0b" : "#475569", flexShrink: 0 }}>
              {i === 0 ? "🥇" : `#${i+1}`}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{r.name}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{r.email} · {r.experience_years}y exp · Rank #{r.applicant_rank}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: scColor(r.match_score) }}>{Math.round(r.match_score * 100)}%</div>
              <div style={{ fontSize: 11, color: "#334155" }}>match</div>
            </div>
            <select style={{ ...S.select, width: 150, padding: "6px 10px", fontSize: 12 }} value={r.status} onChange={e => updateStatus(r.application_id, e.target.value)}>
              {["Pending","Under Review","Shortlisted","Rejected"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function PostJob({ call, showToast }) {
  const [allSkills, setAllSkills] = useState(null);
  const [form, setForm]           = useState({ title: "", description: "", min_experience: 0 });
  const [selected, setSelected]   = useState([]);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const loadSkills = useCallback(async () => {
    try { setAllSkills(await call("/skills")); }
    catch (e) {}
  }, []);
  if (!allSkills) { loadSkills(); return <Spinner />; }

  const toggle = (skill_id, importance) => {
    const ex = selected.find(s => s.skill_id === skill_id);
    if (ex) {
      if (ex.importance === importance) setSelected(s => s.filter(x => x.skill_id !== skill_id));
      else setSelected(s => s.map(x => x.skill_id === skill_id ? { ...x, importance } : x));
    } else setSelected(s => [...s, { skill_id, importance }]);
  };

  const submit = async () => {
    if (!form.title) { showToast("Title required", "error"); return; }
    try {
      await call("/jobs", { method: "POST", body: { ...form, min_experience: parseInt(form.min_experience) || 0, skills: selected } });
      showToast("Job posted → JOB + JOB_SKILL tables");
      setForm({ title: "", description: "", min_experience: 0 }); setSelected([]);
    } catch (e) { showToast(e.message, "error"); }
  };

  return (
    <div>
      <h1 style={S.h1}>Post a Job</h1>
      <p style={S.muted}>POST /api/jobs → INSERT INTO JOB + JOB_SKILL (transaction)</p>
      <div style={{ maxWidth: 600 }}>
        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={S.label}>Job Title *</label><input style={S.input} value={form.title} onChange={e => upd("title", e.target.value)} placeholder="Senior Backend Developer" /></div>
            <div><label style={S.label}>Description</label><textarea style={{ ...S.input, minHeight: 80, resize: "vertical" }} value={form.description} onChange={e => upd("description", e.target.value)} /></div>
            <div><label style={S.label}>Min Experience (years)</label><input style={{ ...S.input, maxWidth: 120 }} type="number" min="0" value={form.min_experience} onChange={e => upd("min_experience", e.target.value)} /></div>
          </div>
        </div>
        <div style={S.card}>
          <h3 style={S.h3}>Skills (click = required · pref = preferred)</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {allSkills.map(sk => {
              const sel = selected.find(s => s.skill_id === sk.skill_id);
              return (
                <div key={sk.skill_id} style={{ display: "flex" }}>
                  <button onClick={() => toggle(sk.skill_id, "required")} style={{ padding: "4px 8px", fontSize: 11, border: "1px solid", borderRadius: "4px 0 0 4px", cursor: "pointer", fontFamily: "inherit", background: sel?.importance === "required" ? "#4f46e5" : "#0a0f1a", color: sel?.importance === "required" ? "#fff" : "#64748b", borderColor: sel?.importance === "required" ? "#4f46e5" : "#1e2a3a" }}>{sk.skill_name}</button>
                  <button onClick={() => toggle(sk.skill_id, "preferred")} style={{ padding: "4px 6px", fontSize: 10, border: "1px solid", borderLeft: "none", borderRadius: "0 4px 4px 0", cursor: "pointer", fontFamily: "inherit", background: sel?.importance === "preferred" ? "#0ea5e9" : "#0a0f1a", color: sel?.importance === "preferred" ? "#fff" : "#475569", borderColor: sel?.importance === "preferred" ? "#0ea5e9" : "#1e2a3a" }}>pref</button>
                </div>
              );
            })}
          </div>
          <button style={S.btnP} onClick={submit}>Post Job →</button>
        </div>
      </div>
    </div>
  );
}

function MyJobs({ call }) {
  const [jobs, setJobs] = useState(null);
  const load = useCallback(async () => {
    try { setJobs(await call("/employer/jobs")); } catch {}
  }, []);
  if (!jobs) { load(); return <Spinner />; }
  return (
    <div>
      <h1 style={S.h1}>My Jobs</h1>
      <p style={S.muted}>GET /api/employer/jobs · LEFT JOIN APPLICATION · GROUP BY job_id</p>
      <div style={{ display: "grid", gap: 12 }}>
        {jobs.map(job => (
          <div key={job.job_id} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>{job.title}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Posted {job.posted_date?.slice(0,10)} · Min {job.min_experience}y exp</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9" }}>{job.application_count}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>applicants</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  DBA PANEL
// ═══════════════════════════════════════════════════════════════
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

function DBAPanel({ auth: authData, logout, showToast }) {
  const [view, setView] = useState("schema");
  const tok = authData.token;
  const call = (path, opts) => api(path, { ...opts, token: tok });
  const canCreate = authData.user.permissions?.includes("CREATE USER");

  const nav = [
    { id: "schema", icon: "🗄️", label: "Schema" },
    { id: "users",  icon: "👥", label: "DB Users" },
    { id: "tables", icon: "📊", label: "Table Viewer" },
  ];

  return (
    <div style={S.page}>
      <Sidebar items={nav} active={view} onNav={setView} user={{ name: authData.user.name }} onLogout={logout} accent="#ec4899" />
      <div style={S.main}>
        <div style={{ ...S.badge(canCreate ? "#22c55e" : "#f59e0b"), marginBottom: 20, display: "inline-flex", alignItems: "center", gap: 6 }}>
          🔐 {authData.user.dbRole} · {authData.user.permissions?.join(", ")}
        </div>
        {view === "schema" && <SchemaView />}
        {view === "users"  && <DBUsersView call={call} authUser={authData.user} showToast={showToast} />}
        {view === "tables" && <TableViewer call={call} />}
      </div>
    </div>
  );
}

function SchemaView() {
  return (
    <div>
      <h1 style={S.h1}>Database Schema</h1>
      <p style={S.muted}>MySQL 8.0 · schema.sql · run: mysql -u root -p &lt; schema.sql</p>
      <div style={{ background: "#08090d", border: "1px solid #1e2a3a", borderRadius: 10, padding: 24, overflowX: "auto" }}>
        <pre style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.8, fontFamily: "'IBM Plex Mono',monospace", whiteSpace: "pre-wrap" }}>
          {SQL_SCHEMA.split("\n").map((line, i) => {
            let color = "#94a3b8";
            if (line.trim().startsWith("--")) color = "#475569";
            else if (/^(CREATE|GRANT|FLUSH|INSERT|DROP)/i.test(line.trim())) color = "#818cf8";
            else if (/^(SELECT|FROM|WHERE|JOIN|RANK|OVER|ORDER|GROUP)/i.test(line.trim())) color = "#7dd3fc";
            else if (/\b(PK|FK|UNIQUE|CHECK|ENUM|INT|VARCHAR|FLOAT|TEXT|DATE|TIMESTAMP)\b/.test(line)) color = "#fbbf24";
            return <span key={i} style={{ color }}>{line + "\n"}</span>;
          })}
        </pre>
      </div>
    </div>
  );
}

function DBUsersView({ call, authUser, showToast }) {
  const canCreate = authUser.permissions?.includes("CREATE USER");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ username: "", password: "", grants: ["SELECT"] });
  const [result, setResult]   = useState("");
  const allPerms = ["SELECT","INSERT","UPDATE","DELETE","CREATE"];

  const createUser = async () => {
    try {
      const data = await call("/dba/users", { method: "POST", body: form });
      setResult("✓ " + data.message);
      showToast("User created in MySQL");
      setShowAdd(false);
    } catch (e) {
      setResult("✗ " + e.message);
    }
  };

  const dbUsers = [
    { username: "db_admin",  dbRole: "DBA Admin",     permissions: ["SELECT","INSERT","UPDATE","DELETE","CREATE","CREATE USER"] },
    { username: "db_viewer", dbRole: "View Only",     permissions: ["SELECT"] },
    { username: "db_editor", dbRole: "View & Update", permissions: ["SELECT","UPDATE"] },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={S.h1}>Database Users</h1>
          <p style={S.muted}>MySQL GRANT / REVOKE privilege management</p>
        </div>
        {canCreate
          ? <button style={S.btnP} onClick={() => setShowAdd(o => !o)}>+ Create User</button>
          : <span style={{ ...S.badge("#ef4444"), padding: "8px 14px" }}>No CREATE USER privilege</span>
        }
      </div>

      {showAdd && canCreate && (
        <div style={{ ...S.card, marginBottom: 20, borderColor: "#4f46e5" }}>
          <h3 style={S.h3}>Create User → POST /api/dba/users → MySQL CREATE USER + GRANT</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div><label style={S.label}>Username</label><input style={S.input} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="new_user" /></div>
            <div><label style={S.label}>Password</label><input style={S.input} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>GRANT Privileges</label>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {allPerms.map(p => (
                <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.grants.includes(p)} onChange={e => setForm(f => ({ ...f, grants: e.target.checked ? [...f.grants, p] : f.grants.filter(x => x !== p) }))} />
                  {p}
                </label>
              ))}
            </div>
          </div>
          {result && <div style={{ marginBottom: 12, fontSize: 12, color: result.startsWith("✓") ? "#86efac" : "#fca5a5" }}>{result}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={S.btnP} onClick={createUser}>Create in MySQL</button>
            <button style={S.btnS} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {dbUsers.map(u => (
          <div key={u.username} style={{ ...S.card, borderLeft: `3px solid ${u.dbRole === "DBA Admin" ? "#ec4899" : u.dbRole === "View Only" ? "#64748b" : "#f59e0b"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
                  {u.username}<span style={{ fontSize: 12, fontWeight: 400, color: "#475569" }}>@localhost</span>
                </div>
                <span style={S.badge(u.dbRole === "DBA Admin" ? "#ec4899" : u.dbRole === "View Only" ? "#64748b" : "#f59e0b")}>{u.dbRole}</span>
                {u.username === "db_editor" && (
                  <span style={{ ...S.badge("#ef4444"), marginLeft: 8 }}>NO CREATE USER</span>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#475569", marginBottom: 6, textAlign: "right" }}>GRANTED PRIVILEGES</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {["SELECT","INSERT","UPDATE","DELETE","CREATE","CREATE USER"].map(p => (
                    <span key={p} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, fontFamily: "inherit", background: u.permissions.includes(p) ? "#14532d" : "#1e2a3a", color: u.permissions.includes(p) ? "#86efac" : "#334155" }}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableViewer({ call }) {
  const [table, setTable]   = useState("");
  const [rows, setRows]     = useState(null);
  const [loading, setLoad]  = useState(false);
  const [err, setErr]       = useState("");
  const tables = ["APPLICANT","JOB","COMPANY","SKILL","APPLICATION","APPLICANT_SKILL","JOB_SKILL","EMPLOYER"];

  const load = async (t) => {
    setTable(t); setRows(null); setErr(""); setLoad(true);
    try { setRows(await call(`/dba/tables/${t}`)); }
    catch (e) { setErr(e.message); }
    setLoad(false);
  };

  const cols = rows?.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div>
      <h1 style={S.h1}>Table Viewer</h1>
      <p style={S.muted}>GET /api/dba/tables/:table → SELECT * FROM table (live from MySQL)</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {tables.map(t => (
          <button key={t} onClick={() => load(t)} style={{ ...S.btnS, background: table === t ? "#1e1b4b" : "transparent", color: table === t ? "#a5b4fc" : "#64748b", borderColor: table === t ? "#4f46e5" : "#1e2a3a", fontSize: 12 }}>{t}</button>
        ))}
      </div>
      {err && <ErrBox msg={err} />}
      {loading && <Spinner />}
      {rows && (
        <div style={{ overflowX: "auto" }}>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>{rows.length} row{rows.length !== 1 ? "s" : ""} from MySQL</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#0a0f1a" }}>
                {cols.map(c => <th key={c} style={{ padding: "8px 12px", textAlign: "left", color: "#4f46e5", fontFamily: "inherit", fontWeight: 700, borderBottom: "1px solid #1e2a3a", whiteSpace: "nowrap" }}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1e2a3a", background: i % 2 === 0 ? "#08090d" : "transparent" }}>
                  {cols.map(c => <td key={c} style={{ padding: "8px 12px", color: "#94a3b8", fontFamily: "inherit", whiteSpace: "nowrap" }}>{String(row[c] ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ROOT APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [auth, setAuth]   = useState(null);   // { token, user }
  const [page, setPage]   = useState("login");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleAuth = (data) => {
    setAuth(data);
    // Route by role
    if (data.user.role === "applicant") setPage("applicant");
    else if (data.user.role === "employer") setPage("employer");
    else if (data.user.role === "dba") setPage("dba");
  };

  const logout = () => { setAuth(null); setPage("login"); };

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      {toast && <Toast t={toast} />}
      {page === "login"     && <LoginPage    setAuth={handleAuth} setPage={setPage} showToast={showToast} />}
      {page === "register"  && <RegisterPage setPage={setPage}    showToast={showToast} />}
      {page === "applicant" && auth && <ApplicantDashboard auth={auth} logout={logout} showToast={showToast} />}
      {page === "employer"  && auth && <EmployerDashboard  auth={auth} logout={logout} showToast={showToast} />}
      {page === "dba"       && auth && <DBAPanel           auth={auth} logout={logout} showToast={showToast} />}
    </div>
  );
}
