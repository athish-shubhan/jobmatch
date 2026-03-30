import { useState } from "react";
import { S } from "../../styles";
import { Spinner, ErrBox } from "../../components/Common";

export function TableViewer({ call, authUser }) {
  const [table, setTable]         = useState("");
  const [rows, setRows]           = useState(null);
  const [loading, setLoad]        = useState(false);
  const [err, setErr]             = useState("");
  const [editId, setEditId]       = useState(null);
  const [editField, setEditField] = useState("");
  const [editVal, setEditVal]     = useState("");
  const [saveMsg, setSaveMsg]     = useState("");
  const canUpdate = authUser?.permissions?.includes("UPDATE");

  const EDITABLE = {
    APPLICATION: { id:"application_id", cols:["status"] },
    APPLICANT:   { id:"applicant_id",   cols:["name","experience_years","resume_url"] },
    JOB:         { id:"job_id",         cols:["title","description","min_experience","is_active"] },
    COMPANY:     { id:"company_id",     cols:["name","location","industry"] },
    EMPLOYER:    { id:"employer_id",    cols:["name","email"] },
    SKILL:       { id:"skill_id",       cols:["skill_name"] },
  };

  const tables = ["APPLICANT","JOB","COMPANY","SKILL","APPLICATION","APPLICANT_SKILL","JOB_SKILL","EMPLOYER"];

  const load = async (t) => {
    setTable(t); setRows(null); setErr(""); setLoad(true); setEditId(null); setSaveMsg("");
    try { setRows(await call(`/dba/tables/${t}`)); } catch(e) { setErr(e.message); }
    setLoad(false);
  };

  const startEdit = (row) => {
    const cfg = EDITABLE[table];
    if (!cfg) return;
    setEditId(row[cfg.id]); setEditField(cfg.cols[0]); setEditVal(String(row[cfg.cols[0]]??"")); setSaveMsg("");
  };

  const saveUpdate = async (id) => {
    try {
      await call(`/dba/update/${table}/${id}`, { method:"PATCH", body:{ field:editField, value:editVal } });
      setSaveMsg(`✓ Updated ${table} id=${id} · ${editField} = "${editVal}"`);
      setEditId(null); load(table);
    } catch(e) { setSaveMsg("✗ "+e.message); }
  };

  const cols       = rows?.length>0 ? Object.keys(rows[0]) : [];
  const isEditable = canUpdate && EDITABLE[table];

  return (
    <div>
      <h1 style={S.h1}>Table Viewer</h1>
      <p style={S.muted}>{canUpdate?"SELECT + UPDATE privileges · click Edit on any row":"SELECT only · no UPDATE privilege"}</p>
      {canUpdate && (
        <div style={{ ...S.cardSm, marginBottom:16, borderColor:"#f59e0b", fontSize:12, color:"#f59e0b" }}>
          ✏ UPDATE privilege active — editable tables: {Object.keys(EDITABLE).join(", ")}
        </div>
      )}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {tables.map(t => (
          <button key={t} onClick={() => load(t)} style={{ ...S.btnS, background:table===t?"#1e1b4b":"transparent", color:table===t?"#a5b4fc":"#64748b", borderColor:table===t?"#4f46e5":"#1e2a3a", fontSize:12 }}>{t}</button>
        ))}
      </div>
      {err && <ErrBox msg={err} />}
      {loading && <Spinner />}
      {saveMsg && <div style={{ marginBottom:12, fontSize:12, color:saveMsg.startsWith("✓")?"#86efac":"#fca5a5" }}>{saveMsg}</div>}
      {isEditable && editId && (
        <div style={{ ...S.cardSm, marginBottom:16, borderColor:"#f59e0b" }}>
          <div style={{ fontSize:12, color:"#f59e0b", marginBottom:10 }}>Editing {table} id={editId}</div>
          <div style={{ display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap" }}>
            <div>
              <label style={S.label}>Field</label>
              <select style={{ ...S.select, width:180 }} value={editField} onChange={e => { setEditField(e.target.value); setEditVal(""); }}>
                {EDITABLE[table].cols.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex:1, minWidth:160 }}>
              <label style={S.label}>New Value</label>
              {editField==="status" ? (
                <select style={S.select} value={editVal} onChange={e => setEditVal(e.target.value)}>
                  {["Pending","Under Review","Shortlisted","Rejected"].map(s => <option key={s}>{s}</option>)}
                </select>
              ) : editField==="is_active" ? (
                <select style={S.select} value={editVal} onChange={e => setEditVal(e.target.value)}>
                  <option value="1">1 (active)</option>
                  <option value="0">0 (inactive)</option>
                </select>
              ) : (
                <input style={S.input} value={editVal} onChange={e => setEditVal(e.target.value)} />
              )}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={S.btnP} onClick={() => saveUpdate(editId)}>Save</button>
              <button style={S.btnS} onClick={() => setEditId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {rows && (
        <div style={{ overflowX:"auto" }}>
          <div style={{ fontSize:11, color:"#475569", marginBottom:8 }}>{rows.length} row{rows.length!==1?"s":""} from MySQL</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:"#0a0f1a" }}>
                {cols.map(c => <th key={c} style={{ padding:"8px 12px", textAlign:"left", color:"#4f46e5", fontFamily:"inherit", fontWeight:700, borderBottom:"1px solid #1e2a3a", whiteSpace:"nowrap" }}>{c}</th>)}
                {isEditable && <th style={{ padding:"8px 12px", color:"#f59e0b", fontFamily:"inherit", fontWeight:700, borderBottom:"1px solid #1e2a3a" }}>EDIT</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row,i) => {
                const cfg   = EDITABLE[table];
                const rowId = cfg ? row[cfg.id] : null;
                return (
                  <tr key={i} style={{ borderBottom:"1px solid #1e2a3a", background:i%2===0?"#08090d":"transparent" }}>
                    {cols.map(c => <td key={c} style={{ padding:"8px 12px", color:"#94a3b8", fontFamily:"inherit", whiteSpace:"nowrap" }}>{String(row[c]??"")}</td>)}
                    {isEditable && (
                      <td style={{ padding:"8px 12px" }}>
                        <button onClick={() => startEdit(row)} style={{ background:editId===rowId?"#1e1b4b":"#78350f", color:editId===rowId?"#a5b4fc":"#fcd34d", border:`1px solid ${editId===rowId?"#4f46e5":"#92400e"}`, borderRadius:4, padding:"3px 10px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                          {editId===rowId?"Editing...":"Edit"}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
