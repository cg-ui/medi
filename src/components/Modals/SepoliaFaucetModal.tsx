import React, { useState, useEffect } from "react";
import { 
  X, 
  ExternalLink, 
  Copy, 
  RefreshCw, 
  Coins, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { blockchainService } from "../../services/blockchainService";
import { toast } from "sonner";

interface SepoliaFaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string;
  onBalanceUpdated?: (balance: string) => void;
}

export const SepoliaFaucetModal: React.FC<SepoliaFaucetModalProps> = ({
  isOpen,
  onClose,
  walletAddress,
  onBalanceUpdated
}) => {
  const [balance, setBalance] = useState("0.0000 Sepolia ETH");
  const [balanceEth, setBalanceEth] = useState(0);
  const [isSepolia, setIsSepolia] = useState(false);
  const [loading, setLoading] = useState(false);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);

  useEffect(() => {
    if (isOpen && walletAddress) {
      checkNetworkAndBalance();
    }
  }, [isOpen, walletAddress]);

  const checkNetworkAndBalance = async () => {
    setLoading(true);
    try {
      const isSep = await blockchainService.isSepoliaNetwork();
      setIsSepolia(isSep);

      if (walletAddress) {
        const res = await blockchainService.getSepoliaBalance(walletAddress);
        setBalance(res.formatted);
        setBalanceEth(res.balanceEth);
        if (onBalanceUpdated) onBalanceUpdated(res.formatted);
      }
    } catch (e) {
      console.warn("Failed checking Sepolia status:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchNetwork = async () => {
    setSwitchingNetwork(true);
    try {
      const switched = await blockchainService.switchToSepoliaNetwork();
      if (switched) {
        toast.success("Switched MetaMask to Ethereum Sepolia Testnet");
        await checkNetworkAndBalance();
      } else {
        toast.error("Network switch was rejected or failed");
      }
    } catch {
      toast.error("Could not switch to Sepolia network");
    } finally {
      setSwitchingNetwork(false);
    }
  };

  const copyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    toast.success("Ethereum address copied to clipboard! Paste into faucet.");
  };

  if (!isOpen) return null;

  const faucets = [
    {
      name: "Google Cloud Web3 Faucet",
      url: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia",
      description: "Fastest official Google faucet. Requires Google sign-in. Dispenses 0.05 Sepolia ETH daily.",
      tag: "Recommended"
    },
    {
      name: "Alchemy Sepolia Faucet",
      url: "https://sepoliafaucet.com",
      description: "Popular testnet faucet. Dispenses up to 0.1 Sepolia ETH per day.",
      tag: "High Reliability"
    },
    {
      name: "Infura Sepolia Faucet",
      url: "https://www.infura.io/faucet/sepolia",
      description: "Direct Infura developer faucet. Dispenses 0.5 Sepolia ETH per day.",
      tag: "Instant"
    },
    {
      name: "PoW Sepolia Faucet (pk910)",
      url: "https://sepolia-faucet.pk910.de",
      description: "No login or social account needed. Solves light proof-of-work in your browser to dispense testnet ETH.",
      tag: "No Account Needed"
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="p-3 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl text-white shadow-lg shadow-cyan-600/30">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Ethereum Sepolia Testnet
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                Chain ID: 11155111
              </span>
            </div>
            <h3 className="font-bold text-white text-lg">
              Sepolia Testnet ETH Faucet Hub
            </h3>
          </div>
        </div>

        {/* Network Warning if not on Sepolia */}
        {!isSepolia && (
          <div className="mb-4 p-3.5 bg-amber-950/60 border border-amber-800/80 rounded-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5 text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>MetaMask is not currently set to <strong>Sepolia Testnet</strong>.</span>
            </div>
            <button
              onClick={handleSwitchNetwork}
              disabled={switchingNetwork}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shrink-0 transition-colors"
            >
              {switchingNetwork ? "Switching..." : "Switch to Sepolia"}
            </button>
          </div>
        )}

        {/* Current Balance Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Connected Wallet Balance:</span>
            <button
              onClick={checkNetworkAndBalance}
              disabled={loading}
              className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 text-[11px] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Balance</span>
            </button>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black font-mono text-white tracking-tight">
              {balance}
            </div>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              balanceEth > 0.001 
                ? "bg-emerald-950 text-emerald-300 border border-emerald-800" 
                : "bg-rose-950 text-rose-300 border border-rose-800"
            }`}>
              {balanceEth > 0.001 ? "Gas Ready" : "Faucet ETH Needed"}
            </span>
          </div>

          {walletAddress && (
            <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-slate-400 truncate max-w-[320px]">
                {walletAddress}
              </span>
              <button
                onClick={copyAddress}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center space-x-1 shrink-0 transition-colors"
              >
                <Copy className="w-3 h-3 text-cyan-400" />
                <span>Copy for Faucets</span>
              </button>
            </div>
          )}
        </div>

        {/* Verified Faucets List */}
        <div className="space-y-2.5 mb-5 max-h-56 overflow-y-auto pr-1">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
            Select a Sepolia Faucet to Claim Free Testnet ETH:
          </span>
          {faucets.map((faucet) => (
            <a
              key={faucet.name}
              href={faucet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-800/60 rounded-xl flex items-center justify-between gap-3 text-xs transition-all group"
            >
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {faucet.name}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {faucet.tag}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {faucet.description}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 text-slate-400 group-hover:text-cyan-400 shrink-0">
                <ExternalLink className="w-4 h-4" />
              </div>
            </a>
          ))}
        </div>

        {/* Footer Note */}
        <div className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-xl text-[11px] text-slate-400 flex items-start space-x-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            <strong>How Sepolia ETH works:</strong> Sepolia testnet ETH has zero real-world monetary value and is completely free. It provides the gas needed to anchor report hashes to Ethereum Sepolia with genuine on-chain Etherscan verification.
          </span>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
