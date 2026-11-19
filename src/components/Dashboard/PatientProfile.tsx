import React, { useState } from "react";
import {
  Heart,
  Wind,
  Droplet,
  Gauge,
  Thermometer,
  Activity,
  AlertOctagon,
  UploadCloud,
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
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";

export const PatientProfile: React.FC = () => {
  const { currentReading, history, alerts, triggerAbnormalSignal, dismissAlert } = useVitals();
  const { user, walletAddress } = useAuth();
  const [committing, setCommitting] = useState(false);

  const handleAnchorSnapshot = async () => {
    setCommitting(true);
    try {
      const snapshot = {
        title: `Telemetry Vital Signs Snapshot (${currentReading.timestamp})`,
        recordType: "Laboratory Panel" as const,
        patientAddress: walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a",
        description: `Automated on-chain snapshot: HR ${currentReading.heartRate} BPM, SpO2 ${currentReading.spo2}%, BP ${currentReading.systolicBP}/${currentReading.diastolicBP} mmHg`,
        clinicalData: currentReading,
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
        moduleCategory: "vitals",
      });

      toast.success(
        `Telemetry anchored to Block #${newRec.blockNumber}! Tx: ${newRec.txHash.slice(0, 10)}...`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to anchor snapshot");
    } finally {
      setCommitting(false);
    }
  };

  const getStatusColor = (val: number, low: number, high: number) => {
    if (val < low || val > high) return "text-rose-400";
    return "text-emerald-400";
  };

  return (
    <div className="space-y-5">
      {/* Patient Identity Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-cyan-600 flex items-center justify-center text-white text-base font-bold shrink-0">
            {user?.name ? user.name[0] : "A"}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{user?.name || "Alex Mercer"}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
              <span>ID: MC-8921-PT</span>
              <span>Age: 38</span>
              <span>Blood: A+</span>
              <span>Physician: Dr. Sarah Lin, MD</span>
              <span className="font-mono text-slate-500">{walletAddress}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleAnchorSnapshot}
          disabled={committing}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center space-x-2 transition-colors disabled:opacity-50 self-start md:self-auto"
        >
          {committing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Committing...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              <span>Commit Biometric Snapshot</span>
            </>
          )}
        </button>
      </div>

      {/* Vital Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              Heart Rate
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-white">{currentReading.heartRate}</span>
            <span className="text-xs text-slate-400">bpm</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className={getStatusColor(currentReading.heartRate, 60, 100)}>
              {currentReading.heartRate > 100
                ? "Tachycardia"
                : currentReading.heartRate < 60
                ? "Bradycardia"
                : "Normal"}
            </span>
            <span className="text-slate-500">60–100</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
              SpO2
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-white">{currentReading.spo2}</span>
            <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className={getStatusColor(currentReading.spo2, 95, 100)}>
              {currentReading.spo2 < 93 ? "Hypoxemia" : "Optimal"}
            </span>
            <span className="text-slate-500">&gt; 95%</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              Blood Pressure
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-0.5">
            <span className="text-2xl font-bold text-white">{currentReading.systolicBP}</span>
            <span className="text-sm text-slate-400">/{currentReading.diastolicBP}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className={getStatusColor(currentReading.systolicBP, 90, 130)}>
              {currentReading.systolicBP > 130 ? "Elevated" : "Normal"}
            </span>
            <span className="text-slate-500">&lt; 120/80</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Droplet className="w-3.5 h-3.5 text-teal-400" />
              Glucose
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-white">{currentReading.glucose}</span>
            <span className="text-xs text-slate-400">mg/dL</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className={getStatusColor(currentReading.glucose, 70, 140)}>Normal</span>
            <span className="text-slate-500">70–140</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              Respiration
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-white">{currentReading.respiratoryRate}</span>
            <span className="text-xs text-slate-400">br/m</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className={getStatusColor(currentReading.respiratoryRate, 12, 20)}>Resting</span>
            <span className="text-slate-500">12–20</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-emerald-400" />
              Core Temp
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-white">{currentReading.temperature}</span>
            <span className="text-xs text-slate-400">°C</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className={getStatusColor(currentReading.temperature, 36.1, 37.5)}>Normal</span>
            <span className="text-slate-500">36.5–37.5</span>
          </div>
        </div>
      </div>

      {/* Main Chart & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-semibold text-white">Telemetry Stream</h3>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                Heart Rate
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Systolic BP
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="bpGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[50, 160]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#e2e8f0" }}
                />
                <Area
                  type="monotone"
                  dataKey="heartRate"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#hrGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="systolicBP"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#bpGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400">Simulate Signal:</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => triggerAbnormalSignal("arrhythmia")}
                className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-rose-300 font-medium transition-colors"
              >
                Tachycardia
              </button>
              <button
                onClick={() => triggerAbnormalSignal("hypoxia")}
                className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 font-medium transition-colors"
              >
                Hypoxia
              </button>
              <button
                onClick={() => triggerAbnormalSignal("spike")}
                className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-300 font-medium transition-colors"
              >
                BP Surge
              </button>
            </div>
          </div>
        </div>

        {/* Anomaly Warnings Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-white mb-3">Clinical Warnings</h3>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-80 pr-1">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                No active warnings. Vitals normal.
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border text-xs ${
                    alert.severity === "high"
                      ? "bg-rose-950/30 border-rose-800/70 text-rose-200"
                      : alert.severity === "medium"
                      ? "bg-amber-950/30 border-amber-800/70 text-amber-200"
                      : "bg-slate-950 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-semibold">
                      <AlertOctagon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          alert.severity === "high"
                            ? "text-rose-400"
                            : alert.severity === "medium"
                            ? "text-amber-400"
                            : "text-cyan-400"
                        }`}
                      />
                      <span>{alert.metric}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{alert.timestamp}</span>
                  </div>
                  <p className="mt-1 text-slate-300">{alert.message}</p>
                  <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 truncate pr-2">{alert.recommendation}</span>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 shrink-0"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
