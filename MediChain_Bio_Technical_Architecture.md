# MediChain Bio - Technical Architecture Document

## Overview

MediChain Bio is a comprehensive blockchain-based medical records management system that enables secure, decentralized storage and access control of patient medical data. The system combines traditional web technologies with blockchain smart contracts to ensure data immutability, privacy, and controlled access.

## Architecture Overview

The application follows a modern full-stack architecture with three main layers:

1. **Frontend Layer**: React-based single-page application
2. **Backend Layer**: Node.js/Express API server with authentication
3. **Blockchain Layer**: Ethereum smart contracts for immutable record storage

## Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6.2.0
- **Styling**: Tailwind CSS 4.1.14 with custom utilities
- **State Management**: React Context API (AuthContext, VitalsContext)
- **UI Components**: Lucide React icons, Motion for animations
- **Charts**: Recharts for data visualization
- **Notifications**: Sonner for toast notifications

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with bcryptjs password hashing
- **Development Server**: tsx for hot reloading
- **Demo Mode**: In-memory fallback when MongoDB unavailable

### Blockchain
- **Platform**: Ethereum (Sepolia testnet)
- **Language**: Solidity 0.8.20
- **Development Framework**: Hardhat
- **Testing**: Chai with Hardhat Chai Matchers
- **Client Library**: Ethers.js 6.13.5
- **Wallet Integration**: MetaMask

### Development & Testing
- **TypeScript**: Version 5.8.2 with strict configuration
- **Linting**: ESLint integration
- **Testing**: Hardhat test framework for smart contracts
- **Package Management**: npm

## System Components

### 1. Smart Contract Layer (`MediChainRecords.sol`)

**Core Functionality:**
- **Medical Record Storage**: Stores IPFS hash references to encrypted medical files
- **Access Control**: Granular permission system for doctors and emergency access
- **Audit Logging**: Immutable event logging for all operations
- **Emergency Access**: Time-bound emergency unlock functionality

**Key Data Structures:**

```
struct MedicalRecord {
    address patientAddress;
    string ipfsHash;
    string recordType;
    uint256 timestamp;
    address uploader;
}

struct AccessGrant {
    address doctor;
    string[] modules;
    uint256 expiry;
    bool active;
}
```

**Main Functions:**
- `addMedicalRecord()`: Store medical record references on-chain
- `grantAccess()`: Authorize doctors for specific data modules
- `hasAccess()`: Check permission status
- `toggleEmergencyUnlock()`: Enable/disable emergency access
- `getPatientRecords()`: Retrieve patient's medical history

### 2. Backend API Server (`server.ts`)

**Authentication System:**
- User registration and login with role-based access (patient/doctor)
- JWT token-based session management
- Password hashing with bcryptjs
- Cookie-based token storage

**API Endpoints:**
- `POST /api/auth/signup`: User registration
- `POST /api/auth/login`: User authentication
- `GET /api/auth/me`: Get current user info
- `GET /api/users/resolve/:email`: Patient lookup by email

**Database Integration:**
- MongoDB connection with automatic demo mode fallback
- User schema with email, password, role, and wallet address
- In-memory storage for development/demo scenarios

### 3. Frontend Application (`src/`)

**Component Architecture:**
- **Authentication**: `AuthPage.tsx` - Login/signup interface
- **Dashboard**: `App.tsx` - Main application container
- **Navigation**: `Sidebar.tsx`, `TopBar.tsx` - Application navigation
- **Core Features**:
  - `PatientProfile.tsx` - Patient information display
  - `ProviderPanel.tsx` - Healthcare provider interface
  - `AccessControl.tsx` - Permission management
  - `Emergency.tsx` - Emergency access controls
  - `Reports.tsx` - Medical reports and analytics
  - `Blockchain.tsx` - Blockchain interaction interface

**Context Management:**
- **AuthContext**: User authentication state and wallet address management
- **VitalsContext**: Real-time health metrics simulation and AI signals

**Services:**
- **blockchainService.ts**: Ethereum network interaction, contract calls, MetaMask integration
- **userService.ts**: User management and API communication

### 4. Development Infrastructure

**Build Configuration:**
- **Vite**: Fast development server with HMR support
- **TypeScript**: Strict type checking with custom path aliases (`@/*`)
- **Tailwind**: Utility-first CSS with custom plugin integration

**Smart Contract Development:**
- **Hardhat**: Ethereum development environment
- **Testing**: Comprehensive unit tests with Chai assertions
- **Artifact Generation**: Automatic ABI and bytecode generation

## Data Flow Architecture

