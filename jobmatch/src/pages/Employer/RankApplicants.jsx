import { useState, useCallback } from "react";
import { S, scColor } from "../../styles";
import { Spinner, ErrBox } from "../../components/Common";

export function RankApplicants({ call, showToast }) {
  const [jobs, setJobs]     = useState(null);
  const [jobId, setJobId]   = useState("");
  const [ranked, setRanked] = useState(null);
  const [err, setErr]       = useState("");

  const loadJobs = useCallback(async () => {
    try { setJobs(await call("/employer/jobs")); } catch(e) { setErr(e.message); }
  }, [call]);

  if (!jobs && !err) { loadJobs(); return <Spinner />; }

  const loadRanked = async (jid) => {
    setJobId(jid); setRanked(null);
    if (!jid) return;
    try { setRanked(await call(`/jobs/${jid}/ranked-applicants`)); } catch(e) { setErr(e.message); }
  };

  const updateStatus = async (appId, status) => {
    try {
      await call(`/applications/${appId}/status`, { method:"PATCH", body:{ status } });
      showToast("Status updated → APPLICATION table");
      loadRanked(jobId);
    } catch(e) { showToast(e.message,"error"); }
  };

  return (
    <div>
      <h1 style={S.h1}>Rank & Shortlist</h1>
      <p style={S.muted}>Calls stored procedure RankApplicantsForJob() · RANK() window function</p>
      {err && <ErrBox msg={err} />}
      <div style={{ ...S.card, marginBottom:20, maxWidth:440 }}>
        <label style={S.label}>Select Job</label>
        <select style={S.select} value={jobId} onChange={e => loadRanked(e.target.value)}>
          <option value="">— Choose a job —</option>
          {jobs?.map(j => <option key={j.job_id} value={j.job_id}>{j.title} ({j.application_count} applicants)</option>)}
        </select>
      </div>
      {jobId && !ranked && <Spinner />}
      {ranked?.length===0 && <div style={{ ...S.card, color:"#475569", textAlign:"center", padding:40 }}>No applications yet.</div>}
      <div style={{ display:"grid", gap:12 }}>
        {ranked?.map((r,i) => (
          <div key={r.application_id} style={{ ...S.card, display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ width:40, height:40, borderRadius:"50%", background:i===0?"#f59e0b22":"#1e2a3a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:i===0?"#f59e0b":"#475569", flexShrink:0 }}>
              {i===0?"🥇":`#${i+1}`}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:600, color:"#e2e8f0" }}>{r.name}</div>
              <div style={{ fontSize:12, color:"#64748b" }}>{r.email} · {r.experience_years}y exp · Rank #{r.applicant_rank}</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:22, fontWeight:800, color:scColor(r.match_score) }}>{Math.round(r.match_score*100)}%</div>
              <div style={{ fontSize:11, color:"#334155" }}>match</div>
            </div>
            <select style={{ ...S.select, width:150, padding:"6px 10px", fontSize:12 }} value={r.status} onChange={e => updateStatus(r.application_id,e.target.value)}>
              {["Pending","Under Review","Shortlisted","Rejected"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
