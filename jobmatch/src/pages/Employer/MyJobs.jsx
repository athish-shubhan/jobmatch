import { useState, useCallback } from "react";
import { S } from "../../styles";
import { Spinner } from "../../components/Common";

export function MyJobs({ call }) {
  const [jobs, setJobs] = useState(null);
  const load = useCallback(async () => {
    try { setJobs(await call("/employer/jobs")); } catch {}
  }, [call]);

  if (!jobs) { load(); return <Spinner />; }
  return (
    <div>
      <h1 style={S.h1}>My Jobs</h1>
      <p style={S.muted}>GET /api/employer/jobs · LEFT JOIN APPLICATION · GROUP BY job_id</p>
      <div style={{ display:"grid", gap:12 }}>
        {jobs.map(job => (
          <div key={job.job_id} style={{ ...S.card, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:"#e2e8f0", marginBottom:4 }}>{job.title}</div>
              <div style={{ fontSize:12, color:"#64748b" }}>Posted {job.posted_date?.slice(0,10)} · Min {job.min_experience}y exp</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:26, fontWeight:800, color:"#f1f5f9" }}>{job.application_count}</div>
              <div style={{ fontSize:12, color:"#64748b" }}>applicants</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
