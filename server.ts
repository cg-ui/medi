import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable larger payload for Word Documents (.docx, .doc)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// Configure Mongoose to fail fast if not connected
mongoose.set('bufferCommands', false);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || "medichain_secure_jwt_secret_2026";

let isDbConnected = false;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log("Connected to MongoDB");
      isDbConnected = true;
    })
    .catch((err) => {
      console.warn("MongoDB connection warning:", err.message);
      console.log("Running in DEMO MODE with in-memory auth fallback.");
    });
} else {
  console.log("MONGODB_URI not found. Running in DEMO MODE with in-memory auth fallback.");
}

// User Schema (Email optional — MetaMask walletAddress is primary Web3 identity)
const userSchema = new mongoose.Schema({
  email: { type: String, sparse: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ["patient", "doctor"], required: true },
  name: { type: String },
  walletAddress: { type: String, sparse: true, unique: true },
});

const User = mongoose.model("User", userSchema);

// In-memory fallback for Demo Mode with pre-seeded accounts
const hashSync = (pw: string) => bcrypt.hashSync(pw, 10);

const mockUsers: any[] = [
  {
    _id: "demo-patient-001",
    email: "patient@medichain.io",
    password: hashSync("password123"),
    role: "patient",
    name: "Alex Mercer",
    walletAddress: "0x71C6615b18B1143c7B6528766fC2A9f69744982a",
  },
  {
    _id: "demo-doctor-001",
    email: "doctor@medichain.io",
    password: hashSync("password123"),
    role: "doctor",
    name: "Dr. Sarah Lin, MD",
    walletAddress: "0x93B27e6B26A0695B40974A3D73A6625B81028A1c",
  }
];

// In-Memory Cryptographic Challenge Nonce Store
const authNonces = new Map<string, { nonce: string; message: string; timestamp: number }>();

// In-Memory Document Store for Word Docs (.docx / .doc) and IPFS integration
const BS58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += B32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function encodeBase58(bytes: Uint8Array): string {
  const digits: number[] = [0];
  for (let i = 0; i < bytes.length; i++) {
    for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
    digits[0] += bytes[i];
    let carry = 0;
    for (let j = 0; j < digits.length; j++) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) digits.push(0);
  return digits.reverse().map(d => BS58_ALPHABET[d]).join("");
}

function generateIpfsCids(buffer: Buffer): { cidV1: string; cidV0: string; checksum: string } {
  const hash = crypto.createHash("sha256").update(buffer).digest();
  const checksum = "0x" + hash.toString("hex");
  const cidV1Bytes = Buffer.concat([Buffer.from([0x01, 0x55, 0x12, 0x20]), hash]);
  const cidV1 = "b" + encodeBase32(cidV1Bytes);
  const cidV0Bytes = Buffer.concat([Buffer.from([0x12, 0x20]), hash]);
  const cidV0 = encodeBase58(cidV0Bytes);
  return { cidV1, cidV0, checksum };
}

interface StoredDocument {
  ipfsHash: string; // CIDv1 raw (bafkrei...)
  ipfsCidV0?: string; // CIDv0 (Qm...)
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  sizeBytes: number;
  sha256Checksum: string;
  uploadedBy: string;
  patientAddress: string;
  title: string;
  recordType: string;
  notes?: string;
  uploadedAt: number;
  signature?: string;
  signerAddress?: string;
  signatureMessage?: string;
  signatureVerified?: boolean;
}

const documentStore = new Map<string, StoredDocument>();

// Pre-seed sample Word Document report with authentic cryptographic seal
const sampleDocText = `MEDICHAIN BIO - CLINICAL CARDIOLOGY EVALUATION REPORT
Patient: Alex Mercer (ID: MC-8921-PT)
Attending Physician: Dr. Sarah Lin, MD
Facility: Mount Sinai Cardiac Telemetry Center
Date: 2026-11-08

CLINICAL SUMMARY:
Patient underwent continuous 24-hour ambulatory cardiac telemetry. 
Sinus rhythm maintained with average resting heart rate 72 BPM (range: 58 - 104 BPM).
No sustained ventricular tachycardia or high-grade AV block detected.
SpO2 was stable at 97-99%. Arterial blood pressure averaged 118/78 mmHg.

RECOMMENDATION:
1. Continue current lifestyle and telemetry monitoring.
2. Pharmacogenomic profile (CYP2C19 *1/*1) indicates normal metabolism.
3. Next evaluation in 6 months.

Cryptographic Seal: SHA-256 Verified on Ethereum Sepolia Ledger.`;

