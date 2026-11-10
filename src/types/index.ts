export type UserRole = "patient" | "doctor";

export interface User {
  _id: string;
  email: string;
  role: UserRole;
  name?: string;
  walletAddress?: string;
}

export interface MedicalRecord {
  id: string;
  patientAddress: string;
  title: string;
  recordType: "Cardiology Report" | "Genomic Sequencing" | "Laboratory Panel" | "MRI / Imaging" | "Prescription";
  ipfsHash: string; // CIDv1 raw
  ipfsCidV0?: string; // CIDv0
  checksum: string;
  timestamp: number;
  uploader: string;
  txHash: string;
  blockNumber: number;
  fileSize: string;
  notes?: string;
  verifiedOnChain: boolean;
  sepoliaEtherscanUrl?: string;
  moduleCategory: "vitals" | "genomic" | "cardiology" | "prescriptions" | "records";
  fileName?: string;
  isWordDoc?: boolean;
  downloadUrl?: string;
  mimeType?: string;
  signature?: string;
  signerAddress?: string;
  signatureMessage?: string;
  signatureVerified?: boolean;
}

export interface AccessGrant {
  id: string;
  patientAddress?: string;
  patientName?: string;
  doctorEmail: string;
  doctorName: string;
  doctorAddress: string;
  modules: string[];
  grantedAt: number;
  expiry: number;
  active: boolean;
  txHash: string;
  sepoliaEtherscanUrl?: string;
}

export interface PatientAccessNotification {
  id: string;
  patientAddress: string;
  doctorAddress: string;
  doctorName: string;
  action: "ACCESS_REQUEST" | "REPORT_VIEW" | "REPORT_DOWNLOAD";
  reportTitle?: string;
  sepoliaTxHash: string;
  blockNumber: number;
  timestamp: number;
  read: boolean;
}

export interface EmergencyAccessLog {
  id: string;
  patientAddress: string;
  responderAddress: string;
  responderName: string;
  reason: string;
  activatedAt: number;
  expiresAt: number;
  active: boolean;
  txHash: string;
}

export interface BiometricReading {
  timestamp: string;
  timeRaw: number;
  heartRate: number; // BPM
  spo2: number; // %
  systolicBP: number; // mmHg
  diastolicBP: number; // mmHg
  glucose: number; // mg/dL
  respiratoryRate: number; // breaths/min
  temperature: number; // °C
  hrv: number; // ms
  ecgSignal: number; // mV
}

export interface AISignalAlert {
  id: string;
  type: "warning" | "critical" | "info" | "normal";
  metric: string;
  message: string;
  recommendation: string;
  timestamp: string;
  severity: "high" | "medium" | "low";
  acknowledged: boolean;
}

export interface BlockchainTransaction {
  txHash: string;
  blockNumber: number;
  type: "RECORD_ADD" | "GRANT_ACCESS" | "REVOKE_ACCESS" | "RECORD_ACCESS" | "EMERGENCY_UNLOCK" | "EMERGENCY_REVOKE";
  from: string;
  to: string;
  timestamp: number;
  gasUsed: string;
  status: "confirmed" | "pending";
  details: string;
}
