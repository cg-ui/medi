// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MediChainRecords
 * @dev Secure medical records registry and access control manager on Ethereum / EVM.
 * Implements access grants, patient record tracking, and time-bounded emergency unlock.
 */
contract MediChainRecords {
    struct MedicalRecord {
        address patientAddress;
        string ipfsHash;
        string recordType;
        uint256 timestamp;
        address uploader;
        string checksum;
    }

    struct AccessGrant {
        address doctor;
        string[] modules;
        uint256 expiry;
        bool active;
    }

    struct EmergencyAccess {
        bool unlocked;
        uint256 expiry;
        string authorizedReason;
        address responder;
    }

    // Mapping: Patient Address => Array of Medical Records
    mapping(address => MedicalRecord[]) private patientRecords;

    // Mapping: Patient Address => (Doctor Address => AccessGrant)
    mapping(address => mapping(address => AccessGrant)) private accessGrants;

    // Mapping: Patient Address => Emergency Access state
    mapping(address => EmergencyAccess) private emergencyState;

    // Events
    event RecordAdded(address indexed patient, string ipfsHash, string recordType, uint256 timestamp, address indexed uploader);
    event AccessGranted(address indexed patient, address indexed doctor, string[] modules, uint256 expiry);
    event AccessRevoked(address indexed patient, address indexed doctor);
    event EmergencyUnlocked(address indexed patient, address indexed responder, string reason, uint256 expiry);
    event EmergencyRevoked(address indexed patient);

    modifier onlyPatientOrAuthorized(address _patient) {
        require(
            msg.sender == _patient || hasAccess(_patient, msg.sender, "records") || isEmergencyActive(_patient),
            "MediChain: Unauthorized record access"
        );
        _;
    }

    /**
     * @dev Add a medical record reference (IPFS CID & SHA checksum)
     */
    function addMedicalRecord(
        address _patientAddress,
        string memory _ipfsHash,
        string memory _recordType,
        string memory _checksum
    ) public {
        require(_patientAddress != address(0), "Invalid patient address");
        require(
            msg.sender == _patientAddress || hasAccess(_patientAddress, msg.sender, "records"),
            "MediChain: Not authorized to upload for patient"
        );

        MedicalRecord memory newRecord = MedicalRecord({
            patientAddress: _patientAddress,
            ipfsHash: _ipfsHash,
            recordType: _recordType,
            timestamp: block.timestamp,
            uploader: msg.sender,
            checksum: _checksum
        });

        patientRecords[_patientAddress].push(newRecord);

        emit RecordAdded(_patientAddress, _ipfsHash, _recordType, block.timestamp, msg.sender);
    }

    /**
     * @dev Grant granular module access to a healthcare provider
     */
    function grantAccess(
        address _doctor,
        string[] memory _modules,
        uint256 _durationSeconds
    ) public {
        require(_doctor != address(0), "Invalid doctor address");
        require(_doctor != msg.sender, "Cannot grant access to self");

        uint256 expiry = block.timestamp + _durationSeconds;
        accessGrants[msg.sender][_doctor] = AccessGrant({
            doctor: _doctor,
            modules: _modules,
            expiry: expiry,
            active: true
        });

        emit AccessGranted(msg.sender, _doctor, _modules, expiry);
    }

    /**
     * @dev Revoke access from a healthcare provider
     */
    function revokeAccess(address _doctor) public {
        require(accessGrants[msg.sender][_doctor].active, "Grant not active");
        accessGrants[msg.sender][_doctor].active = false;
        emit AccessRevoked(msg.sender, _doctor);
    }

    /**
     * @dev Check if doctor has active access to a given module
     */
    function hasAccess(address _patient, address _doctor, string memory _module) public view returns (bool) {
        AccessGrant memory grant = accessGrants[_patient][_doctor];
        if (!grant.active) return false;
        if (block.timestamp > grant.expiry) return false;

        for (uint256 i = 0; i < grant.modules.length; i++) {
            if (keccak256(bytes(grant.modules[i])) == keccak256(bytes(_module)) || 
                keccak256(bytes(grant.modules[i])) == keccak256(bytes("all"))) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Activate 24-hour break-glass emergency unlock
     */
    function activateEmergencyUnlock(address _patient, string memory _reason) public {
        uint256 duration = 24 hours;
        emergencyState[_patient] = EmergencyAccess({
            unlocked: true,
            expiry: block.timestamp + duration,
            authorizedReason: _reason,
            responder: msg.sender
        });

        emit EmergencyUnlocked(_patient, msg.sender, _reason, block.timestamp + duration);
    }

    /**
     * @dev Revoke emergency unlock immediately
     */
    function revokeEmergencyUnlock(address _patient) public {
        require(msg.sender == _patient || emergencyState[_patient].responder == msg.sender, "Unauthorized");
        emergencyState[_patient].unlocked = false;
        emit EmergencyRevoked(_patient);
    }

    /**
     * @dev Query emergency status
     */
    function isEmergencyActive(address _patient) public view returns (bool) {
        EmergencyAccess memory em = emergencyState[_patient];
        return em.unlocked && block.timestamp <= em.expiry;
    }

    /**
     * @dev Retrieve patient records if caller has clearance
     */
    function getPatientRecords(address _patient) public view onlyPatientOrAuthorized(_patient) returns (MedicalRecord[] memory) {
        return patientRecords[_patient];
    }
}
