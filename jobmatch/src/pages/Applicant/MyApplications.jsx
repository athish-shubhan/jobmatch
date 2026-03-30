import { useState, useCallback } from "react";
import { S, scColor } from "../../styles";
import { Spinner, ErrBox } from "../../components/Common";

export function MyApplications({ call }) {
  const [apps, setApps] = useState(null);
  const [err, setErr]   = useState("");
  const statusColor = { "Pending":"#64748b","Under Review":"#f59e0b","Shortlisted":"#22c55e","Rejected":"#ef4444" };

  const load = useCallback(async () => {
    try { setApps(await call("/applications/me")); } catch(e) { setErr(e.message); }
  }, [call]);

  if (!apps && !err) { load(); return <Spinner />; }

  return (
    <div>
      <h1 style={S.h1}>My Applications</h1>
      <p style={S.muted}>GET /api/applications/me · JOINs APPLICATION, JOB, COMPANY</p>
      {err && <ErrBox msg={err} />}
      {apps?.length===0 && <div style={{ ...S.card, color:"#475569", textAlign:"center", padding:48 }}>No applications yet.</div>}
      <div style={{ display:"grid", gap:12 }}>
        {apps?.map(a => (
          <div key={a.application_id} style={{ ...S.card, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:"#e2e8f0", marginBottom:4 }}>{a.job_title}</div>
              <div style={{ fontSize:13, color:"#64748b" }}>{a.company_name} · Applied {a.applied_date?.slice(0,10)}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:20, fontWeight:800, color:scColor(a.match_score) }}>{Math.round(a.match_score*100)}%</div>
                <div style={{ fontSize:11, color:"#334155" }}>match</div>
              </div>
              <span style={S.badge(statusColor[a.status]||"#64748b")}>{a.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