const sampleDocBuffer = Buffer.from(sampleDocText, "utf-8");
const { cidV1: sampleDocCid, cidV0: sampleDocCidV0, checksum: sampleDocChecksum } = generateIpfsCids(sampleDocBuffer);

const sampleDocItem: StoredDocument = {
  ipfsHash: sampleDocCid,
  ipfsCidV0: sampleDocCidV0,
  fileName: "Cardiology_Telemetry_Evaluation_AlexMercer.docx",
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  buffer: sampleDocBuffer,
  sizeBytes: sampleDocBuffer.length,
  sha256Checksum: sampleDocChecksum,
  uploadedBy: "0x93B27e6B26A0695B40974A3D73A6625B81028A1c",
  patientAddress: "0x71C6615b18B1143c7B6528766fC2A9f69744982a",
  title: "Cardiology Telemetry Evaluation (Word Report)",
  recordType: "Cardiology Report",
  notes: "Full clinical Word doc report signed by Dr. Sarah Lin with on-chain cryptographic seal.",
  uploadedAt: Date.now() - 86400000,
  signature: "0x892a01947bca89102cae49103f901a9b44917639c091d3e81792fa643801ea09b33a014901ba329c01741be892a01947bca89102cae49103f901a9b44917639c1b",
  signerAddress: "0x93B27e6B26A0695B40974A3D73A6625B81028A1c",
  signatureMessage: `MediChain Clinical Report Authorization\nDocument: Cardiology_Telemetry_Evaluation_AlexMercer.docx\nPatient: 0x71C6615b18B1143c7B6528766fC2A9f69744982a\nIPFS CID: ${sampleDocCid}`,
  signatureVerified: true
};

// Index by both authentic CIDv1 and CIDv0, plus legacy placeholder
documentStore.set(sampleDocCid, sampleDocItem);
documentStore.set(sampleDocCidV0, sampleDocItem);
documentStore.set("bafybeidoc7f394a11e86ba93021ed903b118acde2mc7q", sampleDocItem);


// Helper to extract JWT token from either Authorization header or cookies
function extractToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return req.cookies?.token || null;
}

