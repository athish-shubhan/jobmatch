import { useState } from "react";
import { api } from "../api";
import { S } from "../styles";
import { ErrBox } from "../components/Common";

export function LoginPage({ setAuth, setPage }) {
  const [tab, setTab]       = useState("applicant");
  const [email, setEmail]   = useState("");
  const [pass, setPass]     = useState("");
  const [dbUser, setDbUser] = useState("");
  const [err, setErr]       = useState("");
  const [loading, setLoad]  = useState(false);

  const login = async () => {
    setErr(""); setLoad(true);
    try {
      let path, body;
      if      (tab==="applicant") { path="/auth/login/applicant"; body={ email, password:pass }; }
      else if (tab==="employer")  { path="/auth/login/employer";  body={ email, password:pass }; }
      else                        { path="/auth/login/dba";       body={ username:dbUser, password:pass }; }
      setAuth(await api(path, { method:"POST", body }));
    } catch(e) { setErr(e.message); }
    setLoad(false);
  };

  const tabs = [{ id:"applicant", label:"Applicant" },{ id:"employer", label:"Employer" },{ id:"dba", label:"DBA" }];
  return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <div style={{ width:400 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:26, fontWeight:800, color:"#f1f5f9" }}>Job<span style={{ color:"#4f46e5" }}>Match</span></div>
          <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>Sign in to continue</div>
        </div>
        <div style={S.card}>
          <div style={{ display:"flex", gap:4, background:"#08090d", borderRadius:6, padding:4, marginBottom:22 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:"8px 0", background:tab===t.id?"#4f46e5":"transparent", color:tab===t.id?"#fff":"#64748b", border:"none", borderRadius:4, cursor:"pointer", fontSize:13, fontFamily:"inherit", fontWeight:tab===t.id?600:400 }}>{t.label}</button>
            ))}
          </div>
          {err && <ErrBox msg={err} />}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {tab==="dba"
              ? <div><label style={S.label}>DB Username</label><input style={S.input} value={dbUser} onChange={e => setDbUser(e.target.value)} placeholder="db_admin / db_viewer / db_editor" /></div>
              : <div><label style={S.label}>Email</label><input style={S.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={tab==="applicant"?"alice@email.com":"hr@techcorp.com"} /></div>
            }
            <div>
              <label style={S.label}>Password</label>
              <input style={S.input} type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key==="Enter"&&login()} />
            </div>
            <button style={{ ...S.btnP, width:"100%", padding:"12px", opacity:loading?0.6:1 }} onClick={login} disabled={loading}>
              {loading?"Connecting to server...":"Sign In →"}
            </button>
          </div>
          {tab==="applicant" && (
            <div style={{ marginTop:16, textAlign:"center", fontSize:13, color:"#64748b" }}>
              No account? <span style={{ color:"#818cf8", cursor:"pointer" }} onClick={() => setPage("register")}>Register here</span>
            </div>
          )}
        </div>
        <div style={{ ...S.cardSm, marginTop:12, fontSize:11, color:"#334155" }}>
          <div style={{ color:"#475569", fontWeight:600, marginBottom:4 }}>DEMO CREDENTIALS</div>
          Applicant: alice@email.com / pass123<br />
          Employer: hr@techcorp.com / hr123<br />
          DBA: db_admin/admin123 · db_viewer/view123 · db_editor/edit123
        </div>
      </div>
    </div>
  );
}
