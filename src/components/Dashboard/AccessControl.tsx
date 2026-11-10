import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  UserPlus, 
  Key, 
  Clock, 
  Trash2, 
  Check, 
  AlertCircle, 
  Lock, 
  Unlock, 
  Search,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { blockchainService } from "../../services/blockchainService";
import { userService } from "../../services/userService";
import { AccessGrant } from "../../types";
import { toast } from "sonner";

export const AccessControl: React.FC = () => {
  const { walletAddress } = useAuth();
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [doctorsList, setDoctorsList] = useState<Array<{ email: string; name: string; walletAddress?: string }>>([]);
  
  // Grant modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [customDoctorEmail, setCustomDoctorEmail] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>(["vitals", "records"]);
  const [durationDays, setDurationDays] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadGrants();
    loadDoctors();
  }, [walletAddress]);

  const loadGrants = async () => {
    const list = await blockchainService.getGrants(walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a");
    setGrants(list);
  };

  const loadDoctors = async () => {
    try {
      const list = await userService.getDoctors();
      setDoctorsList(list);
      if (list.length > 0) {
        setSelectedDoctor(list[0].email);
      }
    } catch {
      // Fallback
      setDoctorsList([
        { email: "doctor@medichain.io", name: "Dr. Sarah Lin, MD", walletAddress: "0x93B27e6B26A0695B40974A3D73A6625B81028A1c" },
        { email: "marcus.vance@medichain.io", name: "Dr. Marcus Vance, MD", walletAddress: "0x55A447d483478c5C9a64700dE83C556488A9924f" }
      ]);
      setSelectedDoctor("doctor@medichain.io");
    }
  };

  const toggleModule = (mod: string) => {
    setSelectedModules(prev => 
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedModules.length === 0) {
      toast.error("Please select at least one module");
      return;
    }

    const doctorEmail = customDoctorEmail.trim() || selectedDoctor;
    const docObj = doctorsList.find(d => d.email === doctorEmail);
    const doctorName = docObj?.name || doctorEmail.split("@")[0];
    const doctorAddress = docObj?.walletAddress || "0x93B27e6B26A0695B40974A3D73A6625B81028A1c";

    setIsSubmitting(true);
    try {
      const grant = await blockchainService.grantAccess({
        patientAddress: walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a",
        doctorEmail,
        doctorName,
        doctorAddress,
        modules: selectedModules,
        durationDays
      });

      toast.success(`Access granted to ${doctorName} on Ethereum chain!`);
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
      await blockchainService.revokeAccess(grantId, walletAddress || "0x71C6615b18B1143c7B6528766fC2A9f69744982a");
      toast.info(`Revoked smart contract authorization for ${doctorName}`);
      loadGrants();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke access");
    }
  };

  const moduleDefinitions = [
    { id: "vitals", label: "Live Vitals Stream", desc: "Real-time hemodynamic telemetry, ECG waveform & alert signals" },
    { id: "cardiology", label: "Cardiology Reports", desc: "Holter ECG records, echocardiograms, and stress test logs" },
    { id: "genomic", label: "Genomic Sequencing", desc: "Pharmacogenomics profiles, variant panels, and DNA summaries" },
    { id: "prescriptions", label: "Prescriptions & Meds", desc: "Active medication schedule, dosages, and refill history" },
    { id: "records", label: "General EHR Archive", desc: "Laboratory bloodwork, hospital admission notes, and imaging" }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            Decentralized Role-Based Access Control (RBAC)
          </h2>
          <p className="text-xs text-slate-400">
            You own your encryption keys. Grant or revoke physician clearance with smart contract enforcement.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-cyan-600/20 flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Authorize Provider</span>
        </button>
      </div>

      {/* Access Grants Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Active Smart Contract Authorizations
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {grants.length} Active {grants.length === 1 ? "Grant" : "Grants"}
          </span>
        </div>

        {grants.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            No active provider authorizations. Your health data is currently private and accessible only to you.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {grants.map((grant) => {
              const daysLeft = Math.max(0, Math.ceil((grant.expiry - Date.now()) / (1000 * 60 * 60 * 24)));
              return (
                <div key={grant.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-white">{grant.doctorName}</span>
                      <span className="text-xs text-slate-400 font-mono">({grant.doctorEmail})</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        Active
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500">
                      Doctor Wallet: {grant.doctorAddress}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {grant.modules.map(mod => (
                        <span key={mod} className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700">
                          {mod.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 self-end md:self-center">
                    <div className="text-right text-xs">
                      <div className="text-slate-300 font-medium flex items-center gap-1 justify-end">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{daysLeft} days remaining</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        Expires: {new Date(grant.expiry).toLocaleDateString()}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRevoke(grant.id, grant.doctorName)}
                      className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                      title="Immediate smart contract revoke"
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

      {/* Grant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="font-bold text-white text-base flex items-center gap-2 mb-1">
              <UserPlus className="w-5 h-5 text-cyan-400" />
              Authorize Healthcare Provider
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Issues a cryptographically signed AccessGrant via smart contract with automated expiration.
            </p>

            <form onSubmit={handleGrant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Physician</label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Physician Email</label>
                  <input
                    type="email"
                    placeholder="doctor@hospital.org"
                    value={customDoctorEmail}
                    onChange={(e) => setCustomDoctorEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required={!selectedDoctor}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Granular Module Clearance
                </label>
                <div className="space-y-2">
                  {moduleDefinitions.map((mod) => {
                    const isChecked = selectedModules.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start space-x-3 ${
                          isChecked
                            ? "bg-cyan-950/30 border-cyan-700/80 text-white"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center border shrink-0 ${
                          isChecked ? "bg-cyan-500 border-cyan-400 text-slate-950" : "border-slate-600"
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{mod.label}</p>
                          <p className="text-[11px] text-slate-400 leading-snug">{mod.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Access Duration (Time-To-Live)
                </label>
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
                      className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all text-center border ${
                        durationDays === dur.days
                          ? "bg-cyan-600 border-cyan-500 text-white shadow-md shadow-cyan-600/20"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? "Authorizing on Chain..." : "Grant Smart Access"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
