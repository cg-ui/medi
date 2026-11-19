import React, { useState } from "react";
import {
  Activity,
  User as UserIcon,
  Stethoscope,
  Heart,
  Wallet,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  ArrowLeftRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { UserRole } from "../../types";

export const AuthPage: React.FC = () => {
  const {
    login,
    loginWithMetaMaskSignature,
    signupWithMetaMaskSignature,
    switchMetaMaskAccount,
    activeMetaMaskAddress,
    availableMetaMaskAccounts,
    setSelectedMetaMaskAccount,
    isMetaMaskAvailable,
  } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>("patient");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [metaMaskLoading, setMetaMaskLoading] = useState(false);

  const handleSelectOrSwitchWallet = async () => {
    try {
      await switchMetaMaskAccount();
    } catch {
      // handled in context
    }
  };

  const handleMetaMaskLogin = async () => {
    setMetaMaskLoading(true);
    try {
      await loginWithMetaMaskSignature(activeMetaMaskAddress || undefined);
    } catch {
      // toast shown in context
    } finally {
      setMetaMaskLoading(false);
    }
  };

  const handleMetaMaskSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMetaMaskLoading(true);
    try {
      await signupWithMetaMaskSignature({
        name: name.trim(),
        role,
        customAddress: activeMetaMaskAddress || undefined,
      });
    } catch {
      // toast shown in context
    } finally {
      setMetaMaskLoading(false);
    }
  };

  const handleQuickDemo = async (demoRole: UserRole) => {
    setLoading(true);
    try {
      if (demoRole === "patient") {
        await login("patient@medichain.io", "password123");
      } else {
        await login("doctor@medichain.io", "password123");
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-cyan-600 text-white mb-1">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white">MediChain Bio</h1>
          <p className="text-xs text-slate-400">
            Sign in or register using your MetaMask wallet
          </p>
        </div>

        {/* MetaMask Account Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 block">
                MetaMask Account
              </span>
              <span className="text-xs font-mono text-white truncate block">
                {activeMetaMaskAddress
                  ? `${activeMetaMaskAddress.slice(0, 10)}...${activeMetaMaskAddress.slice(-8)}`
                  : isMetaMaskAvailable
                  ? "None selected"
                  : "MetaMask not detected"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSelectOrSwitchWallet}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-medium flex items-center space-x-1.5 shrink-0 transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{activeMetaMaskAddress ? "Switch" : "Select"}</span>
            </button>
          </div>

          {availableMetaMaskAccounts.length > 1 && (
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <span className="text-[11px] text-slate-400 block">
                Available Accounts ({availableMetaMaskAccounts.length})
              </span>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {availableMetaMaskAccounts.map((acc) => {
                  const isSelected = activeMetaMaskAddress?.toLowerCase() === acc.toLowerCase();
                  return (
                    <button
                      key={acc}
                      type="button"
                      onClick={() => setSelectedMetaMaskAccount(acc)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-left font-mono text-[11px] flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-cyan-950/60 border-cyan-600 text-cyan-200"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <span className="truncate">{acc}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                isLogin ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                !isLogin ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          {isLogin ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Sign a quick verification challenge with your selected MetaMask wallet to log in.
              </p>

              <button
                type="button"
                onClick={handleMetaMaskLogin}
                disabled={metaMaskLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
              >
                {metaMaskLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Waiting for MetaMask...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    <span>Sign In with MetaMask</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={handleMetaMaskSignup} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. Eleanor Vance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("patient")}
                    className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors ${
                      role === "patient"
                        ? "bg-cyan-950/70 border-cyan-600 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Patient</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("doctor")}
                    className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors ${
                      role === "doctor"
                        ? "bg-purple-950/70 border-purple-600 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-purple-400" />
                    <span>Doctor</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={metaMaskLoading}
                className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {metaMaskLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Waiting for MetaMask...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    <span>Sign Up with MetaMask</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Demo Quick Access */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
          <span className="text-[11px] font-medium text-slate-400 block text-center">
            Demo Accounts
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo("patient")}
              disabled={loading || metaMaskLoading}
              className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors text-left"
            >
              <p className="text-xs font-semibold text-white">Alex Mercer</p>
              <p className="text-[10px] text-cyan-400">Patient • 0x71C6...982a</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo("doctor")}
              disabled={loading || metaMaskLoading}
              className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors text-left"
            >
              <p className="text-xs font-semibold text-white">Dr. Sarah Lin</p>
              <p className="text-[10px] text-purple-400">Doctor • 0x93B2...8A1c</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