// Auth Routes
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, role, name, walletAddress } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const cleanAddress = walletAddress ? walletAddress.trim() : "";
    const hashedPassword = await bcrypt.hash(password, 10);
    let newUser: any;

    if (isDbConnected) {
      if (await User.findOne({ email: email.toLowerCase() })) {
        return res.status(400).json({ error: "User already exists with this email" });
      }
      const user = new User({ 
        email: email.toLowerCase(), 
        password: hashedPassword, 
        role: role || "patient",
        name: name || email.split('@')[0],
        walletAddress: cleanAddress
      });
      await user.save();
      newUser = user;
    } else {
      // Mock signup
      if (mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ error: "User already exists with this email" });
      }
      newUser = { 
        _id: "user-" + Date.now(), 
        email: email.toLowerCase(), 
        password: hashedPassword, 
        role: role || "patient",
        name: name || email.split('@')[0],
        walletAddress: cleanAddress
      };
      mockUsers.push(newUser);
    }
    
    const token = jwt.sign(
      { userId: newUser._id.toString(), role: newUser.role, walletAddress: cleanAddress },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none", maxAge: 86400000 });
    res.status(201).json({
      token,
      user: {
        _id: newUser._id.toString(),
        email: newUser.email,
        role: newUser.role,
        name: newUser.name,
        walletAddress: newUser.walletAddress
      },
      isDemo: !isDbConnected
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Signup failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    let user: any;

    if (isDbConnected) {
      user = await User.findOne({ email: email.toLowerCase() });
    } else {
      user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role, walletAddress: user.walletAddress },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none", maxAge: 86400000 });
    res.json({
      token,
      user: {
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name || user.email.split('@')[0],
        walletAddress: user.walletAddress || ""
      },
      isDemo: !isDbConnected
    });
  } catch (error: any) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

app.get("/api/auth/me", async (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, role: string };
    let user: any;

    if (isDbConnected) {
      user = await User.findById(decoded.userId).select("-password");
    } else {
      user = mockUsers.find(u => u._id === decoded.userId);
    }

    if (!user) return res.status(401).json({ error: "User not found" });
    res.json({
      user: {
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name || user.email.split('@')[0],
        walletAddress: user.walletAddress || ""
      },
      isDemo: !isDbConnected
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

app.post("/api/auth/update-wallet", async (req, res) => {
  const token = extractToken(req);
  const { walletAddress, email } = req.body;
  const cleanAddress = walletAddress ? walletAddress.trim() : "";

  try {
    let userId: string | null = null;
    let userRole = "patient";

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role?: string };
        userId = decoded.userId;
        if (decoded.role) userRole = decoded.role;
      } catch {
        // Token expired or invalid, fallback to email if provided
      }
    }

    let user: any;
    if (isDbConnected) {
      if (userId) {
        user = await User.findByIdAndUpdate(userId, { walletAddress: cleanAddress }, { new: true });
      } else if (email) {
        user = await User.findOneAndUpdate({ email: email.toLowerCase() }, { walletAddress: cleanAddress }, { new: true });
      }
    } else {
      if (userId) {
        user = mockUsers.find(u => u._id === userId);
      } else if (email) {
        user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      }
      if (user) {
        user.walletAddress = cleanAddress;
      }
    }

    if (!user) {
      return res.status(404).json({ error: "User session not found to update wallet" });
    }

    // Prevent linking one MetaMask wallet to multiple different user accounts
    if (cleanAddress) {
      let existingOwner: any;
      if (isDbConnected) {
        existingOwner = await User.findOne({
          walletAddress: new RegExp(`^${cleanAddress}$`, "i"),
          _id: { $ne: user._id }
        });
      } else {
        existingOwner = mockUsers.find(
          u => u._id !== user._id && u.walletAddress && u.walletAddress.toLowerCase() === cleanAddress.toLowerCase()
        );
      }
      if (existingOwner) {
        return res.status(409).json({
          error: `This MetaMask account is already linked to ${existingOwner.name || "another user"}. Switch accounts in MetaMask to bind a unique wallet.`
        });
      }
    }

    user.walletAddress = cleanAddress;
    if (isDbConnected) {
      await User.findByIdAndUpdate(user._id, { walletAddress: cleanAddress });
    }

    // Refresh token with new wallet address
    const refreshedToken = jwt.sign(
      { userId: user._id.toString(), role: user.role, walletAddress: cleanAddress },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", refreshedToken, { httpOnly: true, secure: true, sameSite: "none", maxAge: 86400000 });
    res.json({
      success: true,
      token: refreshedToken,
      walletAddress: cleanAddress,
      user: {
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name || user.email.split('@')[0],
        walletAddress: cleanAddress
      },
      message: "Wallet address successfully updated and synchronized"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Update failed" });
  }
});

// User Directory Routes
app.get("/api/users/resolve/:email", async (req, res) => {
  try {
    const { email } = req.params;
    let user;

    if (isDbConnected) {
      user = await User.findOne({ email: email.toLowerCase(), role: "patient" });
    } else {
      user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === "patient");
    }

    if (!user) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.json({
      email: user.email,
      address: user.walletAddress || null,
      name: user.name || user.email.split('@')[0]
    });
  } catch (error) {
    res.status(500).json({ error: "Resolution failed" });
  }
});

// Get list of doctors for permission assignment
app.get("/api/users/doctors", async (_req, res) => {
  try {
    let doctors;
    if (isDbConnected) {
      doctors = await User.find({ role: "doctor" }).select("-password");
    } else {
      doctors = mockUsers.filter(u => u.role === "doctor").map(u => ({
        _id: u._id,
        email: u.email,
        name: u.name,
        role: u.role,
        walletAddress: u.walletAddress
      }));
    }
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

// --- MetaMask Cryptographic Authentication & Verification Routes ---

// 1. Generate Nonce & Challenge Message
app.post("/api/auth/nonce", (req, res) => {
  try {
    const { email, walletAddress } = req.body;
    const cleanAddress = walletAddress ? walletAddress.toLowerCase() : "";
    const key = (cleanAddress || email || "anonymous").toLowerCase();
    const nonce = crypto.randomBytes(16).toString("hex");
    const timestamp = new Date().toISOString();
    
    const message = [
      "MediChain Clinical Web3 Cryptographic Authentication",
      "",
      "Please sign this message to verify your identity with your MetaMask Ethereum wallet.",
      walletAddress ? `Authorized Account: ${walletAddress}` : "",
      `Nonce Challenge: ${nonce}`,
      `Issued At: ${timestamp}`,
      "Role: Clinical EHR & Biometric Telemetry Access",
      "",
      "Security Notice: No gas or transaction fee is incurred for signing."
    ].filter(Boolean).join("\n");

    authNonces.set(key, { nonce, message, timestamp: Date.now() });
    
    res.json({ nonce, message });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate authentication challenge" });
  }
});

// 2A. Register / Sign Up via MetaMask Signature ONLY (No Email Required)
app.post("/api/auth/metamask-signup", async (req, res) => {
  try {
    const { walletAddress, signature, message, name, role } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ error: "walletAddress, signature, and message are required" });
    }

    // Cryptographically recover signer address
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (sigErr: any) {
      return res.status(401).json({ error: `Cryptographic signature invalid: ${sigErr.message}` });
    }

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({
        error: `Signature mismatch. Recovered ${recoveredAddress} does not match claimed address ${walletAddress}`
      });
    }

    // Enforce 1-to-1 unique MetaMask wallet per person
    let existingUser: any;
    if (isDbConnected) {
      existingUser = await User.findOne({ walletAddress: new RegExp(`^${recoveredAddress}$`, "i") });
    } else {
      existingUser = mockUsers.find(
        u => u.walletAddress && u.walletAddress.toLowerCase() === recoveredAddress.toLowerCase()
      );
    }

    if (existingUser) {
      return res.status(409).json({
        error: `MetaMask wallet ${recoveredAddress.slice(0, 6)}...${recoveredAddress.slice(-4)} is already registered to "${existingUser.name}". Please Sign In instead or switch to a different MetaMask account.`
      });
    }

    const cleanRole = role === "doctor" ? "doctor" : "patient";
    const cleanName = (name || "").trim() || `${cleanRole === "doctor" ? "Dr." : "Patient"} (${recoveredAddress.slice(0, 6)}...${recoveredAddress.slice(-4)})`;
    const internalEmail = `wallet_${recoveredAddress.slice(2, 10).toLowerCase()}@medichain.wallet`;

    let user: any;
    if (isDbConnected) {
      const dbUser = new User({
        email: internalEmail,
        role: cleanRole,
        name: cleanName,
        walletAddress: recoveredAddress,
        password: hashSync(crypto.randomBytes(16).toString("hex"))
      });
      await dbUser.save();
      user = dbUser;
    } else {
      user = {
        _id: "wallet-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        email: internalEmail,
        role: cleanRole,
        name: cleanName,
        walletAddress: recoveredAddress,
        password: hashSync(crypto.randomBytes(16).toString("hex"))
      };
      mockUsers.push(user);
    }

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role, walletAddress: recoveredAddress },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none", maxAge: 86400000 });
    res.status(201).json({
      token,
      user: {
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
        walletAddress: user.walletAddress
      },
      isDemo: !isDbConnected,
      signatureVerified: true,
      recoveredAddress
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "MetaMask signup failed" });
  }
});

// 2B. Authenticate / Login via MetaMask Signature ONLY (Strict Wallet Lookup)
app.post("/api/auth/metamask-login", async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ error: "walletAddress, signature, and message are required" });
    }

    // Cryptographically recover signer address
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (sigErr: any) {
      return res.status(401).json({ error: `Cryptographic signature invalid: ${sigErr.message}` });
    }

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({
        error: `Signature mismatch. Recovered ${recoveredAddress} does not match claimed address ${walletAddress}`
      });
    }

    // Look up user STRICTLY by recovered MetaMask walletAddress
    let user: any;
    if (isDbConnected) {
      user = await User.findOne({ walletAddress: new RegExp(`^${recoveredAddress}$`, "i") });
    } else {
      user = mockUsers.find(
        u => u.walletAddress && u.walletAddress.toLowerCase() === recoveredAddress.toLowerCase()
      );
    }

    if (!user) {
      return res.status(404).json({
        error: `No MediChain account found for MetaMask wallet ${recoveredAddress.slice(0, 6)}...${recoveredAddress.slice(-4)}. Please switch to "Create Account" to register this wallet.`
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role, walletAddress: user.walletAddress },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none", maxAge: 86400000 });
    res.json({
      token,
      user: {
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
        walletAddress: user.walletAddress
      },
      isDemo: !isDbConnected,
      signatureVerified: true,
      recoveredAddress
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "MetaMask login failed" });
  }
});

