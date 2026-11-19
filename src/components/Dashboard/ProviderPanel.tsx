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

  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

      const matchingGrant = authorizedGrants.find(
        (g) => (g.patientAddress || "").toLowerCase() === cleanAddr.toLowerCase()
      );
      const grantedModules = knownModules || matchingGrant?.modules || ["records", "vitals"];

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
      toast.success("Report access logged on Sepolia & patient notified.");
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
      toast.success("Download authorized on Sepolia & patient notified!");
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
    <div className="space-y-5">
      {/* Provider Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{doctorName}</h2>
            <p className="text-xs text-slate-400">
              Licensed Provider • {doctorAddress.slice(0, 8)}...{doctorAddress.slice(-6)}
            </p>
          </div>
        </div>

        <label className="flex items-center space-x-2 text-xs text-amber-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={useSepoliaGas}
            onChange={(e) => setUseSepoliaGas(e.target.checked)}
            className="rounded border-slate-700 bg-slate-950 text-amber-500"
          />
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>Sepolia ETH approval per access</span>
        </label>
      </div>

      {/* Authorized Patients List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Authorized Patients ({authorizedGrants.length})
          </h3>
          <button
            onClick={loadAuthorizedPatients}
            disabled={loadingGrants}
            className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingGrants ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {authorizedGrants.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            No patients have granted access yet. Enter a patient wallet address below.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {authorizedGrants.map((grant) => {
              const pAddr = grant.patientAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a";
              const isSelected = resolvedPatient?.address.toLowerCase() === pAddr.toLowerCase();
              return (
                <div
                  key={grant.id}
                  onClick={() => {
                    setPatientWalletInput(pAddr);
                    handleAccessPatientByWallet(pAddr, grant.patientName, grant.modules);
                  }}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-purple-950/30 border-purple-500"
                      : "bg-slate-950 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {grant.patientName || "Authorized Patient"}
                      </p>
                      <p className="text-[11px] font-mono text-cyan-400">
                        {pAddr.slice(0, 10)}...{pAddr.slice(-8)}
                      </p>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-medium">Authorized</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {grant.modules.map((m) => (
                      <span
                        key={m}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 uppercase"
                      >
                        {m}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Expires {new Date(grant.expiry).toLocaleDateString()}</span>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${grant.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-cyan-400 hover:underline font-mono flex items-center gap-1"
                    >
                      <span>Tx: {grant.txHash.slice(0, 10)}...</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Patient Wallet Lookup */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Wallet className="w-4 h-4 text-purple-400" />
          Access Patient by Wallet Address
        </h3>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Enter patient Ethereum wallet address (0x...)"
              value={patientWalletInput}
              onChange={(e) => setPatientWalletInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500 placeholder-slate-600"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-colors flex items-center justify-center space-x-1.5 shrink-0 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{searching ? "Approving..." : "Approve & Access"}</span>
          </button>
        </form>

        {lastAccessTx && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <BellRing className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>{lastAccessTx.action}</strong> logged (Block #{lastAccessTx.blockNumber})
                &amp; patient notified.
              </span>
            </div>
            <a
              href={lastAccessTx.sepoliaEtherscanUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-cyan-400 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Tx: {lastAccessTx.txHash.slice(0, 14)}...</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {resolvedPatient && (
          <div className="mt-3 p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
            <div>
              <p className="font-semibold text-white">{resolvedPatient.name}</p>
              <p className="text-slate-400 font-mono text-[11px]">{resolvedPatient.address}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {resolvedPatient.grantedModules.map((m) => (
                <span
                  key={m}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 uppercase"
                >
                  {m}
                </span>
              ))}
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Patient Vitals, Reports & Clinical Note */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Vitals */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Patient Vitals
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400">Pulse Rate</span>
                <p className="text-lg font-bold text-rose-400 mt-0.5">
                  {currentReading.heartRate}{" "}
                  <span className="text-xs font-normal text-slate-400">BPM</span>
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400">SpO2</span>
                <p className="text-lg font-bold text-cyan-400 mt-0.5">
                  {currentReading.spo2}{" "}
                  <span className="text-xs font-normal text-slate-400">%</span>
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400">Blood Pressure</span>
                <p className="text-lg font-bold text-amber-400 mt-0.5">
                  {currentReading.systolicBP}/{currentReading.diastolicBP}{" "}
                  <span className="text-xs font-normal text-slate-400">mmHg</span>
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400">Resp. Rate</span>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">
                  {currentReading.respiratoryRate}{" "}
                  <span className="text-xs font-normal text-slate-400">br/min</span>
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400">Temperature</span>
                <p className="text-lg font-bold text-orange-400 mt-0.5">
                  {currentReading.temperature}{" "}
                  <span className="text-xs font-normal text-slate-400">°C</span>
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400">Glucose</span>
                <p className="text-lg font-bold text-purple-400 mt-0.5">
                  {currentReading.glucose}{" "}
                  <span className="text-xs font-normal text-slate-400">mg/dL</span>
                </p>
              </div>
            </div>
          </div>

          {/* Patient Reports */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-purple-400" />
              Patient Reports (PDF / DOCX) ({patientRecords.length})
            </h3>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {patientRecords.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No reports found for this patient wallet.
                </p>
              ) : (
                patientRecords.map((r) => {
                  const isDocx =
                    r.isWordDoc || (r.fileName && /\.(docx?|doc)$/i.test(r.fileName));
                  return (
                    <div
                      key={r.id}
                      className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-100 truncate">{r.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                            {isDocx ? "DOCX" : r.recordType}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400 font-mono">
                          <span>IPFS: {r.ipfsHash.slice(0, 18)}...</span>
                          <span>Block #{r.blockNumber}</span>
                          {r.fileSize && <span>{r.fileSize}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleViewReport(r)}
                          disabled={actionLoadingId !== null}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{actionLoadingId === `view-${r.id}` ? "Signing..." : "View"}</span>
                        </button>
                        <button
                          onClick={() => handleDownloadReport(r)}
                          disabled={actionLoadingId !== null}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center gap-1.5 disabled:opacity-50"
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

        {/* Clinical Note Entry */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-fit">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <ClipboardPen className="w-4 h-4 text-purple-400" />
            Add Clinical Note
          </h3>

          <form onSubmit={handleAddClinicalNote} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Topic</label>
              <input
                type="text"
                placeholder="e.g. Holter Review"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
              <textarea
                rows={5}
                placeholder="Enter physician observations..."
                value={clinicalNote}
                onChange={(e) => setClinicalNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingNote}
              className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmittingNote ? "Committing..." : "Sign & Commit Note"}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Report Viewer Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-5 shadow-xl space-y-4">
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

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-1.5 text-xs">
              <p className="text-slate-400 font-medium text-[11px]">Clinical Notes</p>
              <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                {viewingRecord.notes || "No text summary attached. Download the file to inspect."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] font-mono">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-0.5">IPFS CIDv1</span>
                <span className="text-cyan-400 break-all">{viewingRecord.ipfsHash}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-0.5">SHA-256</span>
                <span className="text-emerald-400 break-all">{viewingRecord.checksum}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Sepolia Tx</span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${viewingRecord.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 hover:underline break-all"
                >
                  {viewingRecord.txHash}
                </a>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-0.5">File</span>
                <span className="text-slate-200">
                  {viewingRecord.fileName || "Clinical Metadata"} ({viewingRecord.fileSize})
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadReport(viewingRecord)}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
