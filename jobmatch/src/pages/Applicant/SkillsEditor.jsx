import { useState, useCallback } from "react";
import { S } from "../../styles";
import { Spinner, ErrBox } from "../../components/Common";

export function SkillsEditor({ call, showToast }) {
  const [mySkills, setMySkills]   = useState(null);
  const [allSkills, setAllSkills] = useState([]);
  const [newSkill, setNewSkill]   = useState("");
  const [newLevel, setNewLevel]   = useState(3);
  const [err, setErr]             = useState("");

  const load = useCallback(async () => {
    try {
      const [ms, all] = await Promise.all([call("/applicants/me/skills"), call("/skills")]);
      setMySkills(ms); setAllSkills(all);
    } catch(e) { setErr(e.message); }
  }, [call]);

  if (!mySkills && !err) { load(); return <Spinner />; }

  const addSkill = async () => {
    const sk = allSkills.find(s => s.skill_name.toLowerCase()===newSkill.toLowerCase());
    if (!sk) { showToast("Skill not found in SKILL table","error"); return; }
    try {
      await call("/applicants/me/skills", { method:"POST", body:{ skill_id:sk.skill_id, proficiency_level:newLevel } });
      showToast("Skill saved to APPLICANT_SKILL"); setNewSkill(""); load();
    } catch(e) { showToast(e.message,"error"); }
  };

  const remove = async (skill_id) => {
    try { await call(`/applicants/me/skills/${skill_id}`, { method:"DELETE" }); load(); }
    catch(e) { showToast(e.message,"error"); }
  };

  const pBar = ["#ef4444","#f97316","#f59e0b","#22c55e","#10b981"];

  return (
    <div>
      <h1 style={S.h1}>My Skills</h1>
      <p style={S.muted}>GET · POST · DELETE /api/applicants/me/skills → APPLICANT_SKILL table</p>
      {err && <ErrBox msg={err} />}
      <div style={{ ...S.card, marginBottom:20 }}>
        <h3 style={S.h3}>Add Skill</h3>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
          <div style={{ flex:1, minWidth:160 }}>
            <label style={S.label}>Skill Name</label>
            <input style={S.input} list="skills-dl" value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="Python, React, Docker..." />
            <datalist id="skills-dl">{allSkills.map(s => <option key={s.skill_id} value={s.skill_name} />)}</datalist>
          </div>
          <div style={{ width:180 }}>
            <label style={S.label}>Proficiency (1–5)</label>
            <select style={S.select} value={newLevel} onChange={e => setNewLevel(parseInt(e.target.value))}>
              {[1,2,3,4,5].map(l => <option key={l} value={l}>{l} – {["Beginner","Basic","Intermediate","Advanced","Expert"][l-1]}</option>)}
            </select>
          </div>
          <button style={S.btnP} onClick={addSkill}>+ Add</button>
        </div>
      </div>
      <div style={{ display:"grid", gap:10 }}>
        {mySkills?.map(ms => (
          <div key={ms.skill_id} style={{ ...S.cardSm, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:"#e2e8f0", marginBottom:6 }}>{ms.skill_name}</div>
              <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                {[1,2,3,4,5].map(l => <div key={l} style={{ width:28, height:6, borderRadius:3, background:l<=ms.proficiency_level?pBar[ms.proficiency_level-1]:"#1e2a3a" }} />)}
                <span style={{ fontSize:11, color:"#64748b", marginLeft:6 }}>{["Beginner","Basic","Intermediate","Advanced","Expert"][ms.proficiency_level-1]}</span>
              </div>
            </div>
            <button onClick={() => remove(ms.skill_id)} style={{ background:"#7f1d1d", color:"#fca5a5", border:"1px solid #991b1b", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
