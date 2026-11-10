export const MEDI_CHAIN_CONTRACT_ADDRESS = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7";

export const MEDI_CHAIN_ABI = [
  "event RecordAdded(address indexed patient, string ipfsHash, string recordType, uint256 timestamp, address indexed uploader)",
  "event AccessGranted(address indexed patient, address indexed doctor, string[] modules, uint256 expiry)",
  "event AccessRevoked(address indexed patient, address indexed doctor)",
  "event EmergencyUnlocked(address indexed patient, address indexed responder, string reason, uint256 expiry)",
  "event EmergencyRevoked(address indexed patient)",
  "function addMedicalRecord(address _patientAddress, string memory _ipfsHash, string memory _recordType, string memory _checksum) public",
  "function grantAccess(address _doctor, string[] memory _modules, uint256 _durationSeconds) public",
  "function revokeAccess(address _doctor) public",
  "function hasAccess(address _patient, address _doctor, string memory _module) public view returns (bool)",
  "function activateEmergencyUnlock(address _patient, string memory _reason) public",
  "function revokeEmergencyUnlock(address _patient) public",
  "function isEmergencyActive(address _patient) public view returns (bool)",
  "function getPatientRecords(address _patient) public view returns (tuple(address patientAddress, string ipfsHash, string recordType, uint256 timestamp, address uploader, string checksum)[])"
];
