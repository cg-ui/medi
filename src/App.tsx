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
          title: "Real-Time Biometric Telemetry & Clinical Signals",
          subtitle: "Continuous physiological sensor monitoring with real-time anomaly detection",
        };
      case "records":
        return {
          title: "Decentralized Medical Records Ledger",
          subtitle: "Cryptographically verified clinical reports anchored to Ethereum blockchain via IPFS",
        };
      case "access":
        return {
          title: "Access Control & Physician Clearances",
          subtitle: "Granular patient-controlled smart contract authorization policies",
        };
      case "emergency":
        return {
          title: "Emergency Break-Glass Protocol",
          subtitle: "Time-bound 24-hour cryptographic emergency medical unlock and immutable audit log",
        };
      case "provider":
        return {
          title: "Healthcare Provider Clinical Portal",
          subtitle: "Physician directory lookup, authorized biometric evaluation, and signed clinical notes",
        };
      case "blockchain":
        return {
          title: "On-Chain Ledger Explorer & Contract Inspector",
          subtitle: "Real-time block stream, transaction receipts, and MediChain smart contract interface",
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
