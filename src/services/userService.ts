import { User } from "../types";

export interface LoginResponse {
  token?: string;
  user: User;
  isDemo?: boolean;
  signatureVerified?: boolean;
  recoveredAddress?: string;
}

export interface VerifyActiveWalletResponse {
  matches: boolean;
  registeredAddress: string | null;
  connectedAddress: string;
  userName: string;
  role: string;
  message: string;
}

export interface UploadDocumentResponse {
  success: boolean;
  ipfsHash: string; // CIDv1 raw
  ipfsCidV0?: string; // CIDv0
  checksum: string;
  fileSize: string;
  sizeBytes: number;
  fileName: string;
  mimeType: string;
  downloadUrl: string;
  ipfsGatewayUrl: string;
  isWordDoc: boolean;
  isPinnedToPinata?: boolean;
  signature?: string;
  signerAddress?: string;
  signatureMessage?: string;
  signatureVerified?: boolean;
  message: string;
}

export interface StoredDocumentMeta {
  ipfsHash: string;
  ipfsCidV0?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256Checksum: string;
  uploadedBy: string;
  patientAddress: string;
  title: string;
  recordType: string;
  notes?: string;
  uploadedAt: number;
  downloadUrl: string;
  isWordDoc: boolean;
  signature?: string;
  signerAddress?: string;
  signatureMessage?: string;
  signatureVerified?: boolean;
}

const TOKEN_KEY = "medichain_auth_token";

function getAuthHeaders(extra: Record<string, string> = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export const userService = {
  getStoredToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  async signup(data: { email: string; password: string; role: "patient" | "doctor"; name?: string; walletAddress?: string }) {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Signup failed");
    if (result.token) {
      localStorage.setItem(TOKEN_KEY, result.token);
    }
    return result as LoginResponse;
  },

  async login(data: { email: string; password: string }) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Login failed");
    if (result.token) {
      localStorage.setItem(TOKEN_KEY, result.token);
    }
    return result as LoginResponse;
  },

  async logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
    }
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    return res.json().catch(() => ({}));
  },

  async getCurrentUser() {
    const token = this.getStoredToken();
    const res = await fetch("/api/auth/me", {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data as { user: User; isDemo: boolean };
  },

  async updateWallet(walletAddress: string, email?: string) {
    const res = await fetch("/api/auth/update-wallet", {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ walletAddress, email }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to update wallet");
    if (result.token) {
      localStorage.setItem(TOKEN_KEY, result.token);
    }
    return result as { success: boolean; token?: string; walletAddress: string; user: User };
  },

  async getAuthNonce(email?: string, walletAddress?: string) {
    const res = await fetch("/api/auth/nonce", {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ email, walletAddress }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to generate challenge nonce");
    return data as { nonce: string; message: string };
  },

  async signupWithMetaMask(params: {
    walletAddress: string;
    signature: string;
    message: string;
    name: string;
    role: "patient" | "doctor";
  }) {
    const res = await fetch("/api/auth/metamask-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "MetaMask registration failed");
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }
    return data as LoginResponse;
  },

  async loginWithMetaMask(params: {
    walletAddress: string;
    signature: string;
    message: string;
  }) {
    const res = await fetch("/api/auth/metamask-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "MetaMask signature authentication failed");
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }
    return data as LoginResponse;
  },

  async verifyActiveWallet(activeMetaMaskAddress: string, email?: string) {
    const res = await fetch("/api/auth/verify-active-wallet", {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ activeMetaMaskAddress, email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to verify active wallet");
    return data as VerifyActiveWalletResponse;
  },

  async bindWalletSignature(params: {
    walletAddress: string;
    signature: string;
    message: string;
    email?: string;
  }) {
    const res = await fetch("/api/auth/bind-wallet-signature", {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to bind wallet signature");
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }
    return data;
  },

  async uploadDocumentReport(params: {
    fileName: string;
    fileBase64: string;
    mimeType?: string;
    title?: string;
    recordType?: string;
    notes?: string;
    patientAddress?: string;
    uploaderAddress?: string;
    signature?: string;
    signerAddress?: string;
    signatureMessage?: string;
  }) {
    const res = await fetch("/api/records/upload-document", {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to upload report file");
    return data as UploadDocumentResponse;
  },

  async getStoredDocuments() {
    const res = await fetch("/api/records/documents", {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (!res.ok) return [];
    return res.json() as Promise<StoredDocumentMeta[]>;
  },

  async resolvePatient(email: string) {
    const res = await fetch(`/api/users/resolve/${encodeURIComponent(email)}`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Patient not found" }));
      throw new Error(err.error || "Patient not found");
    }
    return res.json() as Promise<{ email: string; address: string | null; name: string }>;
  },

  async getDoctors() {
    const res = await fetch("/api/users/doctors", {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (!res.ok) return [];
    return res.json() as Promise<Array<{ _id: string; email: string; name: string; role: string; walletAddress?: string }>>;
  },

  async resolvePatientByWallet(walletAddress: string) {
    const res = await fetch(`/api/users/resolve-wallet/${encodeURIComponent(walletAddress)}`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to resolve wallet" }));
      throw new Error(err.error || "Failed to resolve wallet");
    }
    return res.json() as Promise<{ address: string; name: string; email: string; role?: string; registered: boolean }>;
  },

  async getAccessGrants(params?: { doctorAddress?: string; patientAddress?: string }) {
    const query = new URLSearchParams();
    if (params?.doctorAddress) query.set("doctorAddress", params.doctorAddress);
    if (params?.patientAddress) query.set("patientAddress", params.patientAddress);
    const qs = query.toString();
    const res = await fetch(`/api/access/grants${qs ? "?" + qs : ""}`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (!res.ok) return [];
    return res.json();
  },

  async createAccessGrant(grant: Record<string, any>) {
    const res = await fetch("/api/access/grants", {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(grant),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to store access grant");
    return data;
  },

  async revokeAccessGrant(grantId: string) {
    const res = await fetch(`/api/access/grants/${encodeURIComponent(grantId)}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    return res.json().catch(() => ({}));
  },

  async notifyPatientAccess(params: {
    patientAddress: string;
    doctorAddress: string;
    doctorName: string;
    action: "ACCESS_REQUEST" | "REPORT_VIEW" | "REPORT_DOWNLOAD";
    reportTitle?: string;
    sepoliaTxHash: string;
    blockNumber: number;
  }) {
    const res = await fetch("/api/access/notify-patient", {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(params),
    });
    return res.json().catch(() => ({}));
  },

  async getPatientNotifications(patientAddress?: string) {
    const qs = patientAddress ? `?patientAddress=${encodeURIComponent(patientAddress)}` : "";
    const res = await fetch(`/api/access/notifications${qs}`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (!res.ok) return [];
    return res.json();
  },

  async markNotificationsRead(patientAddress?: string) {
    const res = await fetch("/api/access/notifications/mark-read", {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ patientAddress }),
    });
    return res.json().catch(() => ({}));
  }
};
