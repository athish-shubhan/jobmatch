import { useState, useCallback } from "react";
import { S } from "../../styles";
import { Spinner, ErrBox } from "../../components/Common";

export function AIAdvisor({ call }) {
  const [jobs, setJobs]         = useState(null);
  const [jobId, setJobId]       = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoad]      = useState(false);
  const [err, setErr]           = useState("");

  const loadJobs = useCallback(async () => {
    try { setJobs(await call("/jobs")); } catch(e) { setErr(e.message); }
  }, [call]);

  if (!jobs && !err) { loadJobs(); return <Spinner />; }

  const runAI = async () => {
    setLoad(true); setResponse("");
    try {
      // POST to our NEW backend proxy endpoint
      const data = await call("/ai/advice", { method: "POST", body: { job_id: parseInt(jobId) } });
      setResponse(data.advice || "No response from Gemini.");
    } catch(e) { 
      setResponse("Error: " + e.message); 
    }
    setLoad(false);
  };

  return (
    <div>
      <h1 style={S.h1}>AI Career Advisor</h1>
      <p style={S.muted}>Profile fetched from MySQL via Express → sent to Gemini 2.5 Flash (Secure Proxy)</p>
      {err && <ErrBox msg={err} />}
      <div style={{ ...S.card, marginBottom:16, borderColor:"#4f46e544" }}>
        <div style={{ fontSize:12, color:"#475569", lineHeight:1.7 }}>
          Now uses a <strong style={{ color:"#86efac" }}>Secure Backend Proxy</strong>. Your API key stays safe on the server.
        </div>
      </div>
      <div style={{ ...S.card, maxWidth:560 }}>
        <div style={{ marginBottom:16 }}>
          <label style={S.label}>Select Job to Analyze</label>
          <select style={S.select} value={jobId} onChange={e => setJobId(e.target.value)}>
            <option value="">— Choose a job —</option>
            {jobs?.map(j => <option key={j.job_id} value={j.job_id}>{j.title} @ {j.company_name}</option>)}
          </select>
        </div>
        <button style={{ ...S.btnP, opacity:loading||!jobId?0.6:1 }} onClick={runAI} disabled={loading||!jobId}>
          {loading?"⏳ Calling AI Advisor Proxy...":"🤖 Get AI Advice"}
        </button>
        {response && (
          <div style={{ marginTop:20, background:"#0a0f1a", border:"1px solid #1e2a3a", borderRadius:8, padding:16 }}>
            <div style={{ fontSize:11, color:"#22c55e", marginBottom:10, letterSpacing:"0.1em" }}>GEMINI 2.5 FLASH — RESPONSE</div>
            <div style={{ fontSize:13, color:"#94a3b8", lineHeight:1.8, whiteSpace:"pre-wrap" }}>{response}</div>
          </div>
        )}
      </div>
    </div>
  );
}
