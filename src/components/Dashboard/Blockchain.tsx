import React, { useState, useEffect } from "react";
import { 
  Blocks, 
  ExternalLink, 
  Hash, 
  CheckCircle2, 
  Search, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  Terminal, 
  Copy,
  Activity
} from "lucide-react";
import { blockchainService } from "../../services/blockchainService";
import { useAuth } from "../../context/AuthContext";
import { BlockchainTransaction } from "../../types";
import { MEDI_CHAIN_ABI, MEDI_CHAIN_CONTRACT_ADDRESS } from "../../contracts/MediChainRecordsABI";
import { toast } from "sonner";

export const Blockchain: React.FC = () => {
  const { walletAddress } = useAuth();
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [currentBlock, setCurrentBlock] = useState(4920245);
  const [selectedTx, setSelectedTx] = useState<BlockchainTransaction | null>(null);
  const [searchTx, setSearchTx] = useState("");
  const [showAbi, setShowAbi] = useState(false);

  useEffect(() => {
    loadChainData();
    const interval = setInterval(loadChainData, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadChainData = () => {
    setTransactions(blockchainService.getTransactions());
    setCurrentBlock(blockchainService.getLatestBlock());
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const filteredTxs = transactions.filter(t => 
    t.txHash.toLowerCase().includes(searchTx.toLowerCase()) ||
    t.type.toLowerCase().includes(searchTx.toLowerCase()) ||
    t.details.toLowerCase().includes(searchTx.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Network Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              Latest Block
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <p className="text-2xl font-black text-white font-mono mt-3">#{currentBlock}</p>
          <p className="text-[11px] text-slate-500 mt-1">EVM State Synchronized</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-400" />
              Network Protocol
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">12.2s Block Time</span>
          </div>
          <p className="text-xl font-bold text-white mt-3 truncate">Ethereum Sepolia</p>
          <p className="text-[11px] text-slate-500 mt-1">Chain ID: 11155111</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-400" />
              Smart Contract
            </span>
            <span className="text-[10px] text-purple-400 font-semibold">Solidity 0.8.20</span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs font-mono text-cyan-400 truncate max-w-[170px]">
              {MEDI_CHAIN_CONTRACT_ADDRESS}
            </span>
            <button
              onClick={() => copyToClipboard(MEDI_CHAIN_CONTRACT_ADDRESS, "Contract Address")}
              className="text-slate-400 hover:text-white"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">MediChainRecords.sol</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Gas Engine
            </span>
            <span className="text-[10px] text-emerald-400">Normal</span>
          </div>
          <p className="text-2xl font-black text-white font-mono mt-3">18.4 Gwei</p>
          <p className="text-[11px] text-slate-500 mt-1">Avg Confirmation: ~1 Block</p>
        </div>
      </div>

      {/* Explorer Search & Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-lg">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by transaction hash, type, or details..."
            value={searchTx}
            onChange={(e) => setSearchTx(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAbi(!showAbi)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showAbi ? "Hide Smart Contract ABI" : "Inspect Contract ABI"}</span>
          </button>
        </div>
      </div>

      {/* ABI Inspector Box if toggled */}
      {showAbi && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 font-mono text-xs text-slate-300 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white text-xs">MediChainRecords Interface Definition</span>
            <button
              onClick={() => copyToClipboard(JSON.stringify(MEDI_CHAIN_ABI, null, 2), "ABI")}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              Copy JSON ABI
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1 text-slate-400 text-[11px]">
            {MEDI_CHAIN_ABI.map((signature, idx) => (
              <div key={idx} className="p-1 hover:bg-slate-900 rounded text-cyan-300">
                {signature}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions Feed */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Blocks className="w-4 h-4 text-cyan-400" />
            On-Chain Event Ledger & Transaction Log
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {filteredTxs.length} Transactions Recorded
          </span>
        </div>

        <div className="divide-y divide-slate-800">
          {filteredTxs.map((tx) => (
            <div
              key={tx.txHash}
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                    tx.type === "RECORD_ADD"
                      ? "bg-cyan-950 text-cyan-300 border border-cyan-800/60"
                      : tx.type === "GRANT_ACCESS"
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                      : tx.type === "EMERGENCY_UNLOCK"
                      ? "bg-rose-950 text-rose-300 border border-rose-800/60"
                      : "bg-amber-950 text-amber-300 border border-amber-800/60"
                  }`}>
                    {tx.type}
                  </span>
                  <span className="font-mono text-cyan-400 font-medium truncate max-w-[200px]">
                    {tx.txHash}
                  </span>
                  <button
                    onClick={() => copyToClipboard(tx.txHash, "Tx Hash")}
                    className="text-slate-500 hover:text-white"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-slate-300 leading-snug">{tx.details}</p>
                <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-mono">
                  <span>From: {tx.from}</span>
                  <span>•</span>
                  <span>Gas: {tx.gasUsed}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-center space-x-1.5 justify-end">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold text-slate-200">Block #{tx.blockNumber}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                  {new Date(tx.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
