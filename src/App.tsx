import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { VitalsProvider } from "./context/VitalsContext";
import { Sidebar, NavTab } from "./components/Navigation/Sidebar";
import { TopBar } from "./components/Navigation/TopBar";
import { PatientProfile } from "./components/Dashboard/PatientProfile";
import { Reports } from "./components/Dashboard/Reports";
import { AccessControl } from "./components/Dashboard/AccessControl";
import { Emergency } from "./components/Dashboard/Emergency";
import { ProviderPanel } from "./components/Dashboard/ProviderPanel";
import { Blockchain } from "./components/Dashboard/Blockchain";
import { AuthPage } from "./components/Auth/AuthPage";
import { Toaster } from "sonner";

const MainDashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>("vitals");

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Initializing MediChain Security Sandbox...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const getTabMetadata = (tab: NavTab) => {
    switch (tab) {
      case "vitals":
        return {
          title: "Live Biometrics",
          subtitle: "Real-time vital signs & telemetry",
        };
      case "records":
        return {
          title: "Medical Records",
          subtitle: "IPFS-pinned & Ethereum-verified reports",
        };
      case "access":
        return {
          title: "Access Control",
          subtitle: "Manage doctor permissions & audit logs",
        };
      case "emergency":
        return {
          title: "Emergency Protocol",
          subtitle: "24-hour break-glass medical override",
        };
      case "provider":
        return {
          title: "Provider Portal",
          subtitle: "Patient lookup, reports & clinical notes",
        };
      case "blockchain":
        return {
          title: "Chain Explorer",
          subtitle: "Sepolia transactions & smart contract",
        };
    }
  };

  const meta = getTabMetadata(activeTab);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar title={meta.title} subtitle={meta.subtitle} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto pb-12">
            {activeTab === "vitals" && <PatientProfile />}
            {activeTab === "records" && <Reports />}
            {activeTab === "access" && <AccessControl />}
            {activeTab === "emergency" && <Emergency />}
            {activeTab === "provider" && <ProviderPanel />}
            {activeTab === "blockchain" && <Blockchain />}
          </div>
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <VitalsProvider>
        <MainDashboard />
        <Toaster position="top-right" theme="dark" richColors />
      </VitalsProvider>
    </AuthProvider>
  );
}

export default App;
