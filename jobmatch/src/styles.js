export const S = {
  page:    { minHeight: "100vh", background: "#08090d", color: "#e2e8f0", fontFamily: "'IBM Plex Mono','Courier New',monospace" },
  sidebar: { width: 220, background: "#0d1117", borderRight: "1px solid #1e2a3a", display: "flex", flexDirection: "column", height: "100vh", position: "fixed", top: 0, left: 0, zIndex: 100 },
  main:    { marginLeft: 220, padding: "28px 32px", minHeight: "100vh" },
  card:    { background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 10, padding: 24 },
  cardSm:  { background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 8, padding: 16 },
  input:   { background: "#0a0f1a", border: "1px solid #1e2a3a", borderRadius: 6, padding: "10px 14px", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box", outline: "none" },
  select:  { background: "#0a0f1a", border: "1px solid #1e2a3a", borderRadius: 6, padding: "10px 14px", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  label:   { display: "block", marginBottom: 6, fontSize: 11, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" },
  btnP:    { background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, padding: "10px 20px", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 },
  btnS:    { background: "transparent", color: "#94a3b8", border: "1px solid #1e2a3a", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" },
  h1:      { fontSize: 26, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px" },
  h3:      { fontSize: 15, fontWeight: 600, color: "#e2e8f0", margin: "0 0 12px" },
  muted:   { fontSize: 13, color: "#64748b", margin: "0 0 20px" },
  tag:     { background: "#1e2a3a", color: "#7dd3fc", borderRadius: 4, padding: "2px 8px", fontSize: 11, marginRight: 4, marginBottom: 4, display: "inline-block" },
  badge:   (c) => ({ background: c+"22", color: c, border:`1px solid ${c}55`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }),
  navItem: (a) => ({ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", borderRadius: 6, margin: "1px 8px", fontSize: 13, fontWeight: a?600:400, color: a?"#a5b4fc":"#64748b", background: a?"#1e1b4b22":"transparent", borderLeft: a?"2px solid #4f46e5":"2px solid transparent" }),
};

export const scColor = (s) => s >= 0.8 ? "#22c55e" : s >= 0.6 ? "#f59e0b" : "#ef4444";
