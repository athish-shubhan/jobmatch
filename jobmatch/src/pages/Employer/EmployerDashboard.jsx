import { useState } from "react";
import { Sidebar } from "../../components/Common";
import { RankApplicants } from "./RankApplicants";
import { PostJob } from "./PostJob";
import { MyJobs } from "./MyJobs";
import { S } from "../../styles";
import { api } from "../../api";

export function EmployerDashboard({ auth: authData, logout, showToast }) {
  const [view, setView] = useState("rank");
  const tok  = authData.token;
  const call = (path, opts) => api(path, { ...opts, token:tok });
  const nav  = [
    { id:"rank", icon:"🏆", label:"Rank Applicants" },
    { id:"post", icon:"📝", label:"Post a Job" },
    { id:"jobs", icon:"💼", label:"My Jobs" },
  ];
  return (
    <div style={S.page}>
      <Sidebar items={nav} active={view} onNav={setView} user={authData.user} onLogout={logout} accent="#f59e0b" />
      <div style={S.main}>
        {view==="rank" && <RankApplicants call={call} showToast={showToast} />}
        {view==="post" && <PostJob        call={call} showToast={showToast} />}
        {view==="jobs" && <MyJobs         call={call} />}
      </div>
    </div>
  );
}
