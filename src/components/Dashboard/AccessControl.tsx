import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  UserPlus,
  Clock,
  Trash2,
  Check,
  ExternalLink,
  BellRing,
  Coins,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { blockchainService } from "../../services/blockchainService";
import { userService } from "../../services/userService";
import { AccessGrant, PatientAccessNotification } from "../../types";
import { toast } from "sonner";

export const AccessControl: React.FC = () => {
  const { user, walletAddress } = useAuth();
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [notifications, setNotifications] = useState<PatientAccessNotification[]>([]);
  const [doctorsList, setDoctorsList] = useState<
    Array<{ email: string; name: string; walletAddress?: string }>
  >([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [customDoctorEmail, setCustomDoctorEmail] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>(["vitals", "records"]);
  const [durationDays, setDurationDays] = useState(30);
  const [useSepoliaGas, setUseSepoliaGas] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadGrants();
    loadDoctors();
    loadNotifications();
  }, [walletAddress]);

  const loadGrants = async () => {
    const list = await blockchainService.getGrants(
      walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a"
    );
    setGrants(list);
  };

  const loadNotifications = async () => {
    const list = await userService.getPatientNotifications(
      walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a"
    );
    if (Array.isArray(list)) {
      setNotifications(list);
    }
  };

  const loadDoctors = async () => {
    try {
      const list = await userService.getDoctors();
      setDoctorsList(list);
      if (list.length > 0) {
        setSelectedDoctor(list[0].email);
      }
    } catch {
      setDoctorsList([
        {
          email: "doctor@medichain.io",
          name: "Dr. Sarah Lin, MD",
          walletAddress: "0x93B27e6B26A0695B40974A3D73A6625B81028A1c",
        },
        {
          email: "marcus.vance@medichain.io",
          name: "Dr. Marcus Vance, MD",
          walletAddress: "0x55A447d483478c5C9a64700dE83C556488A9924f",
        },
      ]);
      setSelectedDoctor("doctor@medichain.io");
    }
  };

  const toggleModule = (mod: string) => {
    setSelectedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedModules.length === 0) {
      toast.error("Please select at least one module");
      return;
    }

    const doctorEmail = customDoctorEmail.trim() || selectedDoctor;
    const docObj = doctorsList.find((d) => d.email === doctorEmail);
    const doctorName = docObj?.name || doctorEmail.split("@")[0];
    const doctorAddress = docObj?.walletAddress || "0x93B27e6B26A0695B40974A3D73A6625B81028A1c";

    setIsSubmitting(true);
    try {
      await blockchainService.grantAccess({
        patientAddress: walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a",
        patientName: user?.name || "Alex Mercer",
        doctorEmail,
        doctorName,
        doctorAddress,
        modules: selectedModules,
        durationDays,
        useSepoliaGas,
      });

      toast.success(`Access granted to ${doctorName} on Ethereum Sepolia!`);
      setIsModalOpen(false);
      loadGrants();
    } catch (err: any) {
      toast.error(err.message || "Failed to grant access");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (grantId: string, doctorName: string) => {
    try {
      await blockchainService.revokeAccess(
        grantId,
        walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a"
      );
      toast.info(`Revoked smart contract authorization for ${doctorName}`);
      loadGrants();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke access");
    }
  };

  const moduleDefinitions = [
    { id: "vitals", label: "Live Vitals", desc: "Real-time vital signs & telemetry" },
    { id: "cardiology", label: "Cardiology Reports", desc: "ECG & cardiac logs" },
    { id: "genomic", label: "Genomic Data", desc: "DNA & pharmacogenomics" },
    { id: "prescriptions", label: "Prescriptions", desc: "Medications & refills" },
    { id: "records", label: "General Records", desc: "Lab results & notes" },
  ];

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div>
          <h2 className="text-sm font-bold text-white">Provider Access Control</h2>
          <p className="text-xs text-slate-400">
            Grant or revoke doctor permissions on Ethereum Sepolia.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Authorize Provider</span>
        </button>
      </div>

      {/* Active Grants */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Active Authorizations ({grants.length})
          </h3>
        </div>

        {grants.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No active authorizations. Only you can view your data.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {grants.map((grant) => {
              const daysLeft = Math.max(
                0,
                Math.ceil((grant.expiry - Date.now()) / (1000 * 60 * 60 * 24))
              );
              return (
                <div
                  key={grant.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm text-white">{grant.doctorName}</span>
                      <span className="text-xs text-slate-400">({grant.doctorEmail})</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-slate-500">
                      <span>{grant.doctorAddress}</span>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${grant.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <span>Tx: {grant.txHash.slice(0, 12)}...</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {grant.modules.map((mod) => (
                        <span
                          key={mod}
                          className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800 uppercase"
                        >
                          {mod}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 self-end md:self-center">
                    <div className="text-right text-xs">
                      <div className="text-slate-300 flex items-center gap-1 justify-end">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{daysLeft}d left</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        Expires {new Date(grant.expiry).toLocaleDateString()}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRevoke(grant.id, grant.doctorName)}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800 text-rose-400 text-xs font-medium flex items-center space-x-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Doctor Access Audit Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-white flex items-center gap-2">
            <BellRing className="w-4 h-4 text-amber-400" />
            Doctor Access Audit Log
          </h3>
          <button onClick={loadNotifications} className="text-xs text-cyan-400 hover:underline">
            Refresh
          </button>
        </div>
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No doctor access events recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{n.doctorName}</span>
                    <span className="text-[11px] text-amber-300">
                      {n.action.replace("_", " ")}
                    </span>
                    {n.reportTitle && (
                      <span className="text-slate-300">&ldquo;{n.reportTitle}&rdquo;</span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-slate-500">
                    {n.doctorAddress} • Block #{n.blockNumber}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <a
                    href={`https://sepolia.etherscan.io/tx/${n.sepoliaTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <span>Tx: {n.sepoliaTxHash.slice(0, 12)}...</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-[10px] text-slate-500">
                    {new Date(n.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-xl">
            <h3 className="font-bold text-white text-base mb-1">Authorize Provider</h3>
            <p className="text-xs text-slate-400 mb-4">
              Select a doctor, permitted modules, and access duration.
            </p>

            <form onSubmit={handleGrant} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Physician
                </label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {doctorsList.map((d) => (
                    <option key={d.email} value={d.email}>
                      {d.name} ({d.email})
                    </option>
                  ))}
                  <option value="">Other Physician (Enter Email Below)</option>
                </select>
              </div>

              {!selectedDoctor && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Physician Email
                  </label>
                  <input
                    type="email"
                    placeholder="doctor@hospital.org"
                    value={customDoctorEmail}
                    onChange={(e) => setCustomDoctorEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required={!selectedDoctor}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Modules
                </label>
                <div className="space-y-1.5">
                  {moduleDefinitions.map((mod) => {
                    const isChecked = selectedModules.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer flex items-center space-x-3 ${
                          isChecked
                            ? "bg-cyan-950/30 border-cyan-700 text-white"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                            isChecked
                              ? "bg-cyan-500 border-cyan-400 text-slate-950"
                              : "border-slate-600"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-200">{mod.label}</p>
                          <p className="text-[11px] text-slate-400">{mod.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "24 Hours", days: 1 },
                    { label: "7 Days", days: 7 },
                    { label: "30 Days", days: 30 },
                    { label: "90 Days", days: 90 },
                  ].map((dur) => (
                    <button
                      key={dur.days}
                      type="button"
                      onClick={() => setDurationDays(dur.days)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border ${
                        durationDays === dur.days
                          ? "bg-cyan-600 border-cyan-500 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center space-x-2 text-xs text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSepoliaGas}
                  onChange={(e) => setUseSepoliaGas(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-amber-500"
                />
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Execute Sepolia ETH transaction via MetaMask</span>
              </label>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? "Authorizing..." : "Grant Access"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
