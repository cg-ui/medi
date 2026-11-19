import React from "react";
import {
  Activity,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Stethoscope,
  Blocks,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export type NavTab = "vitals" | "records" | "access" | "emergency" | "provider" | "blockchain";

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout, switchDemoRole, isDemo } = useAuth();

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "vitals", label: "Live Biometrics", icon: Activity },
    { id: "records", label: "Medical Ledger", icon: FileText },
    { id: "access", label: "Access Control", icon: ShieldCheck },
    { id: "emergency", label: "Emergency Protocol", icon: AlertTriangle },
    { id: "provider", label: "Provider Portal", icon: Stethoscope },
    { id: "blockchain", label: "Chain Explorer", icon: Blocks },
  ];

  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="px-4 py-4 border-b border-slate-800 flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-sm tracking-tight text-white block leading-tight">
            MediChain
          </span>
          <span className="text-[11px] text-slate-400 block">Clinical Web3</span>
        </div>
      </div>

      {/* Role Switcher */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Role</span>
          <span className="font-medium text-slate-200 capitalize">{user?.role || "Guest"}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => switchDemoRole("patient")}
            className={`text-xs py-1.5 px-2 rounded-lg font-medium transition-colors ${
              user?.role === "patient"
                ? "bg-cyan-600 text-white"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            Patient
          </button>
          <button
            onClick={() => switchDemoRole("doctor")}
            className={`text-xs py-1.5 px-2 rounded-lg font-medium transition-colors ${
              user?.role === "doctor"
                ? "bg-purple-600 text-white"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            Doctor
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-cyan-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info & Logout */}
      <div className="p-3 border-t border-slate-800 text-xs space-y-2.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>Sepolia</span>
          <span>{isDemo ? "Demo Mode" : "MongoDB"}</span>
        </div>

        <div className="flex items-center justify-between px-1">
          <div className="truncate pr-2">
            <p className="text-xs font-medium text-slate-200 truncate">{user?.name || user?.email}</p>
            <p className="text-[10px] font-mono text-slate-400 truncate">
              {user?.walletAddress
                ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
                : "No wallet"}
            </p>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
