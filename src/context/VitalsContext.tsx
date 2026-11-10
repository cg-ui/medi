import React, { createContext, useContext, useEffect, useState } from "react";
import { AISignalAlert, BiometricReading } from "../types";

export type SimulationScenario = "normal" | "tachycardia" | "hypoxia" | "hypertension";

interface VitalsContextType {
  currentReading: BiometricReading;
  history: BiometricReading[];
  ecgWaveform: number[];
  alerts: AISignalAlert[];
  scenario: SimulationScenario;
  setScenario: (scenario: SimulationScenario) => void;
  isStreaming: boolean;
  toggleStreaming: () => void;
  dismissAlert: (id: string) => void;
  triggerAbnormalSignal: (type: "arrhythmia" | "hypoxia" | "spike") => void;
}

const VitalsContext = createContext<VitalsContextType | undefined>(undefined);

export const VitalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scenario, setScenario] = useState<SimulationScenario>("normal");
  const [isStreaming, setIsStreaming] = useState(true);

  // Generate initial history buffer
  const [history, setHistory] = useState<BiometricReading[]>(() => {
    const list: BiometricReading[] = [];
    const now = Date.now();
    for (let i = 20; i >= 0; i--) {
      const t = new Date(now - i * 3000);
      list.push({
        timestamp: t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        timeRaw: now - i * 3000,
        heartRate: 72 + Math.floor(Math.sin(i) * 4),
        spo2: 98 + Math.floor(Math.random() * 2),
        systolicBP: 118 + Math.floor(Math.sin(i * 0.5) * 5),
        diastolicBP: 78 + Math.floor(Math.cos(i * 0.5) * 3),
        glucose: 96 + Math.floor(Math.random() * 4),
        respiratoryRate: 15 + Math.floor(Math.random() * 2),
        temperature: 36.8,
        hrv: 48 + Math.floor(Math.random() * 5),
        ecgSignal: 0.12,
      });
    }
    return list;
  });

  const [currentReading, setCurrentReading] = useState<BiometricReading>(() => history[history.length - 1]);
  const [ecgWaveform, setEcgWaveform] = useState<number[]>(() => [0, 0.05, 0.1, 0, -0.1, 0.8, -0.3, 0.1, 0.2, 0]);

  const [alerts, setAlerts] = useState<AISignalAlert[]>([
    {
      id: "alert-001",
      type: "normal",
      metric: "Sinus Rhythm",
      message: "Cardiovascular telemetry baseline within normal physiological parameters.",
      recommendation: "Continuous monitoring active. Real-time telemetry encrypted.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      severity: "low",
      acknowledged: false,
    }
  ]);

  // Tick simulation loop
  useEffect(() => {
    if (!isStreaming) return;

    let tickCount = 0;
    const interval = setInterval(() => {
      tickCount++;
      const now = Date.now();
      const timeStr = new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      let hr = 72;
      let spo2 = 98;
      let sys = 118;
      let dia = 78;
      let resp = 16;
      let gluc = 98;
      let temp = 36.8;
      let hrv = 46;

      if (scenario === "tachycardia") {
        hr = 124 + Math.floor(Math.sin(tickCount) * 8);
        sys = 138 + Math.floor(Math.random() * 6);
        dia = 88 + Math.floor(Math.random() * 4);
        hrv = 22 + Math.floor(Math.random() * 4);
      } else if (scenario === "hypoxia") {
        hr = 98 + Math.floor(Math.random() * 5);
        spo2 = 89 + Math.floor(Math.sin(tickCount) * 2);
        resp = 24 + Math.floor(Math.random() * 3);
      } else if (scenario === "hypertension") {
        sys = 158 + Math.floor(Math.sin(tickCount * 0.4) * 8);
        dia = 96 + Math.floor(Math.cos(tickCount * 0.4) * 4);
        hr = 84 + Math.floor(Math.random() * 4);
      } else {
        hr = 72 + Math.floor(Math.sin(tickCount * 0.8) * 5) + Math.floor(Math.random() * 3);
        spo2 = 98 + Math.floor(Math.random() * 2);
        sys = 118 + Math.floor(Math.sin(tickCount * 0.3) * 4);
        dia = 78 + Math.floor(Math.cos(tickCount * 0.3) * 3);
        resp = 15 + (tickCount % 3 === 0 ? 1 : 0);
        gluc = 95 + Math.floor(Math.sin(tickCount * 0.2) * 5);
        temp = 36.7 + (Math.random() * 0.2);
        hrv = 48 + Math.floor(Math.random() * 6);
      }

      // ECG wave pattern (P-Q-R-S-T sequence)
      const ecgCycle = tickCount % 8;
      const ecgVal = ecgCycle === 0 ? 0.15 : // P
                     ecgCycle === 1 ? -0.1 : // Q
                     ecgCycle === 2 ? 1.1 :  // R spike
                     ecgCycle === 3 ? -0.35: // S
                     ecgCycle === 4 ? 0.05 :
                     ecgCycle === 5 ? 0.25 : // T
                     ecgCycle === 6 ? 0.05 : 0;

      setEcgWaveform(prev => {
        const next = [...prev.slice(1), ecgVal + (Math.random() * 0.05)];
        return next;
      });

      const nextReading: BiometricReading = {
        timestamp: timeStr,
        timeRaw: now,
        heartRate: Math.max(40, hr),
        spo2: Math.min(100, Math.max(70, spo2)),
        systolicBP: sys,
        diastolicBP: dia,
        glucose: gluc,
        respiratoryRate: resp,
        temperature: Number(temp.toFixed(1)),
        hrv,
        ecgSignal: Number(ecgVal.toFixed(2)),
      };

      setCurrentReading(nextReading);
      setHistory(prev => [...prev.slice(1), nextReading]);

      // Anomaly detection rules
      if (nextReading.heartRate > 115 && scenario === "tachycardia" && Math.random() < 0.25) {
        triggerAnomalyAlert({
          type: "critical",
          metric: "Tachycardia Detected",
          message: `Sustained resting tachycardia at ${nextReading.heartRate} BPM (normal: 60-100 BPM).`,
          recommendation: "Review ECG Holter recording and notify attending cardiologist.",
          severity: "high"
        });
      } else if (nextReading.spo2 < 92 && scenario === "hypoxia" && Math.random() < 0.25) {
        triggerAnomalyAlert({
          type: "critical",
          metric: "Hypoxemia Alert",
          message: `Peripheral capillary oxygen saturation fallen to ${nextReading.spo2}%.`,
          recommendation: "Emergency oxygen support may be required. Cross-check plethysmogram.",
          severity: "high"
        });
      } else if (nextReading.systolicBP > 150 && scenario === "hypertension" && Math.random() < 0.25) {
        triggerAnomalyAlert({
          type: "warning",
          metric: "Stage 2 Hypertension",
          message: `Systolic arterial pressure elevated at ${nextReading.systolicBP}/${nextReading.diastolicBP} mmHg.`,
          recommendation: "Verify hemodynamic sensors and evaluate antihypertensive protocol.",
          severity: "medium"
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming, scenario]);

  const triggerAnomalyAlert = (alertData: Omit<AISignalAlert, "id" | "timestamp" | "acknowledged">) => {
    setAlerts(prev => {
      // Avoid duplicate alert of same metric within 30 seconds
      if (prev.some(a => a.metric === alertData.metric && !a.acknowledged)) {
        return prev;
      }
      return [
        {
          id: `alert-${Date.now()}`,
          ...alertData,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          acknowledged: false,
        },
        ...prev.slice(0, 9)
      ];
    });
  };

  const triggerAbnormalSignal = (type: "arrhythmia" | "hypoxia" | "spike") => {
    if (type === "arrhythmia") {
      setScenario("tachycardia");
      triggerAnomalyAlert({
        type: "critical",
        metric: "Arrhythmia Alert",
        message: "Irregular ventricular complex detected on lead II simulation.",
        recommendation: "Initiate rhythm capture and alert telemetry supervisor.",
        severity: "high"
      });
    } else if (type === "hypoxia") {
      setScenario("hypoxia");
      triggerAnomalyAlert({
        type: "critical",
        metric: "Acute Hypoxia",
        message: "Rapid drop in peripheral O2 saturation detected.",
        recommendation: "Check sensor placement and prepare supplemental O2.",
        severity: "high"
      });
    } else {
      setScenario("hypertension");
      triggerAnomalyAlert({
        type: "warning",
        metric: "Vascular Surge",
        message: "Arterial pressure surge above 155 mmHg.",
        recommendation: "Schedule automated re-cuff measurement in 3 minutes.",
        severity: "medium"
      });
    }
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  const toggleStreaming = () => setIsStreaming(prev => !prev);

  return (
    <VitalsContext.Provider
      value={{
        currentReading,
        history,
        ecgWaveform,
        alerts,
        scenario,
        setScenario,
        isStreaming,
        toggleStreaming,
        dismissAlert,
        triggerAbnormalSignal,
      }}
    >
      {children}
    </VitalsContext.Provider>
  );
};

export const useVitals = () => {
  const context = useContext(VitalsContext);
  if (!context) throw new Error("useVitals must be used within a VitalsProvider");
  return context;
};
