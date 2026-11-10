import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { userService } from "../services/userService";
import { blockchainService } from "../services/blockchainService";
import { User, UserRole } from "../types";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  walletAddress: string;
  activeMetaMaskAddress: string | null;
  isWalletMismatched: boolean;
  isSignatureVerified: boolean;
  isMetaMaskAvailable: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { email: string; password: string; role: UserRole; name?: string; walletAddress?: string }) => Promise<void>;
  loginWithMetaMaskSignature: (customAddress?: string) => Promise<void>;
  logout: () => Promise<void>;
  connectWallet: () => Promise<string>;
  setWalletAddress: (addr: string) => void;
  switchDemoRole: (role: UserRole) => Promise<void>;
  verifyActiveMetaMaskAgainstCredentials: () => Promise<boolean>;
  rebindCurrentMetaMaskAddress: () => Promise<void>;
  syncActiveWalletToProfile: () => Promise<void>;
  dismissMismatchWarning: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [activeMetaMaskAddress, setActiveMetaMaskAddress] = useState<string | null>(null);
  const [isWalletMismatched, setIsWalletMismatched] = useState<boolean>(false);
  const [isSignatureVerified, setIsSignatureVerified] = useState<boolean>(false);
  const [warningDismissed, setWarningDismissed] = useState<boolean>(false);
  const isMetaMaskAvailable = blockchainService.isMetaMaskAvailable();

  // Initial session check
  useEffect(() => {
    checkCurrentUser();
  }, []);

  // Listen to MetaMask account changes in browser
  useEffect(() => {
    const checkActive = async () => {
      const active = await blockchainService.getActiveMetaMaskAccount();
      setActiveMetaMaskAddress(active);
    };
    checkActive();

    const unsubscribe = blockchainService.onAccountsChanged((accounts) => {
      if (accounts && accounts.length > 0) {
        const newAddr = accounts[0];
        setActiveMetaMaskAddress(newAddr);
        setWarningDismissed(false);
        toast.info(`MetaMask account switched to: ${newAddr.slice(0, 6)}...${newAddr.slice(-4)}`);
      } else {
        setActiveMetaMaskAddress(null);
        setIsWalletMismatched(false);
        toast.info("MetaMask disconnected");
      }
    });

    return () => unsubscribe();
  }, []);

  // Check mismatch between active MetaMask account and registered user wallet
  useEffect(() => {
    if (warningDismissed || !user || !user.walletAddress || !activeMetaMaskAddress) {
      setIsWalletMismatched(false);
      return;
    }
    const registered = user.walletAddress.toLowerCase().trim();
    const active = activeMetaMaskAddress.toLowerCase().trim();
    const mismatch = Boolean(registered && active && registered !== active);
    setIsWalletMismatched(mismatch);
    if (!mismatch && active) {
      setIsSignatureVerified(true);
    }
  }, [user, activeMetaMaskAddress, warningDismissed]);

  const checkCurrentUser = async () => {
    try {
      const result = await userService.getCurrentUser();
      if (result && result.user) {
        setUser(result.user);
        setIsDemo(result.isDemo);
        if (result.user.walletAddress) {
          setWalletAddress(result.user.walletAddress);
        }
      } else {
        setUser(null);
        setWalletAddress("");
      }
    } catch {
      setUser(null);
      setWalletAddress("");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await userService.login({ email, password });
      setIsDemo(!!res.isDemo);
      setUser(res.user);
      const userWallet = res.user.walletAddress || "";
      setWalletAddress(userWallet);
      setWarningDismissed(false);

      // Verify active MetaMask address if present
      if (activeMetaMaskAddress && userWallet) {
        const match = activeMetaMaskAddress.toLowerCase().trim() === userWallet.toLowerCase().trim();
        setIsWalletMismatched(!match);
        setIsSignatureVerified(match);
      } else {
        setIsWalletMismatched(false);
      }

      toast.success(`Welcome back, ${res.user.name || (res.user.role === "doctor" ? "Dr. Lin" : "Alex")}`);
    } catch (error: any) {
      toast.error(error.message || "Login failed");
      throw error;
    }
  };

  const signup = async (data: { email: string; password: string; role: UserRole; name?: string; walletAddress?: string }) => {
    try {
      const res = await userService.signup(data);
      setIsDemo(!!res.isDemo);
      setUser(res.user);
      const userWallet = res.user.walletAddress || data.walletAddress || "";
      setWalletAddress(userWallet);
      setWarningDismissed(false);

      if (activeMetaMaskAddress && userWallet) {
        const match = activeMetaMaskAddress.toLowerCase().trim() === userWallet.toLowerCase().trim();
        setIsWalletMismatched(!match);
        setIsSignatureVerified(match);
      } else {
        setIsWalletMismatched(false);
      }

      toast.success("Account created successfully with Web3 credentials");
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
      throw error;
    }
  };

  /**
   * MetaMask Signature Challenge Authentication Flow
   */
  const loginWithMetaMaskSignature = async (customAddress?: string) => {
    try {
      let targetAddr = customAddress;
      if (!targetAddr) {
        if (isMetaMaskAvailable) {
          targetAddr = await blockchainService.connectMetaMask();
        } else {
          targetAddr = user?.walletAddress || walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a";
        }
      }

      // 1. Request cryptographic challenge nonce from server
      const { nonce, message } = await userService.getAuthNonce(user?.email, targetAddr);

      // 2. Prompt user to sign challenge with MetaMask (or simulated EVM key)
      toast.info("Requesting cryptographic signature from Ethereum wallet...");
      const { signature, signerAddress } = await blockchainService.signChallengeWithMetaMask(message, targetAddr);

      // 3. Verify signature on backend
      const res = await userService.loginWithMetaMask({
        walletAddress: signerAddress,
        signature,
        message,
        email: user?.email
      });

      setUser(res.user);
      setWalletAddress(res.user.walletAddress || signerAddress);
      setActiveMetaMaskAddress(signerAddress);
      setIsSignatureVerified(true);
      setIsWalletMismatched(false);
      setWarningDismissed(false);
      setIsDemo(!!res.isDemo);

      toast.success(`MetaMask Signature Verified! Signed by ${signerAddress.slice(0, 6)}...${signerAddress.slice(-4)}`);
    } catch (err: any) {
      toast.error(err.message || "MetaMask signature authentication failed");
      throw err;
    }
  };

  /**
   * Post-login verification: confirms active MetaMask account matches user profile
   */
  const verifyActiveMetaMaskAgainstCredentials = useCallback(async (): Promise<boolean> => {
    let current = activeMetaMaskAddress;
    if (!current && isMetaMaskAvailable) {
      current = await blockchainService.getActiveMetaMaskAccount();
      setActiveMetaMaskAddress(current);
    }

    if (!current) {
      toast.warning("No active MetaMask account detected in browser. Click 'Connect Wallet'.");
      return false;
    }

    try {
      const res = await userService.verifyActiveWallet(current, user?.email);
      if (res.matches) {
        setIsWalletMismatched(false);
        setIsSignatureVerified(true);
        toast.success(`Identity Verified: Connected MetaMask (${current.slice(0, 6)}...${current.slice(-4)}) matches your registered account!`);
        return true;
      } else {
        setIsWalletMismatched(true);
        toast.error(`MetaMask Mismatch! Connected: ${current.slice(0, 6)}...${current.slice(-4)} does not match registered: ${res.registeredAddress ? res.registeredAddress.slice(0, 6) + '...' + res.registeredAddress.slice(-4) : 'none'}`);
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to verify active MetaMask credentials");
      return false;
    }
  }, [activeMetaMaskAddress, isMetaMaskAvailable, user]);

  /**
   * Seamless 1-Click Sync Active MetaMask Account to Profile
   */
  const syncActiveWalletToProfile = async () => {
    let target = activeMetaMaskAddress;
    if (!target && isMetaMaskAvailable) {
      target = await blockchainService.connectMetaMask();
      setActiveMetaMaskAddress(target);
    }

    if (!target) {
      toast.error("No active MetaMask wallet detected. Please connect MetaMask.");
      return;
    }

    try {
      const updateRes = await userService.updateWallet(target, user?.email);
      if (user) {
        setUser({ ...user, walletAddress: target });
      }
      setWalletAddress(target);
      setIsWalletMismatched(false);
      setIsSignatureVerified(true);
      setWarningDismissed(false);
      toast.success(`Wallet Synchronized: ${target.slice(0, 6)}...${target.slice(-4)} is now your verified MediChain address!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to sync wallet address");
    }
  };

  /**
   * Update/bind registered address using signed challenge from current MetaMask
   */
  const rebindCurrentMetaMaskAddress = async () => {
    let target = activeMetaMaskAddress;
    if (!target && isMetaMaskAvailable) {
      target = await blockchainService.connectMetaMask();
      setActiveMetaMaskAddress(target);
    }

    if (!target) {
      toast.error("No active MetaMask account available to bind");
      return;
    }

    try {
      const { message } = await userService.getAuthNonce(user?.email, target);
      const { signature } = await blockchainService.signChallengeWithMetaMask(message, target);
      
      await userService.bindWalletSignature({
        walletAddress: target,
        signature,
        message,
        email: user?.email
      });

      if (user) {
        setUser({ ...user, walletAddress: target });
      }
      setWalletAddress(target);
      setIsWalletMismatched(false);
      setIsSignatureVerified(true);
      setWarningDismissed(false);
      toast.success(`Successfully signed & bound MetaMask account: ${target.slice(0, 6)}...${target.slice(-4)}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to bind new MetaMask account");
    }
  };

  const dismissMismatchWarning = () => {
    setWarningDismissed(true);
    setIsWalletMismatched(false);
    toast.info("Mismatch warning dismissed for this session");
  };

  const logout = async () => {
    try {
      await userService.logout();
    } catch {
      // ignore
    }
    setUser(null);
    setWalletAddress("");
    setIsSignatureVerified(false);
    setIsWalletMismatched(false);
    toast.info("Logged out successfully");
  };

  const connectWallet = async () => {
    try {
      if (blockchainService.isMetaMaskAvailable()) {
        const addr = await blockchainService.connectMetaMask();
        setWalletAddress(addr);
        setActiveMetaMaskAddress(addr);
        if (user) {
          await userService.updateWallet(addr, user.email);
          setUser({ ...user, walletAddress: addr });
        }
        setIsWalletMismatched(false);
        setIsSignatureVerified(true);
        setWarningDismissed(false);
        toast.success(`Connected & synced MetaMask wallet: ${addr.slice(0, 6)}...${addr.slice(-4)}`);
        return addr;
      } else {
        const mockWallet = user?.role === "doctor" ? "0x93B27e6B26A0695B40974A3D73A6625B81028A1c" : "0x71C6615b18B1143c7B6528766fC2A9f69744982a";
        setWalletAddress(mockWallet);
        setActiveMetaMaskAddress(mockWallet);
        if (user) {
          await userService.updateWallet(mockWallet, user.email);
          setUser({ ...user, walletAddress: mockWallet });
        }
        setIsWalletMismatched(false);
        setIsSignatureVerified(true);
        toast.info(`EVM Ledger Node connected (${mockWallet.slice(0, 6)}...${mockWallet.slice(-4)})`);
        return mockWallet;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to connect wallet");
      return walletAddress;
    }
  };

  const switchDemoRole = async (role: UserRole) => {
    if (role === "doctor") {
      await login("doctor@medichain.io", "password123");
    } else {
      await login("patient@medichain.io", "password123");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemo,
        walletAddress,
        activeMetaMaskAddress,
        isWalletMismatched,
        isSignatureVerified,
        isMetaMaskAvailable,
        login,
        signup,
        loginWithMetaMaskSignature,
        logout,
        connectWallet,
        setWalletAddress,
        switchDemoRole,
        verifyActiveMetaMaskAgainstCredentials,
        rebindCurrentMetaMaskAddress,
        syncActiveWalletToProfile,
        dismissMismatchWarning,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
