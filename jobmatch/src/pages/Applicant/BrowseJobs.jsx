import { useState, useCallback } from "react";
import { S } from "../../styles";
import { Spinner, ErrBox } from "../../components/Common";

export function BrowseJobs({ call, showToast }) {
  const [jobs, setJobs]       = useState(null);
  const [applied, setApplied] = useState(new Set());
  const [search, setSearch]   = useState("");
  const [err, setErr]         = useState("");

  const load = useCallback(async () => {
    try {
      const [jobsData, appsData] = await Promise.all([call("/jobs"), call("/applications/me")]);
      setJobs(jobsData);
      setApplied(new Set(appsData.map(a => a.job_id)));
    } catch(e) { setErr(e.message); }
  }, [call]);

  if (!jobs && !err) { load(); return <Spinner />; }

  const apply = async (job_id) => {
    try {
      const res = await call("/applications", { method:"POST", body:{ job_id } });
      setApplied(s => new Set([...s, job_id]));
      showToast(`Applied! Match score: ${Math.round(res.match_score*100)}%`);
    } catch(e) { showToast(e.message, "error"); }
  };

  const filtered = (jobs||[]).filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 style={S.h1}>Browse Jobs</h1>
      <p style={S.muted}>Live data from MySQL · GET /api/jobs</p>
      {err && <ErrBox msg={err} />}
      <input style={{ ...S.input, maxWidth:380, marginBottom:20 }} placeholder="🔍  Search jobs or companies..." value={search} onChange={e => setSearch(e.target.value)} />
      <div style={{ display:"grid", gap:14 }}>
        {filtered.map(job => (
          <div key={job.job_id} style={S.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <span style={{ fontSize:16, fontWeight:700, color:"#f1f5f9" }}>{job.title}</span>
                  {applied.has(job.job_id) && <span style={S.badge("#22c55e")}>✓ Applied</span>}
                </div>
                <div style={{ fontSize:13, color:"#64748b", marginBottom:10 }}>{job.company_name} · {job.location} · {job.industry}</div>
                <div>
                  <span style={{ ...S.badge("#64748b"), marginRight:8 }}>≥{job.min_experience}y exp</span>
                  {job.skills?.map(s => <span key={s.skill_id} style={{ ...S.tag, color:s.importance==="required"?"#a5b4fc":"#7dd3fc" }}>{s.skill_name}</span>)}
                </div>
              </div>
              <div style={{ marginLeft:16, textAlign:"right" }}>
                <div style={{ fontSize:11, color:"#334155", marginBottom:10 }}>Posted {job.posted_date?.slice(0,10)}</div>
                {!applied.has(job.job_id) && <button style={S.btnP} onClick={() => apply(job.job_id)}>Apply →</button>}
              </div>
            </div>
            <p style={{ fontSize:13, color:"#64748b", lineHeight:1.7, margin:"14px 0 0" }}>{job.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
