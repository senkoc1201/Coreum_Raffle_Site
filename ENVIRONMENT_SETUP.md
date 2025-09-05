# DEGEN Raffle - Environment Setup Guide

## 🔐 Environment Variables Required

Create a `.env` file in the `backend/` directory with the following variables:

### Coreum Blockchain Configuration
```bash
COREUM_CHAIN_ID=coreum-testnet-01
COREUM_NODE=https://full-node.testnet-1.coreum.dev:26657
COREUM_DENOM=utestcore
RAFFLE_CONTRACT_ADDRESS=coreum1...
```

### Wallet Configuration
```bash
WALLET_MNEMONIC="your twelve word mnemonic phrase goes here"
WALLET_ADDRESS=coreum1...
```

### Backend Configuration
```bash
PORT=3000
NODE_ENV=development
```

### MongoDB Configuration
```bash
MONGODB_URI=mongodb://localhost:27017/degen-raffle
MONGODB_DB_NAME=degen-raffle
```

### Drand Configuration
```bash
DRAND_NETWORK=mainnet
DRAND_PUBLIC_KEY=868f005eb8e6e4ca0a47c8a77ceaa5309a47978a7c71bc5cce96366b5d7a569937c529eeda66c7293784a9402801af31
DRAND_ROUND_SECONDS=30
```

## 🚨 Security Notes

- **Never commit `.env` files to version control**
- **Keep your mnemonic phrase secure and private**
- **Use different wallets for testnet and mainnet**
- **Regularly rotate your private keys**

## 📁 Files Excluded from Git

The following files and directories are automatically excluded from version control:

- `.env*` files (except `.env.example`)
- `node_modules/` directories
- `target/` and `artifacts/` directories
- `*.wasm` files
- `backend/db/` (MongoDB data)
- `frontend/dist/` (build output)
- Test files (`backend/test-*.js`)
- Log files (`*.log`)
- IDE files (`.vscode/`, `.idea/`)

## 🛠️ Quick Setup

1. **Clone the repository**
2. **Copy environment template**: `cp backend/.env.example backend/.env`
3. **Fill in your values** in `backend/.env`
4. **Install dependencies**: `npm install` (in both `backend/` and `frontend/`)
5. **Start MongoDB**: `mongod`
6. **Start backend**: `cd backend && npm start`
7. **Start frontend**: `cd frontend && npm start`

## 🔧 Development

- Backend runs on `http://localhost:3000`
- Frontend runs on `http://localhost:4200`
- MongoDB runs on `mongodb://localhost:27017`
