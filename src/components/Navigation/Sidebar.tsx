import React from "react";
import { 
  Activity, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  Stethoscope, 
  Blocks, 
  LogOut, 
  UserCheck, 
  Cpu, 
  ExternalLink 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export type NavTab = "vitals" | "records" | "access" | "emergency" | "provider" | "blockchain";

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout, switchDemoRole, isDemo } = useAuth();

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string; doctorOnly?: boolean }[] = [
    { id: "vitals", label: "Live Biometrics", icon: Activity, badge: "Live" },
    { id: "records", label: "Medical Ledger", icon: FileText },
    { id: "access", label: "Access Control", icon: ShieldCheck },
    { id: "emergency", label: "Emergency Protocol", icon: AlertTriangle, badge: "24h" },
    { id: "provider", label: "Provider Portal", icon: Stethoscope, badge: user?.role === "doctor" ? "Doctor" : "Review" },
    { id: "blockchain", label: "Chain Explorer", icon: Blocks },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0 select-none backdrop-blur-md">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-base tracking-tight text-white">MediChain</span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">Bio</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Clinical Web3 Telemetry</p>
          </div>
        </div>
      </div>

      {/* Role Switcher banner for quick inspection */}
      <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/60">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            Active Persona:
          </span>
          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
            user?.role === "doctor" 
              ? "bg-purple-950/80 text-purple-300 border border-purple-800/60" 
              : "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
          }`}>
            {user?.role || "Guest"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={() => switchDemoRole("patient")}
            className={`text-xs py-1 px-2 rounded-lg font-medium transition-all text-center ${
              user?.role === "patient"
                ? "bg-cyan-600 text-white shadow-sm"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            Patient View
          </button>
          <button
            onClick={() => switchDemoRole("doctor")}
            className={`text-xs py-1 px-2 rounded-lg font-medium transition-all text-center ${
              user?.role === "doctor"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            Doctor View
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] uppercase font-semibold text-slate-300 px-3 py-1.5 tracking-wider">
          Core Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-600/20 font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : item.badge === "Live"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Network & System Status */}
      <div className="p-3 border-t border-slate-800 text-xs space-y-2">
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              Network
            </span>
            <span className="font-mono text-emerald-400 font-semibold">Sepolia (EVM)</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" />
              Database
            </span>
            <span className="text-slate-300 font-medium">
              {isDemo ? "In-Memory Sandbox" : "MongoDB Atlas"}
            </span>
          </div>
        </div>

        {/* User Identity & Logout */}
        <div className="pt-1 flex items-center justify-between px-1">
          <div className="truncate pr-2">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || user?.email}</p>
            <p className="text-[10px] font-mono text-cyan-400 truncate">
              {user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : "No wallet linked"}
            </p>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
