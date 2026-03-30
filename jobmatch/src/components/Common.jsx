import { S } from "../styles";

export const Spinner = () => (
  <div style={{ padding: 60, textAlign: "center", color: "#334155" }}>
    <div style={{ fontSize: 22 }}>⏳</div>
    <div style={{ marginTop: 8, fontSize: 13 }}>Loading from MySQL...</div>
  </div>
);

export const ErrBox = ({ msg }) => (
  <div style={{ background: "#7f1d1d22", border: "1px solid #991b1b", borderRadius: 8, padding: "12px 16px", color: "#fca5a5", fontSize: 13, marginBottom: 16 }}>
    ⚠ {msg}
  </div>
);

export function Toast({ t }) {
  const bg = t.type==="error"?"#7f1d1d":t.type==="warn"?"#78350f":"#14532d";
  const bd = t.type==="error"?"#991b1b":t.type==="warn"?"#92400e":"#166534";
  return <div style={{ position:"fixed", top:20, right:20, zIndex:9999, background:bg, border:`1px solid ${bd}`, borderRadius:8, padding:"12px 20px", fontSize:13, color:"#fff", maxWidth:340, boxShadow:"0 8px 24px #0008" }}>{t.msg}</div>;
}

export function Sidebar({ items, active, onNav, user, onLogout, accent="#4f46e5" }) {
  return (
    <div style={S.sidebar}>
      <div style={{ padding:"20px 16px 12px", borderBottom:"1px solid #1e2a3a" }}>
        <div style={{ fontSize:14, fontWeight:700, color:accent, letterSpacing:"0.06em" }}>JOBMATCH</div>
        <div style={{ fontSize:11, color:"#334155", marginTop:2 }}>CSF212 Project</div>
      </div>
      <div style={{ padding:"10px 8px", flex:1, overflowY:"auto" }}>
        {items.map(item => (
          <div key={item.id} style={S.navItem(active===item.id)} onClick={() => onNav(item.id)}>
            <span style={{ fontSize:15 }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div style={{ padding:12, borderTop:"1px solid #1e2a3a" }}>
        <div style={{ fontSize:11, color:"#334155", marginBottom:4 }}>Signed in as</div>
        <div style={{ fontSize:13, color:"#94a3b8", fontWeight:600, marginBottom:10 }}>{user?.name}</div>
        <button style={{ ...S.btnS, width:"100%", textAlign:"center" }} onClick={onLogout}>Sign Out</button>
      </div>
    </div>
  );
}