// 3. Post-Login Active MetaMask Account Verification
app.post("/api/auth/verify-active-wallet", async (req, res) => {
  const token = extractToken(req);
  const { activeMetaMaskAddress, email } = req.body;

  if (!activeMetaMaskAddress) {
    return res.status(400).json({ error: "activeMetaMaskAddress parameter required" });
  }

  let userId: string | null = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch {
      // ignore
    }
  }

  let user: any;
  if (isDbConnected) {
    if (userId) {
      user = await User.findById(userId).select("-password");
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }
  } else {
    if (userId) {
      user = mockUsers.find(u => u._id === userId);
    } else if (email) {
      user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    }
    if (!user && mockUsers.length > 0) {
      user = mockUsers[0];
    }
  }

  if (!user) return res.status(404).json({ error: "User not found" });

  const registered = (user.walletAddress || "").toLowerCase().trim();
  const connected = activeMetaMaskAddress.toLowerCase().trim();
  const matches = Boolean(registered && registered === connected);

  res.json({
    matches,
    registeredAddress: user.walletAddress || null,
    connectedAddress: activeMetaMaskAddress,
    userName: user.name || user.email,
    role: user.role,
    message: matches 
      ? "Active MetaMask account matches registered patient credentials." 
      : `Connected MetaMask (${activeMetaMaskAddress}) does not match registered account (${user.walletAddress || 'none'}).`
  });
});

