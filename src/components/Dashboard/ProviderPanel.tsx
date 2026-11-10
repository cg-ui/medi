import React, { useState, useEffect } from "react";
import {
  Stethoscope,
  Search,
  ShieldCheck,
  Activity,
  FileText,
  PlusCircle,
  ExternalLink,
  ClipboardPen,
  Eye,
  Download,
  Users,
  Wallet,
  CheckCircle2,
  X,
  FileCheck2,
  BellRing,
  Coins,
  Thermometer,
  Droplets,
  Wind,
  HeartPulse,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useVitals } from "../../context/VitalsContext";
import { userService } from "../../services/userService";
import { blockchainService } from "../../services/blockchainService";
import { ipfsService } from "../../services/ipfsService";
import { AccessGrant, MedicalRecord } from "../../types";
import { toast } from "sonner";

export const ProviderPanel: React.FC = () => {
  const { user, walletAddress } = useAuth();
  const { currentReading } = useVitals();

  const doctorAddress = walletAddress || "0x93B27e6B26A0695B40974A3D73A6625B81028A1c";
  const doctorName = user?.name || "Dr. Sarah Lin, MD";

  const [authorizedGrants, setAuthorizedGrants] = useState<AccessGrant[]>([]);
  const [loadingGrants, setLoadingGrants] = useState(false);

  const [patientWalletInput, setPatientWalletInput] = useState(
    "0x71C6615b18B1143c7B6528766fC2A9f69744982a"
  );
  const [resolvedPatient, setResolvedPatient] = useState<{
    email: string;
    address: string;
    name: string;
    grantedModules: string[];
  } | null>(null);

  const [patientRecords, setPatientRecords] = useState<MedicalRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [useSepoliaGas, setUseSepoliaGas] = useState(true);

  const [lastAccessTx, setLastAccessTx] = useState<{
    txHash: string;
    blockNumber: number;
    sepoliaEtherscanUrl: string;
    action: string;
    isRealSepoliaTx: boolean;
  } | null>(null);

  // Report viewer modal
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Clinical note state
  const [noteTitle, setNoteTitle] = useState("");
  const [clinicalNote, setClinicalNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  useEffect(() => {
    loadAuthorizedPatients();
  }, [doctorAddress]);

  const loadAuthorizedPatients = async () => {
    setLoadingGrants(true);
    try {
      const grants = await blockchainService.getGrantsForDoctor(doctorAddress);
      setAuthorizedGrants(grants);
      if (grants.length > 0 && !resolvedPatient) {
        const first = grants[0];
        const addr = first.patientAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a";
        setPatientWalletInput(addr);
        setResolvedPatient({
          address: addr,
          name: first.patientName || "Alex Mercer",
          email: "patient@medichain.io",
          grantedModules: first.modules,
        });
        const records = await blockchainService.getRecords(addr);
        setPatientRecords(records);
      }
    } catch {
      // ignore
    } finally {
      setLoadingGrants(false);
    }
  };

  const handleAccessPatientByWallet = async (
    targetAddress: string,
    knownName?: string,
    knownModules?: string[]
  ) => {
    const cleanAddr = targetAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddr)) {
      toast.error("Please enter a valid 42-character Ethereum wallet address (0x...)");
      return;
    }

    setSearching(true);
    try {
      const resolved = await userService.resolvePatientByWallet(cleanAddr);

      // Find matching active grant if any
      const matchingGrant = authorizedGrants.find(
        (g) => (g.patientAddress || "").toLowerCase() === cleanAddr.toLowerCase()
      );
      const grantedModules = knownModules || matchingGrant?.modules || ["records", "vitals"];

      // Execute MetaMask Sepolia ETH approval, log tx, and notify patient
      const accessReceipt = await blockchainService.authorizeAndLogDoctorAccess({
        patientAddress: cleanAddr,
        doctorAddress,
        doctorName,
        action: "ACCESS_REQUEST",
        useSepoliaGas,
      });

      setLastAccessTx({
        ...accessReceipt,
        action: "Patient Record Access",
      });

      setResolvedPatient({
        address: cleanAddr,
        name: knownName || resolved.name || "Registered Patient",
        email: resolved.email || "",
        grantedModules,
      });

      const records = await blockchainService.getRecords(cleanAddr);
      setPatientRecords(records);

      toast.success(
        `Access approved on Sepolia & patient notified! Tx: ${accessReceipt.txHash.slice(0, 12)}...`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to authorize patient access");
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAccessPatientByWallet(patientWalletInput);
  };

  const handleViewReport = async (rec: MedicalRecord) => {
    const targetAddr = resolvedPatient?.address || rec.patientAddress;
    setActionLoadingId(`view-${rec.id}`);
    try {
      const receipt = await blockchainService.authorizeAndLogDoctorAccess({
        patientAddress: targetAddr,
        doctorAddress,
        doctorName,
        action: "REPORT_VIEW",
        reportTitle: rec.title,
        useSepoliaGas,
      });

      setLastAccessTx({
        ...receipt,
        action: `Viewed "${rec.title}"`,
      });
      setViewingRecord(rec);
      toast.success(`Report access logged on Sepolia & patient notified.`);
    } catch (err: any) {
      toast.error(err.message || "MetaMask approval required to view report");
    } finally {
      setActionLoadingId(null);
    }
  };

  const triggerFileDownload = (rec: MedicalRecord) => {
    if (rec.downloadUrl) {
      const a = document.createElement("a");
      a.href = rec.downloadUrl;
      a.download = rec.fileName || `${rec.title.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Fallback for seeded clinical records without binary file
    const content = [
      `MEDICHAIN CLINICAL RECORD`,
      `====================================`,
      `Title: ${rec.title}`,
      `Type: ${rec.recordType}`,
      `Patient Wallet: ${rec.patientAddress}`,
      `Uploaded By: ${rec.uploader}`,
      `Timestamp: ${new Date(rec.timestamp).toISOString()}`,
      `IPFS CIDv1: ${rec.ipfsHash}`,
      rec.ipfsCidV0 ? `IPFS CIDv0: ${rec.ipfsCidV0}` : "",
      `SHA-256 Checksum: ${rec.checksum}`,
      `Sepolia Tx Hash: ${rec.txHash}`,
      `Block Number: #${rec.blockNumber}`,
      ``,
      `Clinical Notes:`,
      rec.notes || "No additional clinical notes recorded.",
    ]
      .filter(Boolean)
      .join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rec.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = async (rec: MedicalRecord) => {
    const targetAddr = resolvedPatient?.address || rec.patientAddress;
    setActionLoadingId(`dl-${rec.id}`);
    try {
      const receipt = await blockchainService.authorizeAndLogDoctorAccess({
        patientAddress: targetAddr,
        doctorAddress,
        doctorName,
        action: "REPORT_DOWNLOAD",
        reportTitle: rec.title,
        useSepoliaGas,
      });

      setLastAccessTx({
        ...receipt,
        action: `Downloaded "${rec.title}"`,
      });
      triggerFileDownload(rec);
      toast.success(`Download authorized on Sepolia & patient notified!`);
    } catch (err: any) {
      toast.error(err.message || "MetaMask approval required to download report");
    } finally {
      setActionLoadingId(null);
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
      const patientAddr =
        resolvedPatient?.address || "0x71C6615b18B1143c7B6528766fC2A9f69744982a";
      const meta = {
        title: `Clinical Consultation: ${noteTitle}`,
        recordType: "Cardiology Report" as const,
        patientAddress: patientAddr,
        description: clinicalNote,
        physician: doctorName,
        timestamp: new Date().toISOString(),
      };

      const ipfsResult = await ipfsService.uploadMetadata(meta);

      const newRec = await blockchainService.addRecord({
        patientAddress: patientAddr,
        title: meta.title,
        recordType: "Cardiology Report",
        ipfsHash: ipfsResult.ipfsHash,
        ipfsCidV0: ipfsResult.ipfsCidV0,
        checksum: ipfsResult.checksum,
        uploader: doctorAddress,
        fileSize: "1.8 KB",
        notes: clinicalNote,
        moduleCategory: "cardiology",
        useSepoliaGas,
      });

      toast.success(`Clinical note signed and committed to Block #${newRec.blockNumber}!`);
      setNoteTitle("");
      setClinicalNote("");

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
                <h2 className="text-lg font-bold text-white">{doctorName}</h2>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                  Licensed Provider
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Mount Sinai Cardiac Telemetry Center • Sepolia Smart Contract Access Control
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Practitioner Wallet:</span>
              <span className="font-mono text-purple-400 font-semibold bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                {doctorAddress.slice(0, 8)}...{doctorAddress.slice(-6)}
              </span>
            </div>
            <label className="flex items-center space-x-2 text-[11px] text-amber-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useSepoliaGas}
                onChange={(e) => setUseSepoliaGas(e.target.checked)}
                className="rounded border-amber-700 bg-slate-950 text-amber-500 focus:ring-amber-500"
              />
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Use Sepolia ETH Gas Approval for Every Access</span>
            </label>
          </div>
        </div>
      </div>

      {/* Authorized Patients List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Patients Who Granted You Access ({authorizedGrants.length})
          </h3>
          <button
            onClick={loadAuthorizedPatients}
            disabled={loadingGrants}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingGrants ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {authorizedGrants.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            No patients have granted access to your wallet yet. Enter a patient wallet address below to request access.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {authorizedGrants.map((grant) => {
              const pAddr = grant.patientAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a";
              const isSelected =
                resolvedPatient?.address.toLowerCase() === pAddr.toLowerCase();
              return (
                <div
                  key={grant.id}
                  onClick={() => {
                    setPatientWalletInput(pAddr);
                    handleAccessPatientByWallet(pAddr, grant.patientName, grant.modules);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-purple-950/30 border-purple-500/80 shadow-md shadow-purple-950/40"
                      : "bg-slate-950/80 border-slate-800 hover:border-purple-700/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center font-bold text-emerald-300 text-sm">
                        {(grant.patientName || "P")[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {grant.patientName || "Authorized Patient"}
                        </p>
                        <p className="text-[11px] font-mono text-cyan-400">
                          {pAddr.slice(0, 10)}...{pAddr.slice(-8)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                      Authorized
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {grant.modules.map((m) => (
                      <span
                        key={m}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 uppercase font-medium"
                      >
                        {m}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Expires {new Date(grant.expiry).toLocaleDateString()}</span>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${grant.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-cyan-400 hover:underline font-mono flex items-center gap-1"
                    >
                      <span>Grant Tx: {grant.txHash.slice(0, 10)}...</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Patient Wallet Address Lookup & Sepolia Approval */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-purple-400" />
          Access Patient Records by Wallet Address
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          Enter any patient&apos;s Ethereum wallet address. Accessing records requires MetaMask Sepolia ETH approval, logs a Sepolia transaction, and notifies the patient.
        </p>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Enter patient Ethereum wallet address (0x...)"
              value={patientWalletInput}
              onChange={(e) => setPatientWalletInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-purple-500 placeholder-slate-600"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{searching ? "Approving on Sepolia..." : "Approve & Access Patient"}</span>
          </button>
        </form>

        {/* Latest Sepolia Access Transaction Banner */}
        {lastAccessTx && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <BellRing className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>{lastAccessTx.action}</strong> logged on-chain (Block #{lastAccessTx.blockNumber}) &amp; patient notified.
              </span>
            </div>
            <a
              href={lastAccessTx.sepoliaEtherscanUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-cyan-400 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Sepolia Tx: {lastAccessTx.txHash.slice(0, 14)}...</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {resolvedPatient && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white">
                {resolvedPatient.name[0]}
              </div>
              <div>
                <p className="font-bold text-white">{resolvedPatient.name}</p>
                <p className="text-slate-400 font-mono text-[11px]">{resolvedPatient.address}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <div className="flex flex-wrap gap-1">
                {resolvedPatient.grantedModules.map((m) => (
                  <span
                    key={m}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-semibold uppercase"
                  >
                    {m}
                  </span>
                ))}
              </div>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sepolia Access Active
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Patient Vitals, Reports & Clinical Note Entry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Full Vitals & Patient Reports (PDF, DOCX) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Vitals Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                Patient Biometric Vitals Feed
              </h3>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                Live Telemetry
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <HeartPulse className="w-3 h-3 text-rose-400" /> Pulse Rate
                </span>
                <p className="text-xl font-black text-rose-400 mt-1">
                  {currentReading.heartRate}{" "}
                  <span className="text-xs font-normal text-slate-400">BPM</span>
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-cyan-400" /> Blood Oxygen
                </span>
                <p className="text-xl font-black text-cyan-400 mt-1">
                  {currentReading.spo2}{" "}
                  <span className="text-xs font-normal text-slate-400">%</span>
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Blood Pressure
                </span>
                <p className="text-xl font-black text-amber-400 mt-1">
                  {currentReading.systolicBP}/{currentReading.diastolicBP}{" "}
                  <span className="text-xs font-normal text-slate-400">mmHg</span>
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Wind className="w-3 h-3 text-emerald-400" /> Resp. Rate
                </span>
                <p className="text-lg font-bold text-emerald-400 mt-1">
                  {currentReading.respiratoryRate}{" "}
                  <span className="text-xs font-normal text-slate-400">br/min</span>
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-orange-400" /> Temperature
                </span>
                <p className="text-lg font-bold text-orange-400 mt-1">
                  {currentReading.temperature}{" "}
                  <span className="text-xs font-normal text-slate-400">°C</span>
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Glucose / HRV
                </span>
                <p className="text-lg font-bold text-purple-400 mt-1">
                  {currentReading.glucose}{" "}
                  <span className="text-xs font-normal text-slate-400">mg/dL</span>
                </p>
              </div>
            </div>
          </div>

          {/* Patient Reports (PDF, DOCX) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                Patient Reports &amp; Documents (PDF / DOCX) ({patientRecords.length})
              </h3>
              <span className="text-[11px] text-slate-400">
                Every View/Download logs Sepolia Tx &amp; notifies patient
              </span>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {patientRecords.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No reports found for this patient wallet.
                </p>
              ) : (
                patientRecords.map((r) => {
                  const isDocx =
                    r.isWordDoc ||
                    (r.fileName && /\.(docx?|doc)$/i.test(r.fileName));
                  return (
                    <div
                      key={r.id}
                      className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-100 truncate">
                            {r.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              isDocx
                                ? "bg-blue-950/70 text-blue-300 border-blue-800"
                                : "bg-purple-950/70 text-purple-300 border-purple-800"
                            }`}
                          >
                            {isDocx ? "DOCX / Word" : r.recordType}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-mono">
                          <span>IPFS: {r.ipfsHash.slice(0, 18)}...</span>
                          <span>Block #{r.blockNumber}</span>
                          {r.fileSize && <span>{r.fileSize}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleViewReport(r)}
                          disabled={actionLoadingId !== null}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>
                            {actionLoadingId === `view-${r.id}` ? "Signing..." : "View"}
                          </span>
                        </button>
                        <button
                          onClick={() => handleDownloadReport(r)}
                          disabled={actionLoadingId !== null}
                          className="px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>
                            {actionLoadingId === `dl-${r.id}` ? "Signing..." : "Download"}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Add Physician Clinical Consultation Note */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between h-fit">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <ClipboardPen className="w-4 h-4 text-purple-400" />
              Anchor Clinical Note to Ledger
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Cryptographically signs physician notes directly into the patient&apos;s decentralized EHR ledger.
            </p>

            <form onSubmit={handleAddClinicalNote} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Consultation Topic
                </label>
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Physician Impressions
                </label>
                <textarea
                  rows={5}
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
                <span>
                  {isSubmittingNote ? "Committing Note..." : "Sign & Commit to Blockchain"}
                </span>
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Signed with doctor key</span>
            <span className="font-mono text-purple-400">Sepolia EVM Contract</span>
          </div>
        </div>
      </div>

      {/* Report Viewer Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FileCheck2 className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-white">{viewingRecord.title}</h3>
                  <p className="text-xs text-slate-400">
                    {viewingRecord.recordType} •{" "}
                    {new Date(viewingRecord.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
              <p className="text-slate-400 font-semibold uppercase text-[10px]">
                Clinical Summary &amp; Notes
              </p>
              <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                {viewingRecord.notes || "No text summary attached. Download the original file to inspect full contents."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">IPFS CIDv1</span>
                <span className="text-cyan-400 break-all">{viewingRecord.ipfsHash}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">SHA-256 Checksum</span>
                <span className="text-emerald-400 break-all">{viewingRecord.checksum}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Sepolia Tx Hash</span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${viewingRecord.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 hover:underline break-all"
                >
                  {viewingRecord.txHash}
                </a>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">File / Size</span>
                <span className="text-slate-200">
                  {viewingRecord.fileName || "Clinical Metadata"} ({viewingRecord.fileSize})
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadReport(viewingRecord)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
