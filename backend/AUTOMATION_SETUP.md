# DEGEN Raffle - Automated Raffle Ending Setup

## Overview

DEGEN Raffle backend includes a fully automated raffle ending system that:
- ✅ Monitors raffles for expiration (time-based) or sold-out status
- ✅ Uses drand.sh for verifiable randomness 
- ✅ Automatically calls `end_raffle` on the smart contract
- ✅ Earns bounty rewards for ending raffles (if configured by admin)
- ✅ Provides comprehensive logging and error handling

## Environment Configuration

Create a `.env` file in the `backend/` directory with these settings:

```bash
# Coreum Blockchain Configuration
COREUM_RPC_URL=https://full-node.testnet-1.coreum.dev:26657
COREUM_CHAIN_ID=coreum-testnet-1
RAFFLE_CONTRACT_ADDRESS=testcore1lqaqslyw3kqj3tysa6cywh44e8mm2qyx0ps8qqt076kkna6zk8wsfl5p50

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/degen-raffle

# Automation Configuration
AUTOMATION_ENABLED=true
AUTOMATION_INTERVAL_MS=60000
# Create a new wallet and export its private key for automation
AUTOMATION_PRIVATE_KEY=tuna note gesture illness rain female nut upset cluster reveal woman few armed slow brisk elite fantasy timber crystal gap trial type rebel silly

# Indexing Configuration  
INDEXING_ENABLED=true
INDEXING_INTERVAL_MS=30000
INDEXING_START_HEIGHT=1

# Server Configuration
PORT=3000
NODE_ENV=development

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_ENABLED=true
```

## How It Works

### 1. Raffle Monitoring
The automation service checks every 60 seconds for raffles that can be ended:
- **Time expired**: `endTime` has passed (with 30s safety buffer)
- **Sold out**: All tickets have been purchased
- **Has participants**: At least 1 ticket sold (prevents ending empty raffles)

### 2. Drand Integration
- Fetches fresh randomness from **drand.sh** (League of Entropy)
- Validates drand round is recent enough for the raffle
- Provides verifiable, unbiased randomness for winner selection

### 3. Smart Contract Execution
- Constructs `end_raffle` message with drand data
- Signs and broadcasts transaction using automation wallet
- Earns bounty reward for successfully ending raffles (if configured)

### 4. Bounty Reward System
The smart contract includes an optional bounty system to incentivize raffle ending:
- **Admin-configured bounty**: Contract admin can set a bounty amount (e.g., 100000utestcore)
- **Automatic payout**: When someone successfully calls `end_raffle`, they receive the bounty
- **Payment source**: Bounty is deducted from the raffle's total ticket sales
- **Incentivizes automation**: Encourages running automation services to end raffles promptly

### 5. Safety Features
- **30-second buffer** before ending time-expired raffles
- **Drand round validation** prevents using old randomness
- **Comprehensive error handling** with detailed logging
- **Transaction retry logic** for network issues

## Setup Steps

### 1. Create Automation Wallet
```bash
# Generate a new wallet for automation
cored keys add automation-wallet --testnet

# Fund it with testnet tokens for transaction fees
# Get tokens from: https://docs.coreum.dev/docs/next/tools-and-ecosystem/faucet

# Export the private key or mnemonic
cored keys export automation-wallet --unarmored-hex --unsafe
```

### 2. Configure Environment
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start the Backend
```bash
npm install
npm start
```

### 4. Monitor Automation
Check logs for automation activity:
```bash
tail -f backend/logs/combined.log | grep "automation"
```

## API Endpoints

### Get Automation Stats
```bash
GET /api/system/automation-stats
```

Returns:
```json
{
  "enabled": true,
  "running": true,
  "intervalMs": 60000,
  "eligibleRaffles": 2,
  "endedLast24h": 5,
  "totalActiveRaffles": 8
}
```

## Checking Bounty Configuration

To check if the contract has bounty rewards enabled:

```bash
# Query contract configuration
cored query wasm contract-state smart testcore1lqaqslyw3kqj3tysa6cywh44e8mm2qyx0ps8qqt076kkna6zk8wsfl5p50 '{"config":{}}' --node https://full-node.testnet-1.coreum.dev:26657 --chain-id coreum-testnet-1

# Look for "bounty_amount" in the response:
# {
#   "data": {
#     "admin": "testcore1...",
#     "protocol_fee_bps": 500,
#     "bounty_amount": {
#       "denom": "utestcore",
#       "amount": "100000"
#     },
#     ...
#   }
# }
```

If `bounty_amount` is `null`, no bounty is configured. If it shows an amount, that's the reward for ending raffles.

## Troubleshooting

### Common Issues

1. **"Signing client not initialized"**
   - Check `AUTOMATION_PRIVATE_KEY` is set correctly
   - Ensure wallet has testnet tokens for fees

2. **"Failed to get drand randomness"**
   - Check internet connection to drand.sh
   - Service will retry on next cycle

3. **"Drand round is too old"**
   - Normal behavior - ensures fair randomness
   - Automation will wait for fresh drand round

4. **"Transaction failed with code 5"**
   - Usually insufficient funds for fees
   - Add more testnet tokens to automation wallet

### Logs Location
- **Combined logs**: `backend/logs/combined.log`
- **Error logs**: `backend/logs/error.log`
- **Console output**: Real-time automation status

## Security Notes

⚠️ **Important Security Considerations:**

1. **Private Key Security**
   - Store automation private key securely
   - Use environment variables, never commit to git
   - Consider using a dedicated automation wallet

2. **Network Security**
   - Use HTTPS for drand API calls
   - Validate all blockchain responses
   - Monitor for unusual transaction patterns

3. **Error Handling**
   - Failed automations are logged but don't crash the service
   - Manual intervention may be needed for stuck raffles
   - Consider alerting systems for production use

## Production Deployment

For production use:
- Use a dedicated server with high uptime
- Set up monitoring and alerting
- Use a secure key management system
- Consider redundant automation nodes
- Set appropriate gas fees and timeouts
