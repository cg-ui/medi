import React, { useState } from "react";
import { 
  Heart, 
  Wind, 
  Droplet, 
  Gauge, 
  Thermometer, 
  Activity, 
  AlertOctagon, 
  ShieldCheck, 
  Sparkles, 
  Radio, 
  UploadCloud, 
  Clock, 
  CheckCircle,
  FileCheck2
} from "lucide-react";
import { useVitals } from "../../context/VitalsContext";
import { useAuth } from "../../context/AuthContext";
import { blockchainService } from "../../services/blockchainService";
import { ipfsService } from "../../services/ipfsService";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts";
import { toast } from "sonner";

export const PatientProfile: React.FC = () => {
  const { currentReading, history, alerts, triggerAbnormalSignal, dismissAlert } = useVitals();
  const { user, walletAddress } = useAuth();
  const [committing, setCommitting] = useState(false);

  // Quick anchor current telemetry snapshot to blockchain
  const handleAnchorSnapshot = async () => {
    setCommitting(true);
    try {
      const snapshot = {
        title: `Telemetry Vital Signs Snapshot (${currentReading.timestamp})`,
        recordType: "Laboratory Panel" as const,
        patientAddress: walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a",
        description: `Automated on-chain snapshot: HR ${currentReading.heartRate} BPM, SpO2 ${currentReading.spo2}%, BP ${currentReading.systolicBP}/${currentReading.diastolicBP} mmHg`,
        clinicalData: currentReading
      };

      const ipfsResult = await ipfsService.uploadMetadata(snapshot);
      const newRec = await blockchainService.addRecord({
        patientAddress: walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a",
        title: snapshot.title,
        recordType: "Laboratory Panel",
        ipfsHash: ipfsResult.ipfsHash,
        checksum: ipfsResult.checksum,
        uploader: walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a",
        fileSize: "14.2 KB",
        notes: `Telemetry verified. SHA-256: ${ipfsResult.checksum.slice(0, 16)}...`,
        moduleCategory: "vitals"
      });

      toast.success(`Telemetry anchored to Block #${newRec.blockNumber}! Tx: ${newRec.txHash.slice(0, 10)}...`);
    } catch (err: any) {
      toast.error(err.message || "Failed to anchor snapshot");
    } finally {
      setCommitting(false);
    }
  };

  const getStatusColor = (val: number, low: number, high: number) => {
    if (val < low || val > high) return "text-rose-400 border-rose-800/60 bg-rose-950/20";
    return "text-emerald-400 border-emerald-800/60 bg-emerald-950/20";
  };

  return (
    <div className="space-y-6">
      {/* Patient Banner / Identity Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-cyan-600/30">
              {user?.name ? user.name[0] : "A"}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white">{user?.name || "Alex Mercer"}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-medium">
                  ID: MC-8921-PT
                </span>
                <span className="flex items-center text-xs text-emerald-400 font-medium bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  Encrypted & Active
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                <span>Age: <strong className="text-slate-200">38</strong></span>
                <span>Blood: <strong className="text-slate-200">A+</strong></span>
                <span>Lead Physician: <strong className="text-cyan-400">Dr. Sarah Lin, MD</strong></span>
                <span className="font-mono text-slate-500">Wallet: {walletAddress}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleAnchorSnapshot}
              disabled={committing}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-cyan-600/25 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {committing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Committing to Chain...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Commit Biometric Snapshot</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Vital Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Heart Rate */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-500 animate-pulse" />
              Heart Rate
            </span>
            <span className="text-[10px] text-slate-500">BPM</span>
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black tracking-tight text-white">{currentReading.heartRate}</span>
            <span className="text-xs text-slate-400">bpm</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${getStatusColor(currentReading.heartRate, 60, 100)}`}>
              {currentReading.heartRate > 100 ? "Tachycardia" : currentReading.heartRate < 60 ? "Bradycardia" : "Normal Sinus"}
            </span>
            <span className="text-slate-500">60-100</span>
          </div>
        </div>

        {/* SpO2 */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-cyan-400" />
              SpO2
            </span>
            <span className="text-[10px] text-slate-500">%</span>
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black tracking-tight text-white">{currentReading.spo2}</span>
            <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${getStatusColor(currentReading.spo2, 95, 100)}`}>
              {currentReading.spo2 < 93 ? "Hypoxemia" : "Optimal"}
            </span>
            <span className="text-slate-500">&gt; 95%</span>
          </div>
        </div>

        {/* Blood Pressure */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-amber-400" />
              Arterial BP
            </span>
            <span className="text-[10px] text-slate-500">mmHg</span>
          </div>
          <div className="mt-3 flex items-baseline space-x-1">
            <span className="text-2xl font-black tracking-tight text-white">{currentReading.systolicBP}</span>
            <span className="text-sm font-semibold text-slate-400">/{currentReading.diastolicBP}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${getStatusColor(currentReading.systolicBP, 90, 130)}`}>
              {currentReading.systolicBP > 130 ? "Elevated" : "Normal"}
            </span>
            <span className="text-slate-500">&lt; 120/80</span>
          </div>
        </div>

        {/* Blood Glucose */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium flex items-center gap-1.5">
              <Droplet className="w-4 h-4 text-teal-400" />
              Glucose
            </span>
            <span className="text-[10px] text-slate-500">mg/dL</span>
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black tracking-tight text-white">{currentReading.glucose}</span>
            <span className="text-xs text-slate-400">mg/dL</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${getStatusColor(currentReading.glucose, 70, 140)}`}>
              Euglycemic
            </span>
            <span className="text-slate-500">70-140</span>
          </div>
        </div>

        {/* Respiratory Rate */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-400" />
              Respiration
            </span>
            <span className="text-[10px] text-slate-500">rpm</span>
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black tracking-tight text-white">{currentReading.respiratoryRate}</span>
            <span className="text-xs text-slate-400">br/m</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${getStatusColor(currentReading.respiratoryRate, 12, 20)}`}>
              Resting
            </span>
            <span className="text-slate-500">12-20</span>
          </div>
        </div>

        {/* Body Temperature */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-emerald-400" />
              Core Temp
            </span>
            <span className="text-[10px] text-slate-500">°C</span>
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black tracking-tight text-white">{currentReading.temperature}</span>
            <span className="text-xs text-slate-400">°C</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${getStatusColor(currentReading.temperature, 36.1, 37.5)}`}>
              Normothermic
            </span>
            <span className="text-slate-500">36.5-37.5</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Telemetry Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recharts Live Biometric Stream */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                Continuous Biometric Telemetry Stream
              </h3>
              <p className="text-xs text-slate-400">Real-time synchronized sensor channels (Heart Rate & Arterial Systolic)</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
                Heart Rate (BPM)
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Systolic BP (mmHg)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="bpGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[50, 160]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.75rem", fontSize: "12px" }}
                  itemStyle={{ color: "#e2e8f0" }}
                />
                <Area type="monotone" dataKey="heartRate" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#hrGradient)" />
                <Area type="monotone" dataKey="systolicBP" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#bpGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Simulation Trigger Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-medium">Trigger Signal Telemetry Challenge:</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => triggerAbnormalSignal("arrhythmia")}
                className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 font-medium transition-all"
              >
                Simulate Tachycardia
              </button>
              <button
                onClick={() => triggerAbnormalSignal("hypoxia")}
                className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 font-medium transition-all"
              >
                Simulate Hypoxia
              </button>
              <button
                onClick={() => triggerAbnormalSignal("spike")}
                className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-800/60 text-amber-300 font-medium transition-all"
              >
                Simulate BP Surge
              </button>
            </div>
          </div>
        </div>

        {/* Right: AI Signal Anomaly Detection Panel */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              AI Clinical Signals & Warnings
            </h3>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/70">
              Heuristic Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Automated neural screening for acute biometric drift and hemodynamic instability.
          </p>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-80 pr-1">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No active anomaly warnings. Telemetry nominal.
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    alert.severity === "high"
                      ? "bg-rose-950/30 border-rose-800/70 text-rose-200"
                      : alert.severity === "medium"
                      ? "bg-amber-950/30 border-amber-800/70 text-amber-200"
                      : "bg-slate-800/40 border-slate-700/60 text-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertOctagon className={`w-4 h-4 shrink-0 ${
                        alert.severity === "high" ? "text-rose-400" : alert.severity === "medium" ? "text-amber-400" : "text-cyan-400"
                      }`} />
                      <span className="font-bold text-xs">{alert.metric}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{alert.timestamp}</span>
                  </div>
                  <p className="text-xs mt-1.5 leading-relaxed text-slate-300">{alert.message}</p>
                  <div className="mt-2 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 italic text-[10px] truncate pr-2">
                      Rec: {alert.recommendation}
                    </span>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-medium shrink-0"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Cryptographic integrity active
            </span>
            <span className="font-mono text-slate-500">256-bit AES GCM</span>
          </div>
        </div>
      </div>
    </div>
  );
};
