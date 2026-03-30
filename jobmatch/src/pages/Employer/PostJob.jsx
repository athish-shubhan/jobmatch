import { useState, useCallback } from "react";
import { S } from "../../styles";
import { Spinner } from "../../components/Common";

export function PostJob({ call, showToast }) {
  const [allSkills, setAllSkills] = useState(null);
  const [form, setForm]           = useState({ title:"", description:"", min_experience:0 });
  const [selected, setSelected]   = useState([]);
  const upd = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const loadSkills = useCallback(async () => {
    try { setAllSkills(await call("/skills")); } catch {}
  }, [call]);

  if (!allSkills) { loadSkills(); return <Spinner />; }

  const toggle = (skill_id, importance) => {
    const ex = selected.find(s => s.skill_id===skill_id);
    if (ex) {
      if (ex.importance===importance) setSelected(s => s.filter(x => x.skill_id!==skill_id));
      else setSelected(s => s.map(x => x.skill_id===skill_id?{ ...x, importance }:x));
    } else setSelected(s => [...s, { skill_id, importance }]);
  };

  const submit = async () => {
    if (!form.title) { showToast("Title required","error"); return; }
    try {
      await call("/jobs", { method:"POST", body:{ ...form, min_experience:parseInt(form.min_experience)||0, skills:selected } });
      showToast("Job posted → JOB + JOB_SKILL tables");
      setForm({ title:"", description:"", min_experience:0 }); setSelected([]);
    } catch(e) { showToast(e.message,"error"); }
  };

  return (
    <div>
      <h1 style={S.h1}>Post a Job</h1>
      <p style={S.muted}>POST /api/jobs → INSERT INTO JOB + JOB_SKILL (transaction)</p>
      <div style={{ maxWidth:600 }}>
        <div style={{ ...S.card, marginBottom:16 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div><label style={S.label}>Job Title *</label><input style={S.input} value={form.title} onChange={e => upd("title",e.target.value)} placeholder="Senior Backend Developer" /></div>
            <div><label style={S.label}>Description</label><textarea style={{ ...S.input, minHeight:80, resize:"vertical" }} value={form.description} onChange={e => upd("description",e.target.value)} /></div>
            <div><label style={S.label}>Min Experience (years)</label><input style={{ ...S.input, maxWidth:120 }} type="number" min="0" value={form.min_experience} onChange={e => upd("min_experience",e.target.value)} /></div>
          </div>
        </div>
        <div style={S.card}>
          <h3 style={S.h3}>Skills (click = required · pref = preferred)</h3>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
            {allSkills.map(sk => {
              const sel = selected.find(s => s.skill_id===sk.skill_id);
              return (
                <div key={sk.skill_id} style={{ display:"flex" }}>
                  <button onClick={() => toggle(sk.skill_id,"required")} style={{ padding:"4px 8px", fontSize:11, border:"1px solid", borderRadius:"4px 0 0 4px", cursor:"pointer", fontFamily:"inherit", background:sel?.importance==="required"?"#4f46e5":"#0a0f1a", color:sel?.importance==="required"?"#fff":"#64748b", borderColor:sel?.importance==="required"?"#4f46e5":"#1e2a3a" }}>{sk.skill_name}</button>
                  <button onClick={() => toggle(sk.skill_id,"preferred")} style={{ padding:"4px 6px", fontSize:10, border:"1px solid", borderLeft:"none", borderRadius:"0 4px 4px 0", cursor:"pointer", fontFamily:"inherit", background:sel?.importance==="preferred"?"#0ea5e9":"#0a0f1a", color:sel?.importance==="preferred"?"#fff":"#475569", borderColor:sel?.importance==="preferred"?"#0ea5e9":"#1e2a3a" }}>pref</button>
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
