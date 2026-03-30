import { useState, useCallback } from "react";
import { S } from "../../styles";
import { Spinner, ErrBox } from "../../components/Common";

export function ApplicantProfile({ call, showToast }) {
  const [profile, setProfile] = useState(null);
  const [edit, setEdit]       = useState(false);
  const [form, setForm]       = useState({});
  const [err, setErr]         = useState("");

  const load = useCallback(async () => {
    try { const d = await call("/applicants/me"); setProfile(d); setForm(d); } catch(e) { setErr(e.message); }
  }, [call]);

  if (!profile && !err) { load(); return <Spinner />; }

  const save = async () => {
    try {
      await call("/applicants/me", { method:"PUT", body:form });
      setProfile({ ...profile, ...form }); setEdit(false);
      showToast("Profile updated in MySQL");
    } catch(e) { showToast(e.message, "error"); }
  };

  return (
    <div>
      <h1 style={S.h1}>Profile</h1>
      <p style={S.muted}>GET · PUT /api/applicants/me → APPLICANT table</p>
      {err && <ErrBox msg={err} />}
      <div style={{ ...S.card, maxWidth:500 }}>
        {edit ? (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[["name","Full Name"],["email","Email"],["experience_years","Years of Experience"],["resume_url","Resume URL"]].map(([k,l]) => (
              <div key={k}><label style={S.label}>{l}</label><input style={S.input} value={form[k]||""} onChange={e => setForm(f => ({ ...f, [k]:e.target.value }))} /></div>
            ))}
            <div style={{ display:"flex", gap:8 }}>
              <button style={S.btnP} onClick={save}>Save to DB</button>
              <button style={S.btnS} onClick={() => setEdit(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            {[["Full Name",profile?.name],["Email",profile?.email],["Experience",`${profile?.experience_years} years`],["Resume",profile?.resume_url||"Not provided"]].map(([k,v]) => (
              <div key={k} style={{ marginBottom:16 }}>
                <div style={S.label}>{k}</div>
                <div style={{ fontSize:14, color:"#e2e8f0" }}>{v}</div>
              </div>
            ))}
            <button style={S.btnP} onClick={() => setEdit(true)}>Edit Profile</button>
          </div>
        )}
      </div>
    </div>
  );
}
