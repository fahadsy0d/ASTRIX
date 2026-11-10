import { useEffect, useState } from "react";
import Dashboard from "./features/dashboard/Dashboard";
import ReportPage from "./features/report/ReportPage";

export default function App() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const handlePop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  if (route.startsWith("/report")) {
    return <ReportPage />;
  }

  return <Dashboard />;
}
