import React, { useState } from "react";
import { 
  Activity, 
  ShieldCheck, 
  Key, 
  Lock, 
  Mail, 
  User as UserIcon, 
  Stethoscope, 
  Heart, 
  Wallet,
  ArrowRight,
  KeyRound,
  RefreshCw,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { UserRole } from "../../types";

export const AuthPage: React.FC = () => {
  const { 
    login, 
    signup, 
    loginWithMetaMaskSignature,
    connectWallet, 
    walletAddress, 
    activeMetaMaskAddress,
    isMetaMaskAvailable 
  } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [customWallet, setCustomWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [metaMaskLoading, setMetaMaskLoading] = useState(false);
  const [verifyOnSignup, setVerifyOnSignup] = useState(true);

  const handleUseMetaMask = async () => {
    try {
      let addr = activeMetaMaskAddress;
      if (!addr) {
        addr = await connectWallet();
      }
      if (addr) {
        setCustomWallet(addr);
      }
    } catch {
      // handled
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        const chosenWallet = customWallet.trim() || activeMetaMaskAddress || "";
        await signup({
          email,
          password,
          role,
          name: name || email.split("@")[0],
          walletAddress: chosenWallet
        });

        // If user opted to verify via MetaMask signature post account creation:
        if (verifyOnSignup && (activeMetaMaskAddress || isMetaMaskAvailable)) {
          try {
            await loginWithMetaMaskSignature(chosenWallet || undefined);
          } catch {
            // Account was created; user can still sign later in dashboard
          }
        }
      }
    } catch {
      // toast shown in context
    } finally {
      setLoading(false);
    }
  };

  const handleMetaMaskSignatureLogin = async () => {
    setMetaMaskLoading(true);
    try {
      await loginWithMetaMaskSignature();
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

        {/* Primary Action: MetaMask Signature Login */}
        <div className="bg-gradient-to-r from-cyan-950/70 via-slate-900 to-teal-950/70 border border-cyan-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              MetaMask Signature Authentication
            </span>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700">
              Zero-Password Web3
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
            Sign a cryptographic challenge using your Ethereum private key to instantly verify ownership and access clinical records.
          </p>
          <button
            type="button"
            onClick={handleMetaMaskSignatureLogin}
            disabled={metaMaskLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
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
              </>
            )}
          </button>
        </div>

        {/* 1-Click Demo Quick Access Buttons */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-2">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block text-center">
            Or Choose A Pre-Configured Demo Persona
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
              <p className="text-[10px] text-slate-400 truncate">patient@medichain.io</p>
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
              <p className="text-[10px] text-slate-400 truncate">doctor@medichain.io</p>
            </button>
          </div>
        </div>

        {/* Authentication Card (Email/Password or Account Creation) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
          {/* Switch Tab */}
          <div className="flex p-1 bg-slate-950 rounded-xl mb-5 border border-slate-800">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                isLogin ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Email & Password Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                !isLogin ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Register New Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
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

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">Ethereum Wallet ID</label>
                    <button
                      type="button"
                      onClick={handleUseMetaMask}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline transition-colors"
                    >
                      {activeMetaMaskAddress 
                        ? `Use MetaMask (${activeMetaMaskAddress.slice(0, 6)}...${activeMetaMaskAddress.slice(-4)})`
                        : "Connect & Use MetaMask"}
                    </button>
                  </div>
                  <div className="relative">
                    <Wallet className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder={activeMetaMaskAddress || "0x... (or leave empty to auto-assign)"}
                      value={customWallet}
                      onChange={(e) => setCustomWallet(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <input
                    type="checkbox"
                    id="verifySig"
                    checked={verifyOnSignup}
                    onChange={(e) => setVerifyOnSignup(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900"
                  />
                  <label htmlFor="verifySig" className="text-[11px] text-slate-300 select-none cursor-pointer leading-tight">
                    <strong className="text-cyan-300 font-medium">Verify via MetaMask Signature post-registration:</strong>{" "}
                    Prompts EIP-191 cryptographic proof immediately to confirm ownership and seal your profile credentials.
                  </label>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? "Authenticate Credentials" : "Create Account & Web3 ID"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Disclaimers */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>EIP-191 Personal Sign • EVM Smart Contracts • IPFS Off-chain</span>
        </div>
      </div>
    </div>
  );
};
