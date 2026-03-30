import { useState, useCallback } from "react";
import { Sidebar, Spinner, ErrBox } from "../../components/Common";
import { BrowseJobs } from "./BrowseJobs";
import { MyApplications } from "./MyApplications";
import { ApplicantProfile } from "./ApplicantProfile";
import { SkillsEditor } from "./SkillsEditor";
import { AIAdvisor } from "./AIAdvisor";
import { S } from "../../styles";
import { api } from "../../api";

export function ApplicantDashboard({ auth: authData, logout, showToast }) {
  const [view, setView] = useState("browse");
  const tok  = authData.token;
  const call = (path, opts) => api(path, { ...opts, token:tok });
  const nav  = [
    { id:"browse",       icon:"🔍", label:"Browse Jobs" },
    { id:"applications", icon:"📋", label:"My Applications" },
    { id:"profile",      icon:"👤", label:"Profile" },
    { id:"skills",       icon:"⚡", label:"My Skills" },
    { id:"ai",           icon:"🤖", label:"AI Advisor" },
  ];
  return (
    <div style={S.page}>
      <Sidebar items={nav} active={view} onNav={setView} user={authData.user} onLogout={logout} />
      <div style={S.main}>
        {view==="browse"       && <BrowseJobs       call={call} showToast={showToast} />}
        {view==="applications" && <MyApplications   call={call} />}
        {view==="profile"      && <ApplicantProfile call={call} showToast={showToast} />}
        {view==="skills"       && <SkillsEditor     call={call} showToast={showToast} />}
        {view==="ai"           && <AIAdvisor        call={call} />}
      </div>
    </div>
  );
}
