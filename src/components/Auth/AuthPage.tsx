import React, { useState } from "react";
import { 
  Activity, 
  ShieldCheck, 
  User as UserIcon, 
  Stethoscope, 
  Heart, 
  Wallet,
  ArrowRight,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  ArrowLeftRight
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
    isMetaMaskAvailable 
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 text-white shadow-xl shadow-cyan-600/30 mb-2">
            <Activity className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            MediChain <span className="text-xs uppercase px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800">Bio</span>
          </h1>
          <p className="text-xs text-slate-400">
            Decentralized clinical dashboard for real-time biometric telemetry & immutable records
          </p>
        </div>

        {/* Explicit MetaMask Account Selector (No Default Account Pre-Selected) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${activeMetaMaskAddress ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                  Selected MetaMask Account
                </span>
                <span className="text-xs font-mono font-semibold text-white truncate block">
                  {activeMetaMaskAddress
                    ? `${activeMetaMaskAddress.slice(0, 10)}...${activeMetaMaskAddress.slice(-8)}`
                    : isMetaMaskAvailable
                      ? "None selected — choose account"
                      : "MetaMask not detected"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSelectOrSwitchWallet}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-[11px] font-semibold flex items-center space-x-1.5 shrink-0 transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{activeMetaMaskAddress ? "Change Account" : "Choose Account"}</span>
            </button>
          </div>

          {availableMetaMaskAccounts.length > 1 && (
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                Authorized MetaMask Accounts ({availableMetaMaskAccounts.length})
              </span>
              <div className="grid grid-cols-1 gap-1.5 max-h-28 overflow-y-auto">
                {availableMetaMaskAccounts.map((acc) => {
                  const isSelected = activeMetaMaskAddress?.toLowerCase() === acc.toLowerCase();
                  return (
                    <button
                      key={acc}
                      type="button"
                      onClick={() => setSelectedMetaMaskAccount(acc)}
                      className={`px-2.5 py-1.5 rounded-lg border text-left font-mono text-[11px] flex items-center justify-between transition-all ${
                        isSelected
                          ? "bg-cyan-950/70 border-cyan-600 text-cyan-200"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                      }`}
                    >
                      <span className="truncate">{acc}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MetaMask-Only Authentication Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-5">
          {/* Switch Tab */}
          <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                isLogin ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In with MetaMask
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                !isLogin ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          {isLogin ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-cyan-400" />
                    Zero-Email Web3 Sign In
                  </span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700">
                    EIP-191
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Each MetaMask address maps uniquely to one MediChain profile. Sign the challenge with your active wallet to access your account.
                </p>
              </div>

              <button
                type="button"
                onClick={handleMetaMaskLogin}
                disabled={metaMaskLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {metaMaskLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Waiting for MetaMask Signature...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    <span>Sign In with MetaMask Signature</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={handleMetaMaskSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. Eleanor Vance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("patient")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                      role === "patient"
                        ? "bg-cyan-950/80 border-cyan-600 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <Heart className="w-4 h-4 text-cyan-400" />
                    <span>Patient</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("doctor")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                      role === "doctor"
                        ? "bg-purple-950/80 border-purple-600 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <Stethoscope className="w-4 h-4 text-purple-400" />
                    <span>Doctor / MD</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start space-x-2 text-[11px] text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  No email or password required. Your active MetaMask wallet will sign an EIP-191 proof to bind uniquely to this profile.
                </span>
              </div>

              <button
                type="submit"
                disabled={metaMaskLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {metaMaskLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Waiting for MetaMask Signature...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    <span>Sign Up & Verify with MetaMask</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* 1-Click Demo Quick Access Buttons */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-2">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block text-center">
            Or Explore Pre-Configured Demo Personas
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo("patient")}
              disabled={loading || metaMaskLoading}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-700/80 transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <Heart className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] text-cyan-400 font-semibold uppercase">Patient</span>
              </div>
              <p className="text-xs font-bold text-white mt-1">Alex Mercer</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">0x71C6...982a</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo("doctor")}
              disabled={loading || metaMaskLoading}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-700/80 transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <Stethoscope className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] text-purple-400 font-semibold uppercase">Doctor</span>
              </div>
              <p className="text-xs font-bold text-white mt-1">Dr. Sarah Lin</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">0x93B2...8A1c</p>
            </button>
          </div>
        </div>

        {/* Security Disclaimers */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>EIP-191 Personal Sign • 1:1 Wallet Identity • IPFS Off-chain</span>
        </div>
      </div>
    </div>
  );
};
