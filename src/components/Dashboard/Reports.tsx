import React, { useState, useEffect } from "react";
import { 
  FileText, 
  UploadCloud, 
  ShieldCheck, 
  ExternalLink, 
  Hash, 
  Search, 
  Filter, 
  CheckCircle2, 
  X, 
  Clock, 
  Lock, 
  Eye, 
  Dna, 
  HeartPulse, 
  FlaskConical, 
  Scan, 
  Pill,
  Download,
  FileCode,
  Paperclip,
  Check,
  FileSpreadsheet,
  AlertCircle,
  Copy,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  Coins
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { blockchainService } from "../../services/blockchainService";
import { ipfsService } from "../../services/ipfsService";
import { userService } from "../../services/userService";
import { SepoliaFaucetModal } from "../Modals/SepoliaFaucetModal";
import { MedicalRecord } from "../../types";
import { toast } from "sonner";

export const Reports: React.FC = () => {
  const { walletAddress, activeMetaMaskAddress, isMetaMaskAvailable, user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [receiptRecord, setReceiptRecord] = useState<MedicalRecord | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Form states for adding new record / word doc
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [title, setTitle] = useState("");
  const [recordType, setRecordType] = useState<MedicalRecord["recordType"]>("Cardiology Report");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState<"idle" | "hashing" | "waiting_signature" | "uploading_ipfs" | "anchoring_eth">("idle");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [verificationInput, setVerificationInput] = useState("");
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [useSepoliaGas, setUseSepoliaGas] = useState<boolean>(false);
  const [isFaucetOpen, setIsFaucetOpen] = useState<boolean>(false);

  useEffect(() => {
    loadRecords();
  }, [walletAddress]);

  const loadRecords = async () => {
    const list = await blockchainService.getRecords(walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a");
    setRecords(list);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedHash(label);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || result;
      setFileBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const generateSampleWordDoc = () => {
    const sampleText = `MEDICHAIN BIO - CLINICAL CARDIOLOGY EVALUATION REPORT
Patient: Alex Mercer (ID: MC-8921-PT)
Attending Physician: Dr. Sarah Lin, MD
Facility: Mount Sinai Cardiac Telemetry Center
Date: ${new Date().toISOString().split("T")[0]}

DIAGNOSTIC FINDINGS:
1. Continuous 24-hour ambulatory cardiac telemetry shows normal sinus rhythm.
2. Average resting heart rate: 72 BPM (nocturnal low 58 BPM, exertion peak 108 BPM).
3. Oxygen saturation baseline: 98% SpO2.
4. Arterial blood pressure: 118/78 mmHg.
5. Pharmacogenomic profile indicates standard response to cardiovascular medication.

SEALED VIA ETHEREUM SMART CONTRACT & DECENTRALIZED IPFS PINNING.`;

    const blob = new Blob([sampleText], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
    const file = new File([blob], "Ambulatory_Cardiology_Telemetry_Report.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });

    setSelectedFile(file);
    setTitle("Ambulatory Cardiology Telemetry Report");
    setRecordType("Cardiology Report");
    setNotes("Word Document (.docx) evaluation report with 24-hr telemetry findings.");

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFileBase64(result.split(",")[1] || result);
    };
    reader.readAsDataURL(file);

    toast.info("Created sample Word Document (.docx) ready to sign with MetaMask!");
  };

  /**
   * Primary Report Upload Flow with Mandatory MetaMask Signature Approval & IPFS Storage
   */
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a record title");
      return;
    }

    setIsSubmitting(true);
    setUploadStep("hashing");

    try {
      // 1. Prepare file payload or metadata
      let currentFileName = selectedFile?.name || `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.docx`;
      let currentBase64 = fileBase64;
      let isWordDoc = currentFileName.endsWith(".docx") || currentFileName.endsWith(".doc");
      let currentMime = selectedFile?.type || (isWordDoc ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/octet-stream");

      if (!currentBase64) {
        // Fallback default clinical note report
        const defaultReport = `MEDICHAIN BIO - CLINICAL REPORT
Title: ${title}
Record Type: ${recordType}
Patient: ${walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a"}
Date: ${new Date().toISOString()}
Clinical Notes: ${notes || "Verified by medical provider."}

Cryptographically signed via MetaMask & Anchored to Ethereum Sepolia.`;
        currentBase64 = btoa(unescape(encodeURIComponent(defaultReport)));
      }

      // 2. Pre-calculate authentic SHA-256 Checksum, IPFS CIDv1 (bafkrei...), and CIDv0 (Qm...)
      const binaryString = window.atob(currentBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const { cidV1: calculatedIpfsHash, cidV0: calculatedCidV0, checksum: calculatedChecksum } =
        await ipfsService.computeFileCids(bytes.buffer);

      const uploader = activeMetaMaskAddress || walletAddress || user?.walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a";
      const patient = walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a";

      // 3. Request Cryptographic Signature Approval from MetaMask
      setUploadStep("waiting_signature");
      toast.info("Step 1/3: Requesting MetaMask signature approval for report upload...");

      const { signature, signerAddress, approvalMessage } = await blockchainService.signReportApprovalWithMetaMask({
        title,
        fileName: currentFileName,
        patientAddress: patient,
        recordType,
        checksum: calculatedChecksum,
        ipfsHash: calculatedIpfsHash,
        uploaderAddress: uploader,
      });

      // 4. Send Payload + Cryptographic Signature to Backend for Verification & IPFS Pinning
      setUploadStep("uploading_ipfs");
      toast.info("Step 2/3: Signature approved! Uploading and pinning document to IPFS...");

      const docRes = await userService.uploadDocumentReport({
        fileName: currentFileName,
        fileBase64: currentBase64,
        mimeType: currentMime,
        title,
        recordType,
        notes,
        patientAddress: patient,
        uploaderAddress: signerAddress,
        signature,
        signerAddress,
        signatureMessage: approvalMessage,
      });

      // 5. Anchor Cryptographic Digest, IPFS CID, and MetaMask Signature to Smart Contract Ledger
      setUploadStep("anchoring_eth");
      toast.info("Step 3/3: Anchoring cryptographic digest to Ethereum ledger...");

      let moduleCategory: MedicalRecord["moduleCategory"] = "records";
      if (recordType === "Cardiology Report") moduleCategory = "cardiology";
      else if (recordType === "Genomic Sequencing") moduleCategory = "genomic";
      else if (recordType === "Laboratory Panel") moduleCategory = "vitals";
      else if (recordType === "Prescription") moduleCategory = "prescriptions";

      const newRec = await blockchainService.addRecord({
        patientAddress: patient,
        title,
        recordType,
        ipfsHash: docRes.ipfsHash,
        ipfsCidV0: docRes.ipfsCidV0 || calculatedCidV0,
        checksum: docRes.checksum,
        uploader: signerAddress,
        fileSize: docRes.fileSize,
        notes: notes || `Cryptographically approved by ${signerAddress.slice(0, 6)}...${signerAddress.slice(-4)}.`,
        moduleCategory,
        fileName: currentFileName,
        isWordDoc,
        downloadUrl: docRes.downloadUrl,
        mimeType: currentMime,
        signature: docRes.signature || signature,
        signerAddress,
        signatureMessage: approvalMessage,
        signatureVerified: true,
        useSepoliaGas,
      });

      toast.success(`Report verified with MetaMask and anchored to IPFS & Ethereum Block #${newRec.blockNumber}!`);
      setIsUploadOpen(false);
      setTitle("");
      setNotes("");
      setSelectedFile(null);
      setFileBase64("");
      setReceiptRecord(newRec); // Open cryptographic receipt showing all 4 hashes!
      loadRecords();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete report upload & signature approval");
    } finally {
      setIsSubmitting(false);
      setUploadStep("idle");
    }
  };

  const handleVerify = (recordId: string) => {
    if (!verificationInput.trim()) {
      toast.error("Enter a SHA-256 checksum to verify");
      return;
    }
    const isValid = blockchainService.verifyChecksum(recordId, verificationInput);
    setVerificationResult(isValid);
    if (isValid) {
      toast.success("Checksum verified! Data matches the on-chain seal.");
    } else {
      toast.error("Checksum mismatch! Data may have been altered.");
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.ipfsHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.checksum && r.checksum.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (r.signature && r.signature.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (r.fileName && r.fileName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === "all" || 
                          (filterType === "wordDocs" ? r.isWordDoc : r.recordType === filterType);
    return matchesSearch && matchesFilter;
  });

  const getRecordIcon = (type: MedicalRecord["recordType"], isWordDoc?: boolean) => {
    if (isWordDoc) {
      return (
        <div className="relative">
          <FileText className="w-5 h-5 text-blue-400" />
          <span className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-blue-600 text-white px-1 rounded">W</span>
        </div>
      );
    }
    switch (type) {
      case "Cardiology Report": return <HeartPulse className="w-5 h-5 text-rose-400" />;
      case "Genomic Sequencing": return <Dna className="w-5 h-5 text-purple-400" />;
      case "Laboratory Panel": return <FlaskConical className="w-5 h-5 text-cyan-400" />;
      case "MRI / Imaging": return <Scan className="w-5 h-5 text-teal-400" />;
      case "Prescription": return <Pill className="w-5 h-5 text-amber-400" />;
      default: return <FileText className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            MetaMask-Signed Medical Reports & IPFS Decentralized Ledger
          </h2>
          <p className="text-xs text-slate-400">
            Every clinical report requires MetaMask cryptographic signature approval, pins to IPFS, and commits SHA-256 digests to Ethereum.
          </p>
        </div>

        <button
          onClick={() => {
            setIsUploadOpen(true);
            setSelectedFile(null);
            setFileBase64("");
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-cyan-600/20 flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload & Sign with MetaMask</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search title, IPFS CID, SHA-256, or signature..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {[
            { id: "all", label: "All Records" },
            { id: "wordDocs", label: "Word Docs (.docx)" },
            { id: "Cardiology Report", label: "Cardiology" },
            { id: "Genomic Sequencing", label: "Genomic" },
            { id: "Laboratory Panel", label: "Laboratory" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition-all font-medium ${
                filterType === tab.id
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecords.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm font-medium">No medical records match your criteria.</p>
            <p className="text-slate-600 text-xs mt-1">Upload a Word document report with MetaMask signature approval.</p>
          </div>
        ) : (
          filteredRecords.map((rec) => (
            <div
              key={rec.id}
              className={`bg-slate-900/80 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group ${
                rec.isWordDoc 
                  ? "border-blue-900/70 hover:border-blue-600/80 hover:shadow-blue-500/10" 
                  : "border-slate-800 hover:border-slate-700 hover:shadow-cyan-500/5"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-xl bg-slate-950 border ${
                    rec.isWordDoc ? "border-blue-800/80 text-blue-400" : "border-slate-800"
                  }`}>
                    {getRecordIcon(rec.recordType, rec.isWordDoc)}
                  </div>
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 justify-end">
                    {rec.isWordDoc && (
                      <span className="text-[10px] font-bold text-blue-300 bg-blue-950/90 px-2 py-0.5 rounded-full border border-blue-800/80">
                        DOCX
                      </span>
                    )}
                    <span className="flex items-center text-[10px] font-semibold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-800/60" title="Signed with MetaMask">
                      <KeyRound className="w-3 h-3 mr-1 text-purple-400" />
                      MetaMask Approved
                    </span>
                    <span className="flex items-center text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      IPFS Pin
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-sm text-white mt-3 line-clamp-1 group-hover:text-cyan-400 transition-colors">
                  {rec.title}
                </h3>

                {rec.fileName && (
                  <p className="text-[11px] font-mono text-blue-300/90 flex items-center gap-1 mt-1 truncate">
                    <Paperclip className="w-3 h-3 shrink-0" />
                    <span>{rec.fileName}</span>
                  </p>
                )}

                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {rec.notes}
                </p>

                {/* Hashes Display Section on Card */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-[11px]">
                  {/* IPFS CIDv1 Hash */}
                  <div className="flex items-center justify-between gap-1 bg-slate-950/70 px-2 py-1.5 rounded-lg border border-slate-800/80">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-cyan-400 shrink-0">IPFS CID:</span>
                      <span className="font-mono text-cyan-300 text-[10px] truncate max-w-[130px] sm:max-w-[170px]">
                        {rec.ipfsHash}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(rec.ipfsHash, "IPFS CID"); }}
                      className="p-1 hover:text-cyan-400 text-slate-500 rounded transition-colors"
                      title="Copy IPFS CID"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  {/* SHA-256 Checksum Hash */}
                  <div className="flex items-center justify-between gap-1 bg-slate-950/70 px-2 py-1.5 rounded-lg border border-slate-800/80">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-amber-400 shrink-0">SHA-256:</span>
                      <span className="font-mono text-amber-300 text-[10px] truncate max-w-[130px] sm:max-w-[170px]">
                        {rec.checksum}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(rec.checksum, "SHA-256 Checksum"); }}
                      className="p-1 hover:text-amber-400 text-slate-500 rounded transition-colors"
                      title="Copy SHA-256 Checksum"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  {/* MetaMask Signature Approval Hash */}
                  {rec.signature && (
                    <div className="flex items-center justify-between gap-1 bg-slate-950/70 px-2 py-1.5 rounded-lg border border-slate-800/80">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="text-[10px] uppercase font-bold text-purple-400 shrink-0 flex items-center gap-0.5">
                          <KeyRound className="w-2.5 h-2.5 text-purple-400" /> Sig:
                        </span>
                        <span className="font-mono text-purple-300 text-[10px] truncate max-w-[130px] sm:max-w-[170px]">
                          {rec.signature}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(rec.signature!, "MetaMask Signature"); }}
                        className="p-1 hover:text-purple-400 text-slate-500 rounded transition-colors"
                        title="Copy MetaMask Signature"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Ethereum Transaction Hash */}
                  <div className="flex items-center justify-between gap-1 text-slate-400 text-[10px] px-1">
                    <span>Block #{rec.blockNumber} • Tx:</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-mono text-emerald-400 truncate max-w-[110px]">{rec.txHash}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(rec.txHash, "Tx Hash"); }}
                        className="p-0.5 hover:text-emerald-400 text-slate-500"
                        title="Copy Tx Hash"
                      >
                        <Copy className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500 font-mono">Size: {rec.fileSize}</span>

                <div className="flex items-center space-x-1.5">
                  {rec.downloadUrl ? (
                    <a
                      href={rec.downloadUrl}
                      download={rec.fileName || "report.docx"}
                      className="px-2.5 py-1.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-800/80 text-xs font-semibold text-blue-200 flex items-center space-x-1 transition-colors"
                      title="Download original document file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  ) : null}

                  <button
                    onClick={() => {
                      setSelectedRecord(rec);
                      setVerificationInput("");
                      setVerificationResult(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center space-x-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Post-Upload Cryptographic Proof & Hashes Receipt Dialog */}
      {receiptRecord && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-800/90 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setReceiptRecord(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-cyan-950 border border-cyan-700 rounded-xl text-cyan-400">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  Cryptographic Attestation Receipt
                </span>
                <h3 className="font-bold text-white text-lg">
                  MetaMask Signature Approved & Anchored to IPFS
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Your clinical report <strong className="text-white font-mono">{receiptRecord.fileName || receiptRecord.title}</strong> has been signed with your MetaMask Ethereum private key, pinned to IPFS, and permanently anchored on Ethereum Sepolia.
            </p>

            {/* Hashes Showcase Cards */}
            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs">
              {/* 1. IPFS CID Hash */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-sans font-bold">
                  <span className="text-cyan-400 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> 1. IPFS Content Identifier (CIDv1)
                  </span>
                  <button
                    onClick={() => copyToClipboard(receiptRecord.ipfsHash, "IPFS CID")}
                    className="hover:text-cyan-300 flex items-center gap-1 font-mono text-[11px]"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy CID</span>
                  </button>
                </div>
                <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-cyan-300 break-all select-all flex items-center justify-between gap-2">
                  <span>{receiptRecord.ipfsHash}</span>
                  <a
                    href={`https://ipfs.io/ipfs/${receiptRecord.ipfsHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1 hover:text-cyan-400 text-slate-500"
                    title="Open on IPFS Gateway"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* 2. SHA-256 Checksum Hash */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-sans font-bold">
                  <span className="text-amber-400 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> 2. SHA-256 Document Checksum
                  </span>
                  <button
                    onClick={() => copyToClipboard(receiptRecord.checksum, "SHA-256 Checksum")}
                    className="hover:text-amber-300 flex items-center gap-1 font-mono text-[11px]"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Checksum</span>
                  </button>
                </div>
                <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-amber-300 break-all select-all">
                  {receiptRecord.checksum}
                </div>
              </div>

              {/* 3. MetaMask Approval Signature Hash */}
              {receiptRecord.signature && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-sans font-bold">
                    <span className="text-purple-400 flex items-center gap-1">
                      <KeyRound className="w-3 h-3" /> 3. MetaMask EIP-191 Signature Approval
                    </span>
                    <button
                      onClick={() => copyToClipboard(receiptRecord.signature!, "MetaMask Signature")}
                      className="hover:text-purple-300 flex items-center gap-1 font-mono text-[11px]"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Signature</span>
                    </button>
                  </div>
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-purple-300 break-all select-all">
                    {receiptRecord.signature}
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans">
                    Signed by Ethereum Account: <span className="font-mono text-white">{receiptRecord.signerAddress || receiptRecord.uploader}</span>
                  </p>
                </div>
              )}

              {/* 4. Ethereum Transaction Hash */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-sans font-bold">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> 4. Ethereum Transaction Hash (Block #{receiptRecord.blockNumber})
                  </span>
                  <div className="flex items-center space-x-3">
                    <a
                      href={receiptRecord.sepoliaEtherscanUrl || `https://sepolia.etherscan.io/tx/${receiptRecord.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-[11px]"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Sepolia Etherscan</span>
                    </a>
                    <button
                      onClick={() => copyToClipboard(receiptRecord.txHash, "Tx Hash")}
                      className="hover:text-emerald-300 flex items-center gap-1 font-mono text-[11px]"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Tx Hash</span>
                    </button>
                  </div>
                </div>
                <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-emerald-300 break-all select-all">
                  {receiptRecord.txHash}
                </div>
                {receiptRecord.ipfsCidV0 && (
                  <p className="text-[10px] text-slate-400 font-mono">
                    IPFS Legacy CIDv0: <span className="text-slate-300 select-all">{receiptRecord.ipfsCidV0}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              {receiptRecord.downloadUrl && (
                <a
                  href={receiptRecord.downloadUrl}
                  download={receiptRecord.fileName || "clinical_report.docx"}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-md shadow-blue-600/30 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Document</span>
                </a>
              )}
              <button
                onClick={() => setReceiptRecord(null)}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl ml-auto shadow-md shadow-cyan-600/20 transition-all"
              >
                Close & View Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                {getRecordIcon(selectedRecord.recordType, selectedRecord.isWordDoc)}
              </div>
              <div>
                <h3 className="font-bold text-white text-base">{selectedRecord.title}</h3>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xs text-cyan-400 font-medium">{selectedRecord.recordType}</span>
                  {selectedRecord.isWordDoc && (
                    <span className="text-[10px] font-bold text-blue-300 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">
                      Microsoft Word (.docx)
                    </span>
                  )}
                  {selectedRecord.signature && (
                    <span className="text-[10px] font-bold text-purple-300 bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800 flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-purple-400" /> MetaMask Approved
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cryptographic Hashes Detail Box */}
            <div className="space-y-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs font-mono">
              {selectedRecord.fileName && (
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-sans">Document File Name:</span>
                  <span className="text-white font-bold">{selectedRecord.fileName} ({selectedRecord.fileSize})</span>
                </div>
              )}
              
              {/* IPFS Hash */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[10px] uppercase font-sans">IPFS InterPlanetary Hash (CIDv1):</span>
                  <button
                    onClick={() => copyToClipboard(selectedRecord.ipfsHash, "IPFS CID")}
                    className="text-cyan-400 hover:underline text-[10px] font-sans flex items-center gap-1"
                  >
                    <Copy className="w-2.5 h-2.5" /> Copy
                  </button>
                </div>
                <span className="text-cyan-400 break-all">{selectedRecord.ipfsHash}</span>
              </div>

              {/* SHA-256 Checksum */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[10px] uppercase font-sans">On-Chain SHA-256 Checksum:</span>
                  <button
                    onClick={() => copyToClipboard(selectedRecord.checksum, "SHA-256 Checksum")}
                    className="text-amber-400 hover:underline text-[10px] font-sans flex items-center gap-1"
                  >
                    <Copy className="w-2.5 h-2.5" /> Copy
                  </button>
                </div>
                <span className="text-amber-400 break-all">{selectedRecord.checksum}</span>
              </div>

              {/* MetaMask Signature */}
              {selectedRecord.signature && (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px] uppercase font-sans">MetaMask Approval Signature (EIP-191):</span>
                    <button
                      onClick={() => copyToClipboard(selectedRecord.signature!, "MetaMask Signature")}
                      className="text-purple-400 hover:underline text-[10px] font-sans flex items-center gap-1"
                    >
                      <Copy className="w-2.5 h-2.5" /> Copy
                    </button>
                  </div>
                  <span className="text-purple-300 break-all">{selectedRecord.signature}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">
                    Signer: <span className="font-mono text-slate-200">{selectedRecord.signerAddress || selectedRecord.uploader}</span>
                  </span>
                </div>
              )}

              {/* Ethereum Tx Hash */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[10px] uppercase font-sans">Ethereum Transaction Hash:</span>
                  <button
                    onClick={() => copyToClipboard(selectedRecord.txHash, "Tx Hash")}
                    className="text-emerald-400 hover:underline text-[10px] font-sans flex items-center gap-1"
                  >
                    <Copy className="w-2.5 h-2.5" /> Copy
                  </button>
                </div>
                <span className="text-emerald-400 break-all">{selectedRecord.txHash}</span>
              </div>

              <div className="flex justify-between pt-1 text-[11px] font-sans">
                <span className="text-slate-400">Block #{selectedRecord.blockNumber}</span>
                <span className="text-slate-400">{new Date(selectedRecord.timestamp).toLocaleString()}</span>
              </div>
            </div>

            {/* Checksum Verification Box */}
            <div className="mt-4 p-3.5 bg-slate-950/40 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-cyan-400" />
                Cryptographic Hash & Integrity Verifier
              </h4>
              <p className="text-[11px] text-slate-400 mb-2">
                Verify that this clinical file matches the exact immutable SHA-256 checksum committed on Ethereum:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste SHA-256 (or click 'Auto-fill recorded hash')"
                  value={verificationInput}
                  onChange={(e) => setVerificationInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => handleVerify(selectedRecord.id)}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
                >
                  Verify
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => setVerificationInput(selectedRecord.checksum)}
                  className="text-[10px] text-cyan-400 hover:underline"
                >
                  Auto-fill recorded hash
                </button>
                {verificationResult !== null && (
                  <span className={`text-[10px] font-bold ${verificationResult ? "text-emerald-400" : "text-rose-400"}`}>
                    {verificationResult ? "VERIFIED VALID ON-CHAIN" : "CHECKSUM MISMATCH"}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              {selectedRecord.downloadUrl ? (
                <a
                  href={selectedRecord.downloadUrl}
                  download={selectedRecord.fileName || "medical_report.docx"}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-md shadow-blue-600/30"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Original Document</span>
                </a>
              ) : (
                <span className="text-xs text-slate-500">Metadata sealed</span>
              )}
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Word Document / Medical Report Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-white text-base flex items-center gap-2 mb-1">
              <UploadCloud className="w-5 h-5 text-cyan-400" />
              Upload Medical Report (MetaMask Signature Approval Required)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Select a Word Document (.docx, .doc) or report. Before storing to IPFS, you will be prompted to sign an on-chain authorization challenge with your Ethereum wallet.
            </p>

            {/* Upload Progress Stepper */}
            {isSubmitting && (
              <div className="p-3 bg-slate-950 rounded-xl border border-cyan-800/80 mb-4 space-y-2">
                <span className="text-xs font-bold text-cyan-300 block flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  {uploadStep === "hashing" && "Calculating SHA-256 Checksum & IPFS CID..."}
                  {uploadStep === "waiting_signature" && "Waiting for MetaMask Signature Approval..."}
                  {uploadStep === "uploading_ipfs" && "Signature verified! Storing to IPFS..."}
                  {uploadStep === "anchoring_eth" && "Anchoring cryptographic digest to Ethereum Sepolia..."}
                </span>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {uploadStep === "waiting_signature" 
                    ? "Please click 'Sign' in your MetaMask extension to approve this document." 
                    : "Cryptographically securing medical telemetry on decentralized nodes."}
                </p>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              {/* Word Document Upload Dropzone */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Select Word Document File (.docx / .doc)
                  </label>
                  <button
                    type="button"
                    onClick={generateSampleWordDoc}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Use Sample .docx Report</span>
                  </button>
                </div>

                <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-4 bg-slate-950/70 text-center transition-colors">
                  <input
                    type="file"
                    id="doc-upload-input"
                    accept=".doc,.docx,.pdf,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="doc-upload-input" className="cursor-pointer block">
                    {selectedFile ? (
                      <div className="space-y-1">
                        <div className="w-10 h-10 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800 flex items-center justify-center mx-auto mb-2">
                          <Check className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-white truncate max-w-xs mx-auto">{selectedFile.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || "Document"}
                        </p>
                        <span className="text-[10px] text-cyan-400 hover:underline block pt-1">
                          Click to change file
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1 py-2">
                        <FileText className="w-8 h-8 text-slate-500 mx-auto mb-1 group-hover:text-cyan-400" />
                        <p className="text-xs font-semibold text-slate-200">
                          Choose Microsoft Word Document (.docx, .doc) or PDF
                        </p>
                        <p className="text-[10px] text-slate-500">
                          File will be hashed, signed with MetaMask, and pinned to IPFS
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Report Title</label>
                <input
                  type="text"
                  placeholder="e.g. 24-Hour Ambulatory Holter ECG Evaluation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Cardiology Report">Cardiology Report</option>
                  <option value="Genomic Sequencing">Genomic Sequencing</option>
                  <option value="Laboratory Panel">Laboratory Panel</option>
                  <option value="MRI / Imaging">MRI / Imaging</option>
                  <option value="Prescription">Prescription</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Clinical Notes & Findings</label>
                <textarea
                  rows={3}
                  placeholder="Enter physician observations, summary findings, diagnostic impressions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* MetaMask Signature Approval & Sepolia Gas Options */}
              <div className="p-3 bg-purple-950/40 rounded-xl border border-purple-800/80 text-[11px] text-purple-200 space-y-2">
                <span className="font-semibold text-purple-300 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                  MetaMask Signature Approval & Sepolia Anchoring:
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Your Ethereum wallet will request an EIP-191 personal signature to authorize pinning this report to IPFS (authentic CIDv1/CIDv0) and anchoring its SHA-256 digest.
                </p>
                <div className="pt-1.5 border-t border-purple-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="flex items-center space-x-2 cursor-pointer text-slate-200 font-medium">
                    <input
                      type="checkbox"
                      checked={useSepoliaGas}
                      onChange={(e) => setUseSepoliaGas(e.target.checked)}
                      className="rounded border-purple-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span>Broadcast real Sepolia tx (uses Sepolia ETH gas)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsFaucetOpen(true)}
                    className="text-amber-300 hover:text-amber-200 font-semibold flex items-center space-x-1 text-[11px] underline"
                  >
                    <Coins className="w-3 h-3 text-amber-400" />
                    <span>Get Free Sepolia ETH</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{uploadStep === "waiting_signature" ? "Sign in MetaMask..." : "Processing & IPFS..."}</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Sign with MetaMask & Anchor to IPFS</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sepolia Faucet Hub Modal */}
      <SepoliaFaucetModal
        isOpen={isFaucetOpen}
        onClose={() => setIsFaucetOpen(false)}
        walletAddress={activeMetaMaskAddress || walletAddress}
      />
    </div>
  );
};
