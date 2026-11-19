import React, { useState, useEffect } from "react";
import {
  FileText,
  UploadCloud,
  ShieldCheck,
  ExternalLink,
  Hash,
  Search,
  X,
  Eye,
  Dna,
  HeartPulse,
  FlaskConical,
  Scan,
  Pill,
  Download,
  Paperclip,
  Check,
  Copy,
  KeyRound,
  Coins,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { blockchainService } from "../../services/blockchainService";
import { ipfsService } from "../../services/ipfsService";
import { userService } from "../../services/userService";
import { SepoliaFaucetModal } from "../Modals/SepoliaFaucetModal";
import { MedicalRecord } from "../../types";
import { toast } from "sonner";

export const Reports: React.FC = () => {
  const { walletAddress, activeMetaMaskAddress, user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [receiptRecord, setReceiptRecord] = useState<MedicalRecord | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [title, setTitle] = useState("");
  const [recordType, setRecordType] = useState<MedicalRecord["recordType"]>("Cardiology Report");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState<
    "idle" | "hashing" | "waiting_signature" | "uploading_ipfs" | "anchoring_eth"
  >("idle");
  const [verificationInput, setVerificationInput] = useState("");
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [useSepoliaGas, setUseSepoliaGas] = useState<boolean>(false);
  const [isFaucetOpen, setIsFaucetOpen] = useState<boolean>(false);

  useEffect(() => {
    loadRecords();
  }, [walletAddress]);

  const loadRecords = async () => {
    const list = await blockchainService.getRecords(
      walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a"
    );
    setRecords(list);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
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
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const file = new File([blob], "Ambulatory_Cardiology_Telemetry_Report.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a record title");
      return;
    }

    setIsSubmitting(true);
    setUploadStep("hashing");

    try {
      const currentFileName =
        selectedFile?.name || `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.docx`;
      let currentBase64 = fileBase64;
      const isWordDoc = currentFileName.endsWith(".docx") || currentFileName.endsWith(".doc");
      const currentMime =
        selectedFile?.type ||
        (isWordDoc
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/octet-stream");

      if (!currentBase64) {
        const defaultReport = `MEDICHAIN BIO - CLINICAL REPORT
Title: ${title}
Record Type: ${recordType}
Patient: ${walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a"}
Date: ${new Date().toISOString()}
Clinical Notes: ${notes || "Verified by medical provider."}

Cryptographically signed via MetaMask & Anchored to Ethereum Sepolia.`;
        currentBase64 = btoa(unescape(encodeURIComponent(defaultReport)));
      }

      const binaryString = window.atob(currentBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const {
        cidV1: calculatedIpfsHash,
        cidV0: calculatedCidV0,
        checksum: calculatedChecksum,
      } = await ipfsService.computeFileCids(bytes.buffer);

      const uploader =
        activeMetaMaskAddress ||
        walletAddress ||
        user?.walletAddress ||
        "0x71C6615b18B1143c7B6528766fC2A9f69744982a";
      const patient = walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a";

      setUploadStep("waiting_signature");
      toast.info("Step 1/3: Requesting MetaMask signature approval for report upload...");

      const { signature, signerAddress, approvalMessage } =
        await blockchainService.signReportApprovalWithMetaMask({
          title,
          fileName: currentFileName,
          patientAddress: patient,
          recordType,
          checksum: calculatedChecksum,
          ipfsHash: calculatedIpfsHash,
          uploaderAddress: uploader,
        });

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
        notes:
          notes ||
          `Cryptographically approved by ${signerAddress.slice(0, 6)}...${signerAddress.slice(-4)}.`,
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

      toast.success(
        `Report verified with MetaMask and anchored to IPFS & Ethereum Block #${newRec.blockNumber}!`
      );
      setIsUploadOpen(false);
      setTitle("");
      setNotes("");
      setSelectedFile(null);
      setFileBase64("");
      setReceiptRecord(newRec);
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

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ipfsHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.checksum && r.checksum.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.signature && r.signature.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.fileName && r.fileName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter =
      filterType === "all" ||
      (filterType === "wordDocs" ? r.isWordDoc : r.recordType === filterType);
    return matchesSearch && matchesFilter;
  });

  const getRecordIcon = (type: MedicalRecord["recordType"], isWordDoc?: boolean) => {
    if (isWordDoc) return <FileText className="w-4 h-4 text-blue-400" />;
    switch (type) {
      case "Cardiology Report":
        return <HeartPulse className="w-4 h-4 text-rose-400" />;
      case "Genomic Sequencing":
        return <Dna className="w-4 h-4 text-purple-400" />;
      case "Laboratory Panel":
        return <FlaskConical className="w-4 h-4 text-cyan-400" />;
      case "MRI / Imaging":
        return <Scan className="w-4 h-4 text-teal-400" />;
      case "Prescription":
        return <Pill className="w-4 h-4 text-amber-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div>
          <h2 className="text-sm font-bold text-white">Medical Reports &amp; IPFS Ledger</h2>
          <p className="text-xs text-slate-400">
            Upload reports with MetaMask signature approval, IPFS pinning, and Sepolia anchoring.
          </p>
        </div>

        <button
          onClick={() => {
            setIsUploadOpen(true);
            setSelectedFile(null);
            setFileBase64("");
          }}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center space-x-2 transition-colors self-start sm:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Report</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
          <input
            type="text"
            placeholder="Search title, IPFS CID, SHA-256..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto text-xs">
          {[
            { id: "all", label: "All" },
            { id: "wordDocs", label: "Word (.docx)" },
            { id: "Cardiology Report", label: "Cardiology" },
            { id: "Genomic Sequencing", label: "Genomic" },
            { id: "Laboratory Panel", label: "Lab" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-medium transition-colors ${
                filterType === tab.id
                  ? "bg-cyan-600 text-white"
                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
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
          <div className="col-span-full p-10 text-center bg-slate-900 rounded-xl border border-dashed border-slate-800">
            <p className="text-slate-400 text-xs">
              No medical records found. Upload a report to pin it to IPFS.
            </p>
          </div>
        ) : (
          filteredRecords.map((rec) => (
            <div
              key={rec.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    {getRecordIcon(rec.recordType, rec.isWordDoc)}
                    <span className="text-[11px] text-slate-400 truncate">
                      {rec.isWordDoc ? "Word Document" : rec.recordType}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    Block #{rec.blockNumber}
                  </span>
                </div>

                <h3 className="font-semibold text-sm text-white mt-2.5 line-clamp-1">
                  {rec.title}
                </h3>

                {rec.fileName && (
                  <p className="text-[11px] font-mono text-blue-300 flex items-center gap-1 mt-1 truncate">
                    <Paperclip className="w-3 h-3 shrink-0" />
                    <span>{rec.fileName}</span>
                  </p>
                )}

                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{rec.notes}</p>

                {/* Clean Hashes Summary */}
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">IPFS</span>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-cyan-400 truncate max-w-[150px]">{rec.ipfsHash}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(rec.ipfsHash, "IPFS CID");
                        }}
                        className="text-slate-500 hover:text-white"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">SHA-256</span>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-amber-300 truncate max-w-[150px]">
                        {rec.checksum}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(rec.checksum, "SHA-256 Checksum");
                        }}
                        className="text-slate-500 hover:text-white"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {rec.signature && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Sig</span>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-purple-300 truncate max-w-[150px]">
                          {rec.signature}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(rec.signature!, "MetaMask Signature");
                          }}
                          className="text-slate-500 hover:text-white"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Tx</span>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-emerald-400 truncate max-w-[150px]">{rec.txHash}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(rec.txHash, "Tx Hash");
                        }}
                        className="text-slate-500 hover:text-white"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">{rec.fileSize}</span>

                <div className="flex items-center space-x-1.5">
                  {rec.downloadUrl && (
                    <a
                      href={rec.downloadUrl}
                      download={rec.fileName || "report.docx"}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-blue-300 flex items-center space-x-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setSelectedRecord(rec);
                      setVerificationInput("");
                      setVerificationResult(null);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center space-x-1"
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

      {/* Post-Upload Receipt Dialog */}
      {receiptRecord && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-5 shadow-xl relative">
            <button
              onClick={() => setReceiptRecord(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2.5 mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">Report Anchored to IPFS &amp; Sepolia</h3>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              {receiptRecord.fileName || receiptRecord.title} (Block #{receiptRecord.blockNumber})
            </p>

            <div className="space-y-3 bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs">
              <div>
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans mb-1">
                  <span>IPFS CIDv1</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://ipfs.io/ipfs/${receiptRecord.ipfsHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <span>Gateway</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => copyToClipboard(receiptRecord.ipfsHash, "IPFS CID")}
                      className="text-cyan-400 hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="text-cyan-300 break-all">{receiptRecord.ipfsHash}</div>
              </div>

              <div>
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans mb-1">
                  <span>SHA-256 Checksum</span>
                  <button
                    onClick={() => copyToClipboard(receiptRecord.checksum, "SHA-256 Checksum")}
                    className="text-amber-400 hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <div className="text-amber-300 break-all">{receiptRecord.checksum}</div>
              </div>

              {receiptRecord.signature && (
                <div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans mb-1">
                    <span>MetaMask Signature</span>
                    <button
                      onClick={() => copyToClipboard(receiptRecord.signature!, "MetaMask Signature")}
                      className="text-purple-400 hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="text-purple-300 break-all">{receiptRecord.signature}</div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans mb-1">
                  <span>Ethereum Tx Hash</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={
                        receiptRecord.sepoliaEtherscanUrl ||
                        `https://sepolia.etherscan.io/tx/${receiptRecord.txHash}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <span>Etherscan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => copyToClipboard(receiptRecord.txHash, "Tx Hash")}
                      className="text-emerald-400 hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="text-emerald-300 break-all">{receiptRecord.txHash}</div>
                {receiptRecord.ipfsCidV0 && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    CIDv0: {receiptRecord.ipfsCidV0}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              {receiptRecord.downloadUrl && (
                <a
                  href={receiptRecord.downloadUrl}
                  download={receiptRecord.fileName || "clinical_report.docx"}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              )}
              <button
                onClick={() => setReceiptRecord(null)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg ml-auto"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-5 shadow-xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="font-bold text-white text-base">{selectedRecord.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedRecord.recordType} • Block #{selectedRecord.blockNumber} •{" "}
                {new Date(selectedRecord.timestamp).toLocaleString()}
              </p>
            </div>

            <div className="space-y-2.5 bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono">
              {selectedRecord.fileName && (
                <div>
                  <span className="text-slate-500 block text-[11px] font-sans">File</span>
                  <span className="text-white">
                    {selectedRecord.fileName} ({selectedRecord.fileSize})
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between font-sans text-[11px] text-slate-500">
                  <span>IPFS CIDv1</span>
                  <button
                    onClick={() => copyToClipboard(selectedRecord.ipfsHash, "IPFS CID")}
                    className="text-cyan-400 hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <span className="text-cyan-400 break-all">{selectedRecord.ipfsHash}</span>
              </div>

              <div>
                <div className="flex items-center justify-between font-sans text-[11px] text-slate-500">
                  <span>SHA-256 Checksum</span>
                  <button
                    onClick={() => copyToClipboard(selectedRecord.checksum, "SHA-256 Checksum")}
                    className="text-amber-400 hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <span className="text-amber-400 break-all">{selectedRecord.checksum}</span>
              </div>

              {selectedRecord.signature && (
                <div>
                  <div className="flex items-center justify-between font-sans text-[11px] text-slate-500">
                    <span>MetaMask Signature</span>
                    <button
                      onClick={() =>
                        copyToClipboard(selectedRecord.signature!, "MetaMask Signature")
                      }
                      className="text-purple-400 hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <span className="text-purple-300 break-all">{selectedRecord.signature}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between font-sans text-[11px] text-slate-500">
                  <span>Ethereum Tx Hash</span>
                  <button
                    onClick={() => copyToClipboard(selectedRecord.txHash, "Tx Hash")}
                    className="text-emerald-400 hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <span className="text-emerald-400 break-all">{selectedRecord.txHash}</span>
              </div>
            </div>

            {/* Checksum Verifier */}
            <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-cyan-400" />
                Verify SHA-256 Checksum
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste SHA-256 checksum..."
                  value={verificationInput}
                  onChange={(e) => setVerificationInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => handleVerify(selectedRecord.id)}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium"
                >
                  Verify
                </button>
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setVerificationInput(selectedRecord.checksum)}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Auto-fill recorded hash
                </button>
                {verificationResult !== null && (
                  <span
                    className={`text-[11px] font-semibold ${
                      verificationResult ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {verificationResult ? "Verified Match" : "Mismatch"}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              {selectedRecord.downloadUrl ? (
                <a
                  href={selectedRecord.downloadUrl}
                  download={selectedRecord.fileName || "medical_report.docx"}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-medium rounded-lg flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </a>
              ) : (
                <span className="text-xs text-slate-500">Metadata record</span>
              )}
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-white text-base mb-1">Upload Medical Report</h3>
            <p className="text-xs text-slate-400 mb-4">
              Select a Word (.docx/.doc) or PDF file, approve with MetaMask, and pin to IPFS.
            </p>

            {isSubmitting && (
              <div className="p-3 bg-slate-950 rounded-lg border border-cyan-800 mb-4 text-xs text-cyan-300 flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>
                  {uploadStep === "hashing" && "Hashing file..."}
                  {uploadStep === "waiting_signature" && "Waiting for MetaMask signature..."}
                  {uploadStep === "uploading_ipfs" && "Pinning to IPFS..."}
                  {uploadStep === "anchoring_eth" && "Anchoring to Ethereum Sepolia..."}
                </span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Document (.docx / .doc / .pdf)
                  </label>
                  <button
                    type="button"
                    onClick={generateSampleWordDoc}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Use Sample .docx
                  </button>
                </div>

                <div className="border border-dashed border-slate-700 hover:border-cyan-500 rounded-lg p-4 bg-slate-950 text-center transition-colors">
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
                        <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                        <p className="text-xs font-medium text-white truncate max-w-xs mx-auto">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-300 py-2">
                        Click to choose a .docx, .doc, or .pdf file
                      </p>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Ambulatory Holter ECG Evaluation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Cardiology Report">Cardiology Report</option>
                  <option value="Genomic Sequencing">Genomic Sequencing</option>
                  <option value="Laboratory Panel">Laboratory Panel</option>
                  <option value="MRI / Imaging">MRI / Imaging</option>
                  <option value="Prescription">Prescription</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
                <textarea
                  rows={3}
                  placeholder="Summary findings..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <label className="flex items-center space-x-2 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    checked={useSepoliaGas}
                    onChange={(e) => setUseSepoliaGas(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-cyan-500"
                  />
                  <span>Broadcast real Sepolia tx</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsFaucetOpen(true)}
                  className="text-amber-300 hover:underline flex items-center space-x-1 text-[11px]"
                >
                  <Coins className="w-3 h-3" />
                  <span>Get Sepolia ETH</span>
                </button>
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Processing..." : "Sign & Upload"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SepoliaFaucetModal
        isOpen={isFaucetOpen}
        onClose={() => setIsFaucetOpen(false)}
        walletAddress={activeMetaMaskAddress || walletAddress}
      />
    </div>
  );
};