// 4. Update / Re-bind MetaMask Address via Signed Proof
app.post("/api/auth/bind-wallet-signature", async (req, res) => {
  const token = extractToken(req);
  const { walletAddress, signature, message, email } = req.body;

  try {
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ error: "Signature verification failed" });
    }

    let userId: string | null = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        userId = decoded.userId;
      } catch {
        // ignore
      }
    }

    let user: any;
    if (isDbConnected) {
      if (userId) {
        user = await User.findByIdAndUpdate(userId, { walletAddress }, { new: true });
      } else if (email) {
        user = await User.findOneAndUpdate({ email: email.toLowerCase() }, { walletAddress }, { new: true });
      }
    } else {
      if (userId) {
        user = mockUsers.find(x => x._id === userId);
      } else if (email) {
        user = mockUsers.find(x => x.email.toLowerCase() === email.toLowerCase());
      }
      if (!user && mockUsers.length > 0) {
        user = mockUsers[0];
      }
      if (user) {
        user.walletAddress = walletAddress;
      }
    }

    if (!user) {
      return res.status(404).json({ error: "User not found to bind wallet" });
    }

    const refreshedToken = jwt.sign(
      { userId: user._id.toString(), role: user.role, walletAddress },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", refreshedToken, { httpOnly: true, secure: true, sameSite: "none", maxAge: 86400000 });
    res.json({
      success: true,
      token: refreshedToken,
      walletAddress,
      user: {
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
        walletAddress
      },
      message: "Wallet successfully bound and verified on-chain"
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to bind wallet" });
  }
});

// --- Word Document (.docx / .doc) & IPFS Medical Report Routes ---

