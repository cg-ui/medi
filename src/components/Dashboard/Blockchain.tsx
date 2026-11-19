import React, { useState, useEffect } from "react";
import { Blocks, ExternalLink, CheckCircle2, Search, Terminal, Copy } from "lucide-react";
import { blockchainService } from "../../services/blockchainService";
import { BlockchainTransaction } from "../../types";
import { MEDI_CHAIN_ABI, MEDI_CHAIN_CONTRACT_ADDRESS } from "../../contracts/MediChainRecordsABI";
import { toast } from "sonner";

export const Blockchain: React.FC = () => {
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [currentBlock, setCurrentBlock] = useState(4920245);
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

  const filteredTxs = transactions.filter(
    (t) =>
      t.txHash.toLowerCase().includes(searchTx.toLowerCase()) ||
      t.type.toLowerCase().includes(searchTx.toLowerCase()) ||
      t.details.toLowerCase().includes(searchTx.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Latest Block</span>
          <p className="text-xl font-bold text-white font-mono mt-1">#{currentBlock}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Network</span>
          <p className="text-xl font-bold text-white mt-1">Ethereum Sepolia</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Smart Contract</span>
          <div className="flex items-center justify-between mt-1.5">
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
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Gas Price</span>
          <p className="text-xl font-bold text-white font-mono mt-1">18.4 Gwei</p>
        </div>
      </div>

      {/* Search & ABI Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tx hash, type, or details..."
            value={searchTx}
            onChange={(e) => setSearchTx(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <button
          onClick={() => setShowAbi(!showAbi)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition-colors"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>{showAbi ? "Hide Contract ABI" : "View Contract ABI"}</span>
        </button>
      </div>

      {/* ABI Inspector */}
      {showAbi && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-white">MediChainRecords ABI</span>
            <button
              onClick={() => copyToClipboard(JSON.stringify(MEDI_CHAIN_ABI, null, 2), "ABI")}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              Copy JSON
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1 text-cyan-300 text-[11px]">
            {MEDI_CHAIN_ABI.map((signature, idx) => (
              <div key={idx} className="p-1">
                {signature}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-white flex items-center gap-2">
            <Blocks className="w-4 h-4 text-cyan-400" />
            Transactions ({filteredTxs.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-800">
          {filteredTxs.map((tx) => (
            <div
              key={tx.txHash}
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono uppercase ${
                      tx.type === "RECORD_ADD"
                        ? "bg-cyan-950 text-cyan-300 border border-cyan-800/60"
                        : tx.type === "GRANT_ACCESS"
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                        : tx.type === "RECORD_ACCESS"
                        ? "bg-purple-950 text-purple-300 border border-purple-800/60"
                        : tx.type === "EMERGENCY_UNLOCK"
                        ? "bg-rose-950 text-rose-300 border border-rose-800/60"
                        : "bg-amber-950 text-amber-300 border border-amber-800/60"
                    }`}
                  >
                    {tx.type}
                  </span>
                  <span className="font-mono text-cyan-400 truncate max-w-[200px]">
                    {tx.txHash}
                  </span>
                  <button
                    onClick={() => copyToClipboard(tx.txHash, "Tx Hash")}
                    className="text-slate-500 hover:text-white"
                    title="Copy Tx Hash"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-500 hover:text-cyan-400"
                    title="View on Sepolia Etherscan"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-slate-300">{tx.details}</p>
                <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-mono">
                  <span>From: {tx.from}</span>
                  <span>•</span>
                  <span>Gas: {tx.gasUsed}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-center space-x-1.5 justify-end">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-slate-200">Block #{tx.blockNumber}</span>
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
