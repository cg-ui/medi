import React, { useState } from "react";
import {
  Wallet,
  CheckCircle2,
  Copy,
  Play,
  Pause,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  Coins,
  Bell,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useVitals, SimulationScenario } from "../../context/VitalsContext";
import { SepoliaFaucetModal } from "../Modals/SepoliaFaucetModal";
import { userService } from "../../services/userService";
import { PatientAccessNotification } from "../../types";
import { toast } from "sonner";

interface TopBarProps {
  title: string;
  subtitle: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle }) => {
  const {
    walletAddress,
    activeMetaMaskAddress,
    isWalletMismatched,
    isSignatureVerified,
    isMetaMaskAvailable,
    connectWallet,
    loginWithMetaMaskSignature,
    verifyActiveMetaMaskAgainstCredentials,
    rebindCurrentMetaMaskAddress,
    syncActiveWalletToProfile,
    dismissMismatchWarning,
    user,
  } = useAuth();

  const { isStreaming, toggleStreaming, scenario, setScenario } = useVitals();
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFaucetModalOpen, setIsFaucetModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<PatientAccessNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const seenNotifIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (user?.role !== "patient") return;
    const addr = walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a";

    const fetchNotifs = async () => {
      try {
        const list = await userService.getPatientNotifications(addr);
        if (Array.isArray(list)) {
          setNotifications(list);
          for (const n of list) {
            if (!n.read && !seenNotifIdsRef.current.has(n.id)) {
              seenNotifIdsRef.current.add(n.id);
              toast.info(
                `${n.doctorName} accessed ${n.reportTitle ? `"${n.reportTitle}"` : "your records"} (Sepolia Tx: ${n.sepoliaTxHash.slice(0, 10)}...)`
              );
            }
          }
        }
      } catch {
        // ignore polling error
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 5000);
    return () => clearInterval(interval);
  }, [user?.role, walletAddress]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    const addr = walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a";
    await userService.markNotificationsRead(addr);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const copyWallet = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast.success("Wallet address copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifySignature = async () => {
    setIsVerifying(true);
    try {
      await loginWithMetaMaskSignature();
    } catch {
      // toast in context
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSyncWallet = async () => {
    setIsSyncing(true);
    try {
      await syncActiveWalletToProfile();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="sticky top-0 z-20 flex flex-col">
      {/* Warning Banner if Active MetaMask does not match logged-in account */}
      {isWalletMismatched && (
        <div className="bg-amber-950/90 border-b border-amber-700/80 px-6 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Wallet Mismatch:</strong> Connected{" "}
              <span className="font-mono font-semibold text-amber-300">
                {activeMetaMaskAddress
                  ? `${activeMetaMaskAddress.slice(0, 6)}...${activeMetaMaskAddress.slice(-4)}`
                  : "None"}
              </span>{" "}
              vs account{" "}
              <span className="font-mono font-semibold text-white">
                {walletAddress
                  ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                  : "None"}
              </span>
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleSyncWallet}
              disabled={isSyncing}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center space-x-1"
            >
              {isSyncing && <RefreshCw className="w-3 h-3 animate-spin mr-1" />}
              <span>Sync Wallet</span>
            </button>
            <button
              onClick={() => rebindCurrentMetaMaskAddress()}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-[11px]"
            >
              Sign &amp; Bind
            </button>
            <button
              onClick={() => verifyActiveMetaMaskAgainstCredentials()}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-800 text-[11px]"
            >
              Recheck
            </button>
            <button
              onClick={dismissMismatchWarning}
              className="p-1 text-amber-300 hover:text-white"
              title="Dismiss warning"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <header className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white leading-tight">{title}</h1>
          <p className="text-[11px] text-slate-400">{subtitle}</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Simulation Scenario Selector */}
          <div className="hidden xl:flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {(["normal", "tachycardia", "hypoxia", "hypertension"] as SimulationScenario[]).map(
              (sc) => (
                <button
                  key={sc}
                  onClick={() => {
                    setScenario(sc);
                    toast.info(`Switched biometric simulation to: ${sc.toUpperCase()}`);
                  }}
                  className={`px-2 py-1 rounded capitalize text-[11px] font-medium transition-colors ${
                    scenario === sc
                      ? "bg-cyan-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {sc}
                </button>
              )
            )}
          </div>

          {/* Streaming Toggle */}
          <button
            onClick={toggleStreaming}
            title={isStreaming ? "Pause stream" : "Resume stream"}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isStreaming
                ? "bg-slate-950 border-emerald-800 text-emerald-400 hover:bg-slate-800"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {isStreaming ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Live</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Paused</span>
              </>
            )}
          </button>

          {/* MetaMask Signature Verification Status */}
          <button
            onClick={handleVerifySignature}
            disabled={isVerifying}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isSignatureVerified
                ? "bg-slate-950 border-emerald-800 text-emerald-300"
                : "bg-slate-950 border-slate-700 hover:border-cyan-600 text-slate-200"
            }`}
            title="Click to sign challenge with MetaMask"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Signing...</span>
              </>
            ) : isSignatureVerified ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Verified</span>
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Verify Sig</span>
              </>
            )}
          </button>

          {/* Connected Wallet Badge */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
            <Wallet className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-slate-200">
              {walletAddress
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : "Connect"}
            </span>
            <button
              onClick={copyWallet}
              className="text-slate-400 hover:text-cyan-400"
              title="Copy Address"
            >
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Patient Doctor-Access Notification Bell */}
          {user?.role === "patient" && (
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className="relative p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Doctor Access Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      Doctor Access Alerts ({notifications.length})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-cyan-400 hover:underline font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-xs text-slate-500 text-center">
                        No doctor access events yet.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 text-xs space-y-1 ${
                            n.read ? "bg-slate-900" : "bg-cyan-950/20"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-white">{n.doctorName}</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(n.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px]">
                            {n.action.replace("_", " ")}
                            {n.reportTitle ? `: ${n.reportTitle}` : ""}
                          </p>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${n.sepoliaTxHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[10px] text-cyan-400 hover:underline"
                          >
                            <span>Sepolia Tx: {n.sepoliaTxHash.slice(0, 14)}...</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sepolia Faucet ETH Hub */}
          <button
            onClick={() => setIsFaucetModalOpen(true)}
            className="hidden md:inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-300 text-xs font-medium transition-colors"
            title="Claim free Sepolia testnet ETH for gas fees"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Faucet</span>
          </button>

          {/* Web3 / MetaMask Action Button */}
          <button
            onClick={connectWallet}
            className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
          >
            {isMetaMaskAvailable ? "MetaMask" : "Wallet"}
          </button>
        </div>
      </header>

      <SepoliaFaucetModal
        isOpen={isFaucetModalOpen}
        onClose={() => setIsFaucetModalOpen(false)}
        walletAddress={activeMetaMaskAddress || walletAddress}
      />
    </div>
  );
};
