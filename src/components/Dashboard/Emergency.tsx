import React, { useState, useEffect } from "react";
import { AlertTriangle, Unlock, CheckCircle2, History, Siren } from "lucide-react";
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
    setTimeLeftStr(
      `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`
    );
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
        reason,
      });

      toast.error(
        `BREAK-GLASS PROTOCOL ENGAGED! 24-Hour window active. Tx: ${log.txHash.slice(0, 10)}...`
      );
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
      await blockchainService.revokeEmergencyUnlock(
        walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a"
      );
      toast.success("Break-glass emergency clearance terminated. Cryptographic locks restored.");
      checkStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke emergency access");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Active Alert Banner */}
      {isActive && (
        <div className="bg-rose-950/70 border border-rose-600 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-rose-600 flex items-center justify-center text-white shrink-0">
                <Siren className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Emergency Override Active
                </h3>
                <p className="text-xs text-rose-200">
                  Full patient vitals and records temporarily unlocked for 24 hours.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-rose-700 text-right">
                <span className="text-[10px] text-rose-300 block">Auto-Lock</span>
                <span className="font-mono text-base font-bold text-white">{timeLeftStr}</span>
              </div>
              <button
                onClick={handleRevoke}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-rose-950 font-semibold text-xs"
              >
                Re-lock Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Break-Glass Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Break-Glass Emergency Protocol</h2>
                <p className="text-xs text-slate-400">
                  Time-bounded 24-hour emergency bypass logged on Ethereum.
                </p>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                isActive
                  ? "bg-rose-950 text-rose-300 border-rose-800"
                  : "bg-slate-950 text-emerald-400 border-slate-800"
              }`}
            >
              {isActive ? "Unlocked (24h)" : "Secured"}
            </span>
          </div>

          {!isActive ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Clinical Reason / Trauma Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. Code STEMI / Acute cardiac arrest triage"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500 placeholder-slate-600"
                />
              </div>

              <button
                onClick={handleActivate}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center space-x-2 transition-colors disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" />
                <span>Execute 24-Hour Emergency Unlock</span>
              </button>
            </div>
          ) : (
            <div className="p-4 bg-slate-950 border border-rose-800/50 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-rose-300">Emergency unlock is active.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Auto-expires at {new Date(expiresAt).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={handleRevoke}
                disabled={isProcessing}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-lg"
              >
                Terminate Now
              </button>
            </div>
          )}
        </div>

        {/* Compliance Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Audit Guarantees</h3>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Notifies patient immediately on activation</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Logs responder wallet and timestamp on-chain</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Automatically re-locks after 24 hours</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Contract: <span className="font-mono text-cyan-400">MediChainRecords.sol</span>
          </div>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-white flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            Emergency Access Log
          </h3>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No emergency events recorded.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white">{log.responderName}</span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      ({log.responderAddress})
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        log.active ? "bg-rose-950 text-rose-300" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {log.active ? "Active" : "Ended"}
                    </span>
                  </div>
                  <p className="text-slate-300 mt-1">Reason: &ldquo;{log.reason}&rdquo;</p>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">Tx: {log.txHash}</p>
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
