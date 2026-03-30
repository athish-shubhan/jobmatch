import { useState } from "react";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ApplicantDashboard } from "./pages/Applicant/ApplicantDashboard";
import { EmployerDashboard } from "./pages/Employer/EmployerDashboard";
import { DBAPanel } from "./pages/DBA/DBAPanel";
import { Toast } from "./components/Common";
import { S } from "./styles";

/**
 * JobMatch — Main Entry Point
 * Refactored for modularity, security, and maintainability.
 * 
 * 🏗 Architecture:
 * - src/api.js: Centralized API logic.
 * - src/styles.js: Shared UI theme and styles.
 * - src/components/: Atomic UI elements.
 * - src/pages/: Role-specific dashboards and auth.
 */

export default function App() {
  const [auth, setAuth]   = useState(null);
  const [page, setPage]   = useState("login");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleAuth = (data) => {
    setAuth(data);
    if      (data.user.role==="applicant") setPage("applicant");
    else if (data.user.role==="employer")  setPage("employer");
    else if (data.user.role==="dba")       setPage("dba");
  };

  const logout = () => { setAuth(null); setPage("login"); };

  return (
    <div style={S.page}>
      {/* Import modern typeface */}
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      
      {toast && <Toast t={toast} />}

      {page==="login"     && <LoginPage    setAuth={handleAuth} setPage={setPage} showToast={showToast} />}
      {page==="register"  && <RegisterPage setPage={setPage}    showToast={showToast} />}
      
      {/* Role-based Dashboards */}
      {page==="applicant" && auth && <ApplicantDashboard auth={auth} logout={logout} showToast={showToast} />}
      {page==="employer"  && auth && <EmployerDashboard  auth={auth} logout={logout} showToast={showToast} />}
      {page==="dba"       && auth && <DBAPanel           auth={auth} logout={logout} showToast={showToast} />}
    </div>
  );
}
