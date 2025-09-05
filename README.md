# 🎰 DEGEN Raffle - Decentralized NFT Raffle Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Coreum](https://img.shields.io/badge/Built%20on-Coreum-blue)](https://www.coreum.com/)
[![Drand](https://img.shields.io/badge/Randomness-Drand-green)](https://drand.love/)
[![Angular](https://img.shields.io/badge/Frontend-Angular-red)](https://angular.io/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-green)](https://nodejs.org/)

A fully decentralized, transparent, and secure NFT raffle platform built on Coreum blockchain with verifiable randomness using Drand.

## 🌟 Features

### 🔐 **Security & Transparency**
- **BLS Signature Verification** - Cryptographically secure randomness using Drand's BLS12-381 signatures
- **Smart Contract Automation** - Automatic raffle ending with blockchain-based time validation
- **Public Key Verification** - Ensures randomness comes from official Drand League of Entropy
- **Round Freshness Validation** - Prevents replay attacks and ensures current randomness

### 🎯 **Core Functionality**
- **NFT Raffle Creation** - Create raffles with any Coreum-compatible NFT
- **Ticket Sales** - Buy multiple tickets with native tokens or CW20 tokens
- **Automatic Winner Selection** - Fair winner selection using verifiable randomness
- **Real-time Updates** - Live raffle status and participant tracking
- **Responsive UI** - Modern, mobile-friendly interface

### ⚡ **Technical Highlights**
- **CosmWasm Smart Contracts** - Rust-based, gas-optimized contracts
- **MongoDB Integration** - Efficient data storage and querying
- **Event-driven Architecture** - Real-time blockchain event processing
- **Automated Backend** - Scheduled tasks for raffle management

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Smart Contract│
│   (Angular)     │◄──►│   (Node.js)     │◄──►│   (CosmWasm)    │
│                 │    │                 │    │                 │
│ • Raffle UI     │    │ • API Server    │    │ • Raffle Logic  │
│ • Ticket Sales  │    │ • Automation    │    │ • BLS Verify    │
│ • Winner Display│    │ • Indexer       │    │ • Winner Select │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MongoDB       │    │   Drand API     │    │   Coreum Chain  │
│                 │    │                 │    │                 │
│ • Raffle Data   │    │ • Randomness    │    │ • Transactions  │
│ • Participants  │    │ • BLS Signatures│    │ • Event Logs    │
│ • History       │    │ • Round Data    │    │ • State Storage │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (v5 or higher)
- **Rust** (for smart contract compilation)
- **Coreum CLI** (`cored`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/degen-raffle.git
   cd degen-raffle
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   
   # Smart Contract
   cd ../contracts/raffle
   cargo build --release --target wasm32-unknown-unknown
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp backend/.env.example backend/.env
   
   # Edit with your values
   nano backend/.env
   ```

4. **Start the application**
   ```bash
   # Terminal 1: MongoDB
   mongod
   
   # Terminal 2: Backend
   cd backend
   npm start
   
   # Terminal 3: Frontend
   cd frontend
   npm start
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# Coreum Configuration
COREUM_CHAIN_ID=coreum-testnet-01
COREUM_NODE=https://full-node.testnet-1.coreum.dev:26657
COREUM_DENOM=utestcore
RAFFLE_CONTRACT_ADDRESS=coreum1...

# Wallet Configuration
WALLET_MNEMONIC="your twelve word mnemonic phrase"
WALLET_ADDRESS=coreum1...

# Database
MONGODB_URI=mongodb://localhost:27017/degen-raffle

# Drand Configuration
DRAND_PUBLIC_KEY=868f005eb8e6e4ca0a47c8a77ceaa5309a47978a7c71bc5cce96366b5d7a569937c529eeda66c7293784a9402801af31
DRAND_ROUND_SECONDS=30
```

### Smart Contract Deployment

```bash
# Build WASM file
cargo build --release --target wasm32-unknown-unknown

# Deploy to Coreum
cored tx wasm store artifacts/coreum_raffle.wasm \
  --from $WALLET_ADDRESS \
  --gas auto --gas-adjustment 1.4 \
  --fees 100000utestcore \
  --node $RPC_URL --chain-id $CHAIN_ID

# Instantiate contract
cored tx wasm instantiate $CODE_ID \
  '{"admin":"'$WALLET_ADDRESS'","protocol_fee_bps":500,"bounty_amount":null,"drand_pubkey":"868f005eb8e6e4ca0a47c8a77ceaa5309a47978a7c71bc5cce96366b5d7a569937c529eeda66c7293784a9402801af31","drand_round_seconds":300}' \
  --from $WALLET_ADDRESS \
  --label "DEGEN Raffle" \
  --gas auto --gas-adjustment 1.4 \
  --fees 100000utestcore \
  --node $RPC_URL --chain-id $CHAIN_ID
```

## 📖 How It Works

### 1. **Raffle Creation**
- Users create raffles by sending NFTs to the smart contract
- Set ticket price, maximum tickets, and duration
- Raffle becomes active and tickets go on sale

### 2. **Ticket Sales**
- Users buy tickets with native tokens or CW20 tokens
- Each ticket is assigned a unique index (0, 1, 2, ...)
- Real-time tracking of sold tickets and participants

### 3. **Automatic Ending**
- Backend monitors raffles every 2 minutes
- Ends raffles when time expires or all tickets are sold
- Fetches verifiable randomness from Drand

### 4. **Winner Selection**
- Uses Drand's BLS signature to verify randomness authenticity
- Calculates winner index: `winner_index = randomness % total_tickets`
- Transfers NFT to winner and distributes funds

### 5. **Fund Distribution**
- **Protocol Fee** → Admin (configurable percentage)
- **Bounty** → Raffle ender (incentive for automation)
- **Remainder** → Raffle creator or designated revenue address

## 🔒 Security Features

### **Cryptographic Security**
- **BLS12-381 Signatures** - Industry-standard cryptographic verification
- **Public Key Validation** - Ensures randomness from official Drand network
- **Round Freshness** - Prevents replay attacks with time-based validation
- **Signature Consistency** - Verifies randomness matches signature

### **Smart Contract Security**
- **Access Controls** - Only authorized users can end raffles
- **State Validation** - Comprehensive checks before state changes
- **Gas Optimization** - Efficient contract execution
- **Error Handling** - Graceful failure modes

### **Backend Security**
- **Environment Isolation** - Sensitive data in environment variables
- **Database Security** - MongoDB with proper access controls
- **API Protection** - Input validation and sanitization
- **Logging** - Comprehensive audit trails

## 🛠️ Development

### Project Structure

```
degen-raffle/
├── contracts/raffle/          # CosmWasm smart contract
│   ├── src/
│   │   ├── contract.rs        # Main contract logic
│   │   ├── msg.rs            # Message definitions
│   │   └── state.rs          # State management
│   └── Cargo.toml            # Rust dependencies
├── backend/                   # Node.js backend
│   ├── src/
│   │   ├── services/         # Business logic
│   │   ├── models/           # Database models
│   │   └── routes/           # API endpoints
│   └── package.json
├── frontend/                  # Angular frontend
│   ├── src/app/
│   │   ├── components/       # UI components
│   │   ├── services/         # API services
│   │   └── models/           # TypeScript models
│   └── package.json
└── README.md
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/raffles` | Get all raffles |
| `GET` | `/api/raffles/:id` | Get specific raffle |
| `POST` | `/api/raffles/sync` | Sync with blockchain |
| `GET` | `/api/participants/:raffleId` | Get raffle participants |
| `GET` | `/api/system/status` | System health check |

### Smart Contract Messages

| Message | Description |
|---------|-------------|
| `CreateRaffle` | Create a new raffle |
| `BuyTickets` | Purchase raffle tickets |
| `EndRaffle` | End raffle and select winner |
| `CancelRaffle` | Cancel active raffle |
| `UpdateConfig` | Update contract configuration |

## 🧪 Testing

### Run Tests

```bash
# Backend tests
cd backend
npm test

# Smart contract tests
cd contracts/raffle
cargo test

# Frontend tests
cd frontend
npm test
```

### Test Coverage

- **Unit Tests** - Individual component testing
- **Integration Tests** - End-to-end workflow testing
- **Security Tests** - Cryptographic verification testing
- **Performance Tests** - Load and stress testing

## 📊 Monitoring

### Health Checks

- **Backend Health** - `GET /api/system/status`
- **Database Connection** - MongoDB connectivity
- **Blockchain Sync** - Coreum node connection
- **Drand API** - Randomness service availability

### Logging

- **Application Logs** - Business logic and errors
- **Access Logs** - API request/response tracking
- **Security Logs** - Authentication and authorization
- **Performance Logs** - Response times and resource usage

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch** - `git checkout -b feature/amazing-feature`
3. **Make your changes** - Follow our coding standards
4. **Add tests** - Ensure your code is tested
5. **Commit changes** - `git commit -m 'Add amazing feature'`
6. **Push to branch** - `git push origin feature/amazing-feature`
7. **Open a Pull Request** - Describe your changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Coreum** - For the blockchain infrastructure
- **Drand** - For verifiable randomness
- **CosmWasm** - For smart contract framework
- **Angular** - For the frontend framework
- **MongoDB** - For data storage

## 🗺️ Roadmap

- [ ] **Multi-chain Support** - Ethereum, Polygon, BSC
- [ ] **Advanced Raffle Types** - Time-based, lottery-style
- [ ] **Mobile App** - React Native mobile application
- [ ] **Analytics Dashboard** - Advanced statistics and insights
- [ ] **Governance** - DAO-based platform governance
- [ ] **API v2** - Enhanced API with GraphQL support

---

**Built with ❤️ by the DEGEN Raffle Team**

*Transparent. Secure. Decentralized.*
