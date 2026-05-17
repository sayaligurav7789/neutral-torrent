# 🔗 Decentralized Persistent Peer Reputation Ledger System (DPRLS)

![Solidity](https://img.shields.io/badge/Smart%20Contracts-Solidity-blue)
![Node.js](https://img.shields.io/badge/Backend-Node.js-green)
![React](https://img.shields.io/badge/Frontend-React-61DAFB)
![Blockchain](https://img.shields.io/badge/Blockchain-Ethereum-purple)

A blockchain-based system for storing and verifying peer reputation in decentralized networks.

---

## 🚨 Problem Statement

Private BitTorrent trackers suffer from three critical weaknesses:

1. **Non-Portable Reputation**: Upload/download ratios are locked to specific trackers. When a tracker shuts down, users lose their contribution history permanently.

2. **Centralized Fragility**: Trackers are single points of failure for both reputation storage and peer discovery.

3. **Unverifiable Statistics**: Upload statistics are self-reported and easily manipulated.


---

## 🌍 Why Neural Torrent?

AI training data is centralized, expensive, and controlled by a few organizations.
Traditional BitTorrent systems lack persistent reputation, cryptographic verification, and incentive compatibility.

Neural Torrent introduces a decentralized AI dataset exchange layer where:
- contribution is rewarded,
- reputation is persistent,
- and dataset sharing becomes trustless and verifiable.

---

## ⚡ Traditional BitTorrent vs Neural Torrent
<img width="1536" height="1024" alt="WhatsApp Image 2026-05-17 at 11 11 18 AM" src="https://github.com/user-attachments/assets/554f969f-61c1-46dd-8137-385f1c3c9566" />

---

## 💡 Solution

PBTS addresses these weaknesses through:

- **Blockchain-Based Reputation**: Smart contracts persist user reputation permanently, surviving tracker shutdowns
- **Cryptographic Attestation**: Downloading peers sign receipts for received pieces, eliminating fake uploads
- **Decentralized Architecture**: Reputation persists across restarts, deployments, and operator changes
---

## 🏗️ System Architecture
<img width="1535" height="938" alt="WhatsApp Image 2026-05-17 at 11 43 08 AM" src="https://github.com/user-attachments/assets/f8df80b4-59ca-4670-8e3e-5d49c936aeab" />

---

## 🗂️ Project Structure

```
persistent_bittorrent_tracker/
├── contracts/          # Solidity smart contracts (Foundry)
│   ├── src/           # ReputationTracker.sol, RepFactory.sol
│   ├── test/          # Foundry tests
│   └── script/        # Deployment scripts (DeployPBTS.s.sol)
├── backend/           # Bun + Express tracker server
│   ├── routes/        # API endpoints (register, report, announce)
│   ├── marketplace/   # Content marketplace with Uniswap integration
│   ├── skybox/        # Skybox AI spatial environment proxy
│   ├── utils/         # Signature verification, contract interaction
│   ├── config/        # Typed config (env resolution, chain ID)
│   └── tests/         # Jest test suites (api, signatures)
├── frontend/          # React + Vite + TailwindCSS dashboard
│   ├── components/    # UI components (dashboard, agent demo, skybox viewer)
│   ├── hooks/         # React hooks (wallet, demo timeline, skybox)
│   └── lib/           # API clients, types, utilities
└── agents/            # Development guidelines and best practices
```

---

## 🛠️ Technology Stack

- **Smart Contracts**:  ![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue?logo=solidity&logoColor=white) ![Foundry](https://img.shields.io/badge/Foundry-Framework-black)

- **Backend**:  ![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js&logoColor=white) ![Express](https://img.shields.io/badge/Express.js-Backend-lightgrey?logo=express&logoColor=black) ![Bun](https://img.shields.io/badge/Bun-Runtime-black)

- **Frontend**:  ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black) ![Vite](https://img.shields.io/badge/Vite-Build-purple?logo=vite&logoColor=white)  ![Tailwind](https://img.shields.io/badge/TailwindCSS-Framework-38B2AC?logo=tailwindcss&logoColor=white) ![Framer Motion](https://img.shields.io/badge/Framer--Motion-Animation-black)

- **Cryptography**:  ![ECDSA](https://img.shields.io/badge/ECDSA-secp256k1-orange) ![Ethers.js](https://img.shields.io/badge/Ethers.js-Library-blue)
  
- **Blockchain**:  ![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-3C3C3D?logo=ethereum&logoColor=white) ![Avalanche](https://img.shields.io/badge/Avalanche-Fuji-red?logo=avalanche&logoColor=white)

- **Spatial AI**:  ![Skybox AI](https://img.shields.io/badge/Skybox%20AI-360°%20Env-blueviolet)

---

## 🎯 MVP Scope

**Core Demonstration:**
- Users register via wallet signature → on-chain account creation
- Manual transfer simulation with cryptographic receipts → reputation updates
- Reputation-based access control → high reputation users get peer lists
- Server restart demonstration → reputation persists via blockchain

**Intentional Simplifications:**
- Manual transfer simulation (no real P2P integration)
- Basic ECDSA signatures (no BLS aggregation)
- Simulated peer swarm (no real BitTorrent protocol)
- No TEE implementation (attestation hash placeholder in RepFactory)

---

## ⚡ Getting Started

### Prerequisites

- Bun
- Foundry
- MetaMask browser extension

---

## ✨ Key Features

- Persistent on-chain reputation
- Cryptographic transfer receipts (EIP-191 signed)
- Reputation-based access control
- Zero local state (stateless server)
- Censorship-resistant architecture
- Factory-based contract migration with single-hop referrer delegation
- Admin-protected `/migrate` endpoint for seamless tracker rotation
- Content marketplace with Uniswap token swap integration
- Agent-to-agent data exchange visualization with animated network topology
- **Skybox AI spatial environments** — 360-degree worlds for each AI agent's data domain

---

## 🔄 Demo Flow

1. **Register**: Connect MetaMask → Sign message → On-chain account created
2. **Simulate Transfer**: Create receipt → Sign → Submit → Watch reputation update
3. **Announce**: Request peer list → Access granted/denied based on ratio
4. **Persistence**: Kill server → Restart → Reputation unchanged
5. **Spatial Worlds**: Agent tab → Select agent → Generate World → Drag to explore 360-degree environment

---

## Snaps
1. Landing Page
<img width="1919" height="905" alt="1" src="https://github.com/user-attachments/assets/511f1e71-53d0-4abf-88b6-a973dbc0a7df" />

---

2. Dashboard
<img width="1432" height="895" alt="2" src="https://github.com/user-attachments/assets/1ba1071c-0461-4c12-b1f6-0006164f6900" />
<img width="975" height="467" alt="image" src="https://github.com/user-attachments/assets/3b616899-c58f-4bc1-95c7-fb8ee82b9ba6" />


---

3. Torrents List 
<img width="1919" height="890" alt="3" src="https://github.com/user-attachments/assets/94c4cfa9-c2d0-4e38-92e2-2e50e5ab03a3" />

---

4. Marketplace
<img width="1919" height="903" alt="4" src="https://github.com/user-attachments/assets/75fa0ca2-6d57-4c11-a4aa-3d202fd4b787" />
<img width="1918" height="913" alt="5" src="https://github.com/user-attachments/assets/d3521e3c-d821-4e9e-8d3a-f7c8e0d3397b" />

---

5. Agent Data Exchange Visualization
<img width="1919" height="911" alt="7" src="https://github.com/user-attachments/assets/00789ae0-1c75-4214-9196-aa431c496480" />

---

6. Tracker
<img width="975" height="461" alt="image" src="https://github.com/user-attachments/assets/c33c6046-be52-490b-bd0f-46f9700e4931" />

---