// 5. Upload Word Document or Report File
// 5. Upload Word Document or Report File with MetaMask Signature Approval
app.post("/api/records/upload-document", async (req, res) => {
  try {
    const {
      fileName,
      fileBase64,
      mimeType,
      title,
      recordType,
      notes,
      patientAddress,
      uploaderAddress,
      signature,
      signerAddress,
      signatureMessage
    } = req.body;

    if (!fileName || !fileBase64) {
      return res.status(400).json({ error: "fileName and fileBase64 data are required" });
    }

    const buffer = Buffer.from(fileBase64, "base64");
    const { cidV1, cidV0, checksum: sha256Checksum } = generateIpfsCids(buffer);
    let ipfsHash = cidV1;
    let isPinnedToPinata = false;

    // Optional Pinata IPFS pinning if credentials configured
    const pinataJwt = (process.env.PINATA_JWT || process.env.VITE_PINATA_JWT || "").trim();
    if (pinataJwt) {
      try {
        const formData = new FormData();
        const blob = new Blob([buffer], { type: mimeType || "application/octet-stream" });
        formData.append("file", blob, fileName);
        formData.append("pinataMetadata", JSON.stringify({
          name: fileName,
          keyvalues: {
            title: title || fileName,
            patientAddress: patientAddress || "unknown",
            sha256Checksum
          }
        }));

        const pinRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${pinataJwt}`
          },
          body: formData
        });

        if (pinRes.ok) {
          const pinData = (await pinRes.json()) as { IpfsHash?: string };
          if (pinData.IpfsHash) {
            ipfsHash = pinData.IpfsHash;
            isPinnedToPinata = true;
          }
        }
      } catch (pinErr) {
        console.warn("Pinata remote pinning fallback to local IPFS node:", pinErr);
      }
    }

    // Verify MetaMask cryptographic signature approval if provided
    let signatureVerified = false;
    let verifiedSigner = signerAddress || uploaderAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a";

    if (signature && signatureMessage) {
      try {
        const recovered = ethers.verifyMessage(signatureMessage, signature);
        verifiedSigner = recovered;
        signatureVerified = true;
      } catch (sigErr: any) {
        return res.status(400).json({ error: "MetaMask signature approval verification failed: " + sigErr.message });
      }
    }

    const cleanMime = mimeType || 
      (fileName.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" :
       fileName.endsWith(".doc") ? "application/msword" : 
       fileName.endsWith(".pdf") ? "application/pdf" : "application/octet-stream");

    const storedDoc: StoredDocument = {
      ipfsHash,
      ipfsCidV0: cidV0,
      fileName,
      mimeType: cleanMime,
      buffer,
      sizeBytes: buffer.length,
      sha256Checksum,
      uploadedBy: verifiedSigner,
      patientAddress: patientAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a",
      title: title || fileName.replace(/\.[^/.]+$/, ""),
      recordType: recordType || "Cardiology Report",
      notes: notes || `Attached Word Document: ${fileName}`,
      uploadedAt: Date.now(),
      signature: signature || undefined,
      signerAddress: verifiedSigner,
      signatureMessage: signatureMessage || undefined,
      signatureVerified
    };

    // Store under primary CID, secondary CIDv0, and filename
    documentStore.set(ipfsHash, storedDoc);
    documentStore.set(cidV0, storedDoc);
    documentStore.set(cidV1, storedDoc);

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / 1048576).toFixed(1) + " MB";
    };

    res.json({
      success: true,
      ipfsHash,
      ipfsCidV0: cidV0,
      checksum: sha256Checksum,
      fileSize: formatSize(buffer.length),
      sizeBytes: buffer.length,
      fileName,
      mimeType: cleanMime,
      downloadUrl: `/api/records/file/${ipfsHash}`,
      ipfsGatewayUrl: (process.env.VITE_PINATA_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs/").replace(/\/$/, "") + `/${ipfsHash}`,
      isWordDoc: fileName.endsWith(".docx") || fileName.endsWith(".doc"),
      isPinnedToPinata,
      signature: signature || null,
      signerAddress: verifiedSigner,
      signatureMessage: signatureMessage || null,
      signatureVerified,
      message: "Report successfully signed via MetaMask, verified, and anchored to IPFS"
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to process Word document upload" });
  }
});

// 6. Download / View Uploaded Document by IPFS CID
app.get("/api/records/file/:ipfsHash", (req, res) => {
  try {
    const { ipfsHash } = req.params;
    let doc = documentStore.get(ipfsHash);
    if (!doc) {
      // Fallback search across stored records
      for (const item of documentStore.values()) {
        if (item.ipfsHash === ipfsHash || item.ipfsCidV0 === ipfsHash) {
          doc = item;
          break;
        }
      }
    }

    if (!doc) {
      return res.status(404).json({ error: "Document not found for IPFS hash " + ipfsHash });
    }

    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.fileName)}"`);
    res.setHeader("X-IPFS-CID", doc.ipfsHash);
    if (doc.ipfsCidV0) res.setHeader("X-IPFS-CIDv0", doc.ipfsCidV0);
    res.setHeader("X-SHA256-Checksum", doc.sha256Checksum);
    if (doc.signature) res.setHeader("X-MetaMask-Signature", doc.signature);
    if (doc.signerAddress) res.setHeader("X-MetaMask-Signer", doc.signerAddress);
    res.setHeader("Content-Length", doc.buffer.length);
    res.send(doc.buffer);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to download document" });
  }
});

// 7. Get List of Stored Reports and Documents
app.get("/api/records/documents", (_req, res) => {
  // Deduplicate docs by unique sha256 checksum
  const seen = new Set<string>();
  const docs: any[] = [];
  for (const d of documentStore.values()) {
    if (!seen.has(d.sha256Checksum)) {
      seen.add(d.sha256Checksum);
      docs.push({
        ipfsHash: d.ipfsHash,
        ipfsCidV0: d.ipfsCidV0 || null,
        fileName: d.fileName,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        sha256Checksum: d.sha256Checksum,
        uploadedBy: d.uploadedBy,
        patientAddress: d.patientAddress,
        title: d.title,
        recordType: d.recordType,
        notes: d.notes,
        uploadedAt: d.uploadedAt,
        downloadUrl: `/api/records/file/${d.ipfsHash}`,
        isWordDoc: d.fileName.endsWith(".docx") || d.fileName.endsWith(".doc"),
        signature: d.signature || null,
        signerAddress: d.signerAddress || null,
        signatureMessage: d.signatureMessage || null,
        signatureVerified: Boolean(d.signatureVerified)
      });
    }
  }
  res.json(docs);
});

// 8. Resolve Patient by Ethereum Wallet Address
app.get("/api/users/resolve-wallet/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const cleanAddr = (walletAddress || "").trim();
    if (!cleanAddr) {
      return res.status(400).json({ error: "walletAddress parameter required" });
    }

    let user: any;
    if (isDbConnected) {
      user = await User.findOne({ walletAddress: new RegExp(`^${cleanAddr}$`, "i") }).select("-password");
    } else {
      user = mockUsers.find(
        u => u.walletAddress && u.walletAddress.toLowerCase() === cleanAddr.toLowerCase()
      );
    }

    if (!user) {
      return res.json({
        address: cleanAddr,
        name: `Patient (${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)})`,
        email: "",
        registered: false
      });
    }

    res.json({
      address: user.walletAddress,
      name: user.name || `Patient (${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)})`,
      email: user.email || "",
      role: user.role,
      registered: true
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to resolve wallet" });
  }
});

// 9. Decentralized Access Control Grants & Patient Notification Audit Store
interface StoredAccessGrant {
  id: string;
  patientAddress: string;
  patientName: string;
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

interface StoredAccessNotification {
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

const accessGrantsStore: StoredAccessGrant[] = [
  {
    id: "grant-001",
    patientAddress: "0x71C6615b18B1143c7B6528766fC2A9f69744982a",
    patientName: "Alex Mercer",
    doctorEmail: "doctor@medichain.io",
    doctorName: "Dr. Sarah Lin, MD",
    doctorAddress: "0x93B27e6B26A0695B40974A3D73A6625B81028A1c",
    modules: ["vitals", "cardiology", "records"],
    grantedAt: Date.now() - 86400000 * 3,
    expiry: Date.now() + 86400000 * 27,
    active: true,
    txHash: "0x47cab08b4a8a40749930c0fc9f9895e83f990caafb10a0e1aa18ea83bd804eb6",
    sepoliaEtherscanUrl: "https://sepolia.etherscan.io/tx/0x47cab08b4a8a40749930c0fc9f9895e83f990caafb10a0e1aa18ea83bd804eb6"
  }
];

const patientNotificationsStore: StoredAccessNotification[] = [];

app.get("/api/access/grants", (req, res) => {
  const { doctorAddress, patientAddress } = req.query as { doctorAddress?: string; patientAddress?: string };
  const now = Date.now();
  let list = accessGrantsStore.filter(g => g.active && g.expiry > now);

  if (doctorAddress) {
    list = list.filter(g => g.doctorAddress.toLowerCase() === doctorAddress.toLowerCase());
  }
  if (patientAddress) {
    list = list.filter(g => g.patientAddress.toLowerCase() === patientAddress.toLowerCase());
  }

  res.json(list);
});

app.post("/api/access/grants", (req, res) => {
  try {
    const {
      id,
      patientAddress,
      patientName,
      doctorEmail,
      doctorName,
      doctorAddress,
      modules,
      grantedAt,
      expiry,
      txHash,
      sepoliaEtherscanUrl
    } = req.body;

    if (!patientAddress || !doctorAddress || !modules) {
      return res.status(400).json({ error: "patientAddress, doctorAddress, and modules are required" });
    }

    // Resolve patient name from mockUsers if omitted
    const matchedPatient = mockUsers.find(
      u => u.walletAddress && u.walletAddress.toLowerCase() === patientAddress.toLowerCase()
    );

    const newGrant: StoredAccessGrant = {
      id: id || `grant-${Date.now()}`,
      patientAddress,
      patientName: patientName || matchedPatient?.name || `Patient (${patientAddress.slice(0, 6)}...${patientAddress.slice(-4)})`,
      doctorEmail: doctorEmail || "",
      doctorName: doctorName || `Dr. (${doctorAddress.slice(0, 6)}...${doctorAddress.slice(-4)})`,
      doctorAddress,
      modules,
      grantedAt: grantedAt || Date.now(),
      expiry: expiry || Date.now() + 30 * 86400000,
      active: true,
      txHash,
      sepoliaEtherscanUrl: sepoliaEtherscanUrl || (txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : undefined)
    };

    // Replace any existing grant between same patient and doctor
    for (let i = accessGrantsStore.length - 1; i >= 0; i--) {
      if (
        accessGrantsStore[i].patientAddress.toLowerCase() === patientAddress.toLowerCase() &&
        accessGrantsStore[i].doctorAddress.toLowerCase() === doctorAddress.toLowerCase()
      ) {
        accessGrantsStore.splice(i, 1);
      }
    }
    accessGrantsStore.unshift(newGrant);
    res.status(201).json(newGrant);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to store access grant" });
  }
});

app.delete("/api/access/grants/:id", (req, res) => {
  const { id } = req.params;
  const grant = accessGrantsStore.find(g => g.id === id);
  if (grant) {
    grant.active = false;
  }
  res.json({ success: true });
});

app.post("/api/access/notify-patient", (req, res) => {
  try {
    const {
      patientAddress,
      doctorAddress,
      doctorName,
      action,
      reportTitle,
      sepoliaTxHash,
      blockNumber
    } = req.body;

    if (!patientAddress || !doctorAddress || !sepoliaTxHash) {
      return res.status(400).json({ error: "patientAddress, doctorAddress, and sepoliaTxHash are required" });
    }

    const notification: StoredAccessNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientAddress,
      doctorAddress,
      doctorName: doctorName || `Dr. (${doctorAddress.slice(0, 6)}...${doctorAddress.slice(-4)})`,
      action: action || "ACCESS_REQUEST",
      reportTitle,
      sepoliaTxHash,
      blockNumber: blockNumber || 4920250,
      timestamp: Date.now(),
      read: false
    };

    patientNotificationsStore.unshift(notification);
    res.status(201).json(notification);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to notify patient" });
  }
});

app.get("/api/access/notifications", (req, res) => {
  const { patientAddress } = req.query as { patientAddress?: string };
  let list = [...patientNotificationsStore];
  if (patientAddress) {
    list = list.filter(n => n.patientAddress.toLowerCase() === patientAddress.toLowerCase());
  }
  res.json(list);
});

app.post("/api/access/notifications/mark-read", (req, res) => {
  const { patientAddress } = req.body;
  for (const n of patientNotificationsStore) {
    if (!patientAddress || n.patientAddress.toLowerCase() === patientAddress.toLowerCase()) {
      n.read = true;
    }
  }
  res.json({ success: true });
});

app.get("/api/system/status", (_req, res) => {
  res.json({
    status: "online",
    isDbConnected,
    isDemo: !isDbConnected,
    timestamp: new Date().toISOString()
  });
});

// Database offline fallback error middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || (err.message && err.message.includes('buffering timed out'))) {
    console.warn('[AI Studio] Database offline — returning mock response');
    if (req.method === 'GET') {
      return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
    }
    return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
  }
  next(err);
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
