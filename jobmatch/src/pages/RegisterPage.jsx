import { useState } from "react";
import { api } from "../api";
import { S } from "../styles";
import { ErrBox } from "../components/Common";

export function RegisterPage({ setPage, showToast }) {
  const [form, setForm]    = useState({ name:"", email:"", password:"", experience_years:"", resume_url:"" });
  const [err, setErr]      = useState("");
  const [loading, setLoad] = useState(false);
  const upd = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const submit = async () => {
    setErr(""); setLoad(true);
    try {
      await api("/auth/register", { method:"POST", body:form });
      showToast("Account created! Please sign in.");
      setPage("login");
    } catch(e) { setErr(e.message); }
    setLoad(false);
  };

  return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <div style={{ width:420 }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:22, fontWeight:800, color:"#f1f5f9" }}>Job<span style={{ color:"#4f46e5" }}>Match</span></div>
          <div style={{ fontSize:13, color:"#475569" }}>Create your applicant account</div>
        </div>
        <div style={S.card}>
          {err && <ErrBox msg={err} />}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[["name","Full Name","Jane Doe","text"],["email","Email","jane@email.com","email"],["password","Password","Min 6 chars","password"],["experience_years","Years of Experience","0","number"],["resume_url","Resume URL (optional)","https://...","text"]].map(([k,label,ph,type]) => (
              <div key={k}>
                <label style={S.label}>{label}</label>
                <input style={S.input} type={type} value={form[k]} onChange={e => upd(k,e.target.value)} placeholder={ph} />
              </div>
            ))}
            <button style={{ ...S.btnP, width:"100%", padding:"12px", opacity:loading?0.6:1 }} onClick={submit} disabled={loading}>
              {loading?"Sending to server...":"Create Account →"}
            </button>
          </div>
          <div style={{ marginTop:16, textAlign:"center", fontSize:13, color:"#64748b" }}>
            Have an account? <span style={{ color:"#818cf8", cursor:"pointer" }} onClick={() => setPage("login")}>Sign In</span>
          </div>
        </div>
      </div>
    </div>
  );
}