### Medical Record Upload Flow:
1. User authenticates via JWT
2. Medical file uploaded to IPFS (external service)
3. IPFS hash stored on Ethereum blockchain via smart contract
4. Record metadata indexed in MongoDB
5. Access permissions managed through smart contract grants

### Access Control Flow:
1. Doctor requests access to patient data
2. Patient grants permission via smart contract call
3. Access grant stored on-chain with expiration
4. Doctor can retrieve IPFS hashes for authorized records
5. All access attempts logged immutably

### Emergency Access Flow:
1. Emergency situation triggers unlock request
2. Smart contract enables time-bound emergency access (24 hours)
3. Authorized personnel can access patient records
4. Access automatically expires after time limit

## Security Architecture

### Authentication & Authorization:
- **JWT Tokens**: Stateless authentication with HTTP-only cookies
- **Role-Based Access**: Patient vs. Doctor permissions
- **Password Security**: bcrypt hashing with salt rounds
- **Session Management**: Secure cookie configuration for production

### Blockchain Security:
- **Immutable Audit Trail**: All operations logged on-chain
- **Access Control**: Smart contract enforced permissions
- **Emergency Protocols**: Time-bound emergency access with logging
- **Wallet Integration**: MetaMask for secure transaction signing

### Data Privacy:
- **Off-Chain Storage**: Medical files stored on IPFS (not on-chain)
- **Encryption**: Files encrypted before IPFS upload
- **Granular Permissions**: Module-based access control
- **Audit Logging**: Complete transaction history

## Deployment Architecture

### Development Environment:
- **Local Development**: Vite dev server with Hot Module Replacement
- **Smart Contract Testing**: Hardhat local network
- **Database**: Local MongoDB or in-memory demo mode

### Production Environment:
- **Frontend**: Static file hosting (Vercel, Netlify, etc.)
- **Backend**: Node.js server (Heroku, Railway, etc.)
- **Database**: MongoDB Atlas or similar cloud database
- **Blockchain**: Ethereum mainnet or testnet deployment
- **File Storage**: IPFS (Pinata, Infura, or self-hosted)

## Testing Strategy

### Smart Contract Testing:
- **Unit Tests**: Individual function testing with Hardhat
- **Integration Tests**: Multi-contract interaction testing
- **Gas Optimization**: Transaction cost analysis
- **Security Testing**: Access control and edge case validation

### Application Testing:
- **Component Testing**: React component unit tests
- **API Testing**: Backend endpoint validation
- **Integration Testing**: Full user workflow testing
- **E2E Testing**: End-to-end user journey validation

## Performance Considerations

### Frontend Optimization:
- **Code Splitting**: Vite automatic chunking
- **Asset Optimization**: Image and font optimization
- **Bundle Analysis**: Dependency size monitoring
- **Caching**: Browser caching strategies

### Backend Optimization:
- **Database Indexing**: Optimized MongoDB queries
- **API Rate Limiting**: Request throttling implementation
- **Caching Layer**: Redis for session and data caching
- **Load Balancing**: Horizontal scaling support

### Blockchain Optimization:
- **Gas Efficiency**: Optimized smart contract operations
- **Batch Transactions**: Multiple operations in single transaction
- **Event Indexing**: Off-chain event log processing
- **Layer 2 Solutions**: Potential Polygon or Optimism integration

## Monitoring & Observability

### Application Monitoring:
- **Error Tracking**: Sentry or similar error monitoring
- **Performance Monitoring**: Application response times
- **User Analytics**: Usage patterns and feature adoption
- **Blockchain Monitoring**: Transaction success rates

### Smart Contract Monitoring:
- **Event Monitoring**: Real-time event listening
- **Transaction Monitoring**: Gas usage and success rates
- **Security Monitoring**: Unusual access patterns
- **Network Monitoring**: Ethereum network status

## Future Enhancements

### Scalability Improvements:
- **Layer 2 Integration**: Polygon or Optimism for reduced gas costs
- **IPFS Clustering**: Distributed file storage
- **Database Sharding**: Horizontal database scaling
- **CDN Integration**: Global content delivery

### Feature Extensions:
- **AI Integration**: Advanced health insights and predictions
- **Multi-Blockchain**: Support for additional blockchain networks
- **Mobile Application**: React Native companion app
- **API Integrations**: EHR system integrations

### Security Enhancements:
- **Zero-Knowledge Proofs**: Enhanced privacy features
- **Multi-Signature**: Advanced access control
- **Decentralized Identity**: DID integration
- **Audit Certification**: Third-party security audits

---

**Document Version**: 1.0
**Date**: April 18, 2026
**Author**: GitHub Copilot
**Project**: MediChain Bio

This architecture provides a robust, secure, and scalable foundation for blockchain-based medical records management while maintaining compliance with healthcare data privacy requirements.