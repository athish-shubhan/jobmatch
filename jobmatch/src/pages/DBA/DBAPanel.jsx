import { useState } from "react";
import { Sidebar } from "../../components/Common";
import { SchemaView } from "./SchemaView";
import { DBUsersView } from "./DBUsersView";
import { TableViewer } from "./TableViewer";
import { S } from "../../styles";
import { api } from "../../api";

export function DBAPanel({ auth: authData, logout, showToast }) {
  const [view, setView] = useState("schema");
  const tok       = authData.token;
  const call      = (path, opts) => api(path, { ...opts, token:tok });
  const canCreate = authData.user.permissions?.includes("CREATE USER");
  const nav = [
    { id:"schema", icon:"🗄️", label:"Schema" },
    { id:"users",  icon:"👥", label:"DB Users" },
    { id:"tables", icon:"📊", label:"Table Viewer" },
  ];
  return (
    <div style={S.page}>
      <Sidebar items={nav} active={view} onNav={setView} user={{ name:authData.user.name }} onLogout={logout} accent="#ec4899" />
      <div style={S.main}>
        <div style={{ ...S.badge(canCreate?"#22c55e":"#f59e0b"), marginBottom:20, display:"inline-flex", alignItems:"center", gap:6 }}>
          🔐 {authData.user.dbRole} · {authData.user.permissions?.join(", ")}
        </div>
        {view==="schema" && <SchemaView />}
        {view==="users"  && <DBUsersView call={call} authUser={authData.user} showToast={showToast} />}
        {view==="tables" && <TableViewer call={call} authUser={authData.user} />}
      </div>
    </div>
  );
}
