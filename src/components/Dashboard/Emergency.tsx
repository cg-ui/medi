import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  History, 
  Siren, 
  FileWarning, 
  Sparkles 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { blockchainService } from "../../services/blockchainService";
import { EmergencyAccessLog } from "../../types";
import { toast } from "sonner";

export const Emergency: React.FC = () => {
  const { walletAddress, user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [expiresAt, setExpiresAt] = useState(0);
  const [timeLeftStr, setTimeLeftStr] = useState("");
  const [reason, setReason] = useState("");
  const [logs, setLogs] = useState<EmergencyAccessLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    const status = await blockchainService.isEmergencyUnlocked();
    setIsActive(status.active);
    setExpiresAt(status.expiresAt);
    setLogs(blockchainService.getEmergencyLogs());
  };

  const updateCountdown = () => {
    if (!expiresAt || Date.now() >= expiresAt) {
      setTimeLeftStr("00:00:00");
      return;
    }
    const diff = Math.max(0, expiresAt - Date.now());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    setTimeLeftStr(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
  };

  const handleActivate = async () => {
    if (!reason.trim()) {
      toast.error("Please provide an authorized clinical emergency rationale");
      return;
    }

    setIsProcessing(true);
    try {
      const log = await blockchainService.activateEmergencyUnlock({
        patientAddress: walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a",
        responderAddress: walletAddress || "0x93B27e6B26A0695B40974A3D73A6625B81028A1c",
        responderName: user?.name || "Attending Emergency Responder",
        reason
      });

      toast.error(`BREAK-GLASS PROTOCOL ENGAGED! 24-Hour window active. Tx: ${log.txHash.slice(0, 10)}...`);
      setReason("");
      checkStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger emergency protocol");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevoke = async () => {
    setIsProcessing(true);
    try {
      await blockchainService.revokeEmergencyUnlock(walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a");
      toast.success("Break-glass emergency clearance terminated. Cryptographic locks restored.");
      checkStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke emergency access");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Alert Banner if engaged */}
      {isActive && (
        <div className="bg-gradient-to-r from-rose-950/80 via-red-900/60 to-rose-950/80 border-2 border-rose-600 rounded-2xl p-6 shadow-2xl shadow-rose-950/50 animate-pulse">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white shrink-0">
                <Siren className="w-7 h-7 animate-bounce" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  BREAK-GLASS EMERGENCY OVERRIDE ACTIVE
                </h3>
                <p className="text-xs text-rose-200 mt-0.5">
                  Full patient biometric and clinical telemetry unlocked for first responders and ER trauma teams.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-slate-950/80 px-4 py-2 rounded-xl border border-rose-500/50 text-right">
                <span className="text-[10px] uppercase font-bold text-rose-300 block">Time to Auto-Lock</span>
                <span className="font-mono text-xl font-black text-white tracking-widest">{timeLeftStr}</span>
              </div>
              <button
                onClick={handleRevoke}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-rose-950 font-bold text-xs shadow-lg transition-all"
              >
                Abort & Re-lock Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Break-Glass Trigger Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Break-Glass Emergency Protocol</h2>
                <p className="text-xs text-slate-400">
                  Time-bounded cryptographic bypass for acute trauma or unconscious patient care.
                </p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isActive 
                ? "bg-rose-950 text-rose-400 border-rose-800" 
                : "bg-emerald-950 text-emerald-400 border-emerald-800"
            }`}>
              {isActive ? "UNLOCKED (24h)" : "SECURED & SEALED"}
            </span>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 text-xs text-slate-300 space-y-2 mb-6">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <FileWarning className="w-4 h-4 text-amber-400" />
              Protocol Specifications & Audit Requirements
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Activating the break-glass mechanism triggers a smart contract transaction on Ethereum. 
              The invoking provider's wallet address, timestamp, and clinical rationale are permanently logged on-chain. 
              Access automatically lapses precisely 24 hours after activation.
            </p>
          </div>

          {!isActive ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Authorized Clinical Reason / Trauma Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. Code STEMI / Acute cardiac arrest triage in trauma bay 4"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 placeholder-slate-600"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={handleActivate}
                  disabled={isProcessing}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center space-x-2 transition-all disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Execute 24-Hour Emergency Unlock</span>
                </button>
                <span className="text-[11px] text-slate-500 font-mono">Requires gas & on-chain signature</span>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-rose-950/20 border border-rose-800/40 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-rose-300">Emergency Protocol is currently running.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Locks will re-engage at expiry: {new Date(expiresAt).toLocaleTimeString()}</p>
              </div>
              <button
                onClick={handleRevoke}
                disabled={isProcessing}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl"
              >
                Terminate Emergency Status
              </button>
            </div>
          )}
        </div>

        {/* Right Info Box */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              HIPAA & GDPR Compliance
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              MediChain's Break-Glass protocol complies with emergency medical exception frameworks under 45 CFR § 164.512.
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">Automatic patient notification triggered upon activation</span>
              </div>
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">Non-repudiable EVM transaction receipt with block timestamp</span>
              </div>
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">Zero central backdoor — keys derived deterministically</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            Smart Contract: <span className="font-mono text-cyan-400">MediChainRecords.sol</span>
          </div>
        </div>
      </div>

      {/* Emergency Audit Trail Log */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            Immutable Emergency Access Audit Trail
          </h3>
          <span className="text-xs text-slate-400 font-mono">Audited on EVM</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No emergency break-glass events recorded for this patient.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {logs.map((log) => (
              <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{log.responderName}</span>
                    <span className="font-mono text-slate-400 text-[11px]">({log.responderAddress})</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      log.active ? "bg-rose-950 text-rose-400" : "bg-slate-800 text-slate-400"
                    }`}>
                      {log.active ? "ACTIVE" : "EXPIRED / TERMINATED"}
                    </span>
                  </div>
                  <p className="text-slate-300 mt-1 italic">Reason: "{log.reason}"</p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">Tx: {log.txHash}</p>
                </div>
                <div className="text-right text-[11px] text-slate-400 shrink-0 font-mono">
                  {new Date(log.activatedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
