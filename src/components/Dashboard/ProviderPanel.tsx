import React, { useState } from "react";
import { 
  Stethoscope, 
  Search, 
  UserCheck, 
  ShieldCheck, 
  Activity, 
  FileText, 
  PlusCircle, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Sparkles,
  ClipboardPen
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useVitals } from "../../context/VitalsContext";
import { userService } from "../../services/userService";
import { blockchainService } from "../../services/blockchainService";
import { ipfsService } from "../../services/ipfsService";
import { MedicalRecord } from "../../types";
import { toast } from "sonner";

export const ProviderPanel: React.FC = () => {
  const { user, walletAddress } = useAuth();
  const { currentReading } = useVitals();

  const [patientEmail, setPatientEmail] = useState("patient@medichain.io");
  const [resolvedPatient, setResolvedPatient] = useState<{ email: string; address: string | null; name: string } | null>({
    email: "patient@medichain.io",
    name: "Alex Mercer",
    address: "0x71C6615b18B1143c7B6528766fC2A9f69744982a"
  });
  const [patientRecords, setPatientRecords] = useState<MedicalRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [accessVerified, setAccessVerified] = useState(true);

  // Clinical note state
  const [noteTitle, setNoteTitle] = useState("");
  const [clinicalNote, setClinicalNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const handleSearchPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientEmail.trim()) return;

    setSearching(true);
    try {
      const data = await userService.resolvePatient(patientEmail);
      setResolvedPatient(data);
      toast.success(`Resolved patient: ${data.name} (${data.address || "Wallet pending"})`);
      
      // Load records for patient
      const records = await blockchainService.getRecords(data.address || "0x71C6615b18B1143c7B6528766fC2A9f69744982a");
      setPatientRecords(records);
      setAccessVerified(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve patient");
      setResolvedPatient(null);
    } finally {
      setSearching(false);
    }
  };

  const handleAddClinicalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !clinicalNote.trim()) {
      toast.error("Please fill in both title and clinical note");
      return;
    }

    setIsSubmittingNote(true);
    try {
      const patientAddr = resolvedPatient?.address || "0x71C6615b18B1143c7B6528766fC2A9f69744982a";
      const meta = {
        title: `Clinical Consultation: ${noteTitle}`,
        recordType: "Cardiology Report" as const,
        patientAddress: patientAddr,
        description: clinicalNote,
        physician: user?.name || "Dr. Sarah Lin, MD",
        timestamp: new Date().toISOString()
      };

      const ipfsResult = await ipfsService.uploadMetadata(meta);

      const newRec = await blockchainService.addRecord({
        patientAddress: patientAddr,
        title: meta.title,
        recordType: "Cardiology Report",
        ipfsHash: ipfsResult.ipfsHash,
        checksum: ipfsResult.checksum,
        uploader: walletAddress || "0x93B27e6B26A0695B40974A3D73A6625B81028A1c",
        fileSize: "1.8 MB",
        notes: clinicalNote,
        moduleCategory: "cardiology"
      });

      toast.success(`Clinical note signed and committed to Block #${newRec.blockNumber}!`);
      setNoteTitle("");
      setClinicalNote("");
      
      // Refresh patient records
      const updated = await blockchainService.getRecords(patientAddr);
      setPatientRecords(updated);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit note");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/80 border border-purple-500/50 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">{user?.name || "Dr. Sarah Lin, MD"}</h2>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                  Licensed Provider
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Hospital Affiliation: Mount Sinai Cardiac Telemetry Center • NPI: 1982049182
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Practitioner Key:</span>
            <span className="font-mono text-purple-400 font-semibold bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
              {walletAddress || "0x93B...28A1c"}
            </span>
          </div>
        </div>
      </div>

      {/* Patient Resolution Lookup Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-purple-400" />
          Resolve Patient Directory Record
        </h3>

        <form onSubmit={handleSearchPatient} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="email"
              placeholder="Enter patient email (e.g. patient@medichain.io)"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 placeholder-slate-600"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50"
          >
            {searching ? "Resolving..." : "Lookup & Verify Access"}
          </button>
        </form>

        {resolvedPatient && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white">
                {resolvedPatient.name[0]}
              </div>
              <div>
                <p className="font-bold text-white">{resolvedPatient.name}</p>
                <p className="text-slate-400 text-[11px]">{resolvedPatient.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <div>
                <span className="text-slate-500 block">Patient Wallet:</span>
                <span className="font-mono text-cyan-400">{resolvedPatient.address}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Clearance Status:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Smart Contract Authorized
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Patient Live Feed & Clinical Note Entry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Authorized Telemetry Monitor */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              Authorized Patient Live Telemetry Feed
            </h3>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              Live Stream
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Pulse Rate</span>
              <p className="text-xl font-black text-rose-400 mt-1">{currentReading.heartRate} <span className="text-xs font-normal text-slate-400">BPM</span></p>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Blood Oxygen</span>
              <p className="text-xl font-black text-cyan-400 mt-1">{currentReading.spo2} <span className="text-xs font-normal text-slate-400">%</span></p>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Blood Pressure</span>
              <p className="text-xl font-black text-amber-400 mt-1">{currentReading.systolicBP}/{currentReading.diastolicBP}</p>
            </div>
          </div>

          {/* Quick EHR Review */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              Patient's On-Chain Record History ({patientRecords.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {patientRecords.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">No records found or clearance awaiting approval.</p>
              ) : (
                patientRecords.map((r) => (
                  <div key={r.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-200">{r.title}</p>
                      <span className="text-[10px] font-mono text-cyan-400">IPFS: {r.ipfsHash.slice(0, 20)}...</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Block #{r.blockNumber}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Add Physician Clinical Consultation Note */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <ClipboardPen className="w-4 h-4 text-purple-400" />
              Anchor Clinical Note to Ledger
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Cryptographically signs physician notes directly into patient's decentralized EHR ledger.
            </p>

            <form onSubmit={handleAddClinicalNote} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Consultation Topic</label>
                <input
                  type="text"
                  placeholder="e.g. Ambulatory Holter Review & Rhythm Assessment"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Physician Impressions</label>
                <textarea
                  rows={4}
                  placeholder="Patient maintains stable sinus rhythm. Continue current beta-blocker regimen..."
                  value={clinicalNote}
                  onChange={(e) => setClinicalNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingNote}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isSubmittingNote ? "Committing Note..." : "Sign & Commit to Blockchain"}</span>
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Signed with doctor key</span>
            <span className="font-mono text-purple-400">EVM Smart Contract</span>
          </div>
        </div>
      </div>
    </div>
  );
};
