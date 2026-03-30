import { useState } from "react";
import { S } from "../../styles";

export function DBUsersView({ call, authUser, showToast }) {
  const canCreate = authUser.permissions?.includes("CREATE USER");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ username:"", password:"", grants:["SELECT"] });
  const [result, setResult]   = useState("");
  const allPerms = ["SELECT","INSERT","UPDATE","DELETE","CREATE"];

  const createUser = async () => {
    try {
      const data = await call("/dba/users", { method:"POST", body:form });
      setResult("✓ "+data.message); showToast("User created in MySQL"); setShowAdd(false);
    } catch(e) { setResult("✗ "+e.message); }
  };

  const dbUsers = [
    { username:"db_admin",  dbRole:"DBA Admin",     permissions:["SELECT","INSERT","UPDATE","DELETE","CREATE","CREATE USER"] },
    { username:"db_viewer", dbRole:"View Only",     permissions:["SELECT"] },
    { username:"db_editor", dbRole:"View & Update", permissions:["SELECT","UPDATE"] },
  ];

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={S.h1}>Database Users</h1>
          <p style={S.muted}>MySQL GRANT / REVOKE privilege management</p>
        </div>
        {canCreate
          ? <button style={S.btnP} onClick={() => setShowAdd(o => !o)}>+ Create User</button>
          : <span style={{ ...S.badge("#ef4444"), padding:"8px 14px" }}>No CREATE USER privilege</span>
        }
      </div>
      {showAdd && canCreate && (
        <div style={{ ...S.card, marginBottom:20, borderColor:"#4f46e5" }}>
          <h3 style={S.h3}>Create User → POST /api/dba/users → MySQL CREATE USER + GRANT</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div><label style={S.label}>Username</label><input style={S.input} value={form.username} onChange={e => setForm(f => ({ ...f, username:e.target.value }))} placeholder="new_user" /></div>
            <div><label style={S.label}>Password</label><input style={S.input} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password:e.target.value }))} /></div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={S.label}>GRANT Privileges</label>
            <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
              {allPerms.map(p => (
                <label key={p} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#94a3b8", cursor:"pointer" }}>
                  <input type="checkbox" checked={form.grants.includes(p)} onChange={e => setForm(f => ({ ...f, grants:e.target.checked?[...f.grants,p]:f.grants.filter(x => x!==p) }))} />
                  {p}
                </label>
              ))}
            </div>
          </div>
          {result && <div style={{ marginBottom:12, fontSize:12, color:result.startsWith("✓")?"#86efac":"#fca5a5" }}>{result}</div>}
          <div style={{ display:"flex", gap:8 }}>
            <button style={S.btnP} onClick={createUser}>Create in MySQL</button>
            <button style={S.btnS} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display:"grid", gap:12 }}>
        {dbUsers.map(u => (
          <div key={u.username} style={{ ...S.card, borderLeft:`3px solid ${u.dbRole==="DBA Admin"?"#ec4899":u.dbRole==="View Only"?"#64748b":"#f59e0b"}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:"#e2e8f0", marginBottom:8 }}>
                  {u.username}<span style={{ fontSize:12, fontWeight:400, color:"#475569" }}>@localhost</span>
                </div>
                <span style={S.badge(u.dbRole==="DBA Admin"?"#ec4899":u.dbRole==="View Only"?"#64748b":"#f59e0b")}>{u.dbRole}</span>
                {u.username==="db_editor" && <span style={{ ...S.badge("#ef4444"), marginLeft:8 }}>NO CREATE USER</span>}
              </div>
              <div>
                <div style={{ fontSize:11, color:"#475569", marginBottom:6, textAlign:"right" }}>GRANTED PRIVILEGES</div>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap", justifyContent:"flex-end" }}>
                  {["SELECT","INSERT","UPDATE","DELETE","CREATE","CREATE USER"].map(p => (
                    <span key={p} style={{ fontSize:10, padding:"2px 6px", borderRadius:3, fontFamily:"inherit", background:u.permissions.includes(p)?"#14532d":"#1e2a3a", color:u.permissions.includes(p)?"#86efac":"#334155" }}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
