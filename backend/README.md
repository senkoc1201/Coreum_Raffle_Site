# Coreum Raffle Indexer & API

A comprehensive Node.js backend service for indexing Coreum blockchain raffle events and providing API endpoints for the Angular frontend. This service replaces the SubQuery + PostgreSQL approach with a direct MongoDB solution.

## Architecture

```
Coreum Blockchain → Node.js Indexer → MongoDB → REST API → Angular Frontend
                                   ↓
                              Automation Service
```

## Features

- **Direct Blockchain Indexing**: Listen to Coreum blockchain events using CosmJS
- **MongoDB Storage**: Store all raffle, ticket, and participant data in MongoDB
- **REST API**: Comprehensive API endpoints for the Angular frontend
- **Automation Service**: Automatically end raffles when conditions are met
- **drand Integration**: Use drand.sh for verifiable randomness (no fake randomness)
- **Real-time Processing**: Process blockchain events as they happen
- **Graceful Shutdown**: Proper cleanup and shutdown handling

## Prerequisites

- Node.js 18+
- MongoDB 6.0+
- Access to Coreum blockchain RPC endpoint
- Private key for automation (Base64 encoded)

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB**:
   ```bash
   # Local MongoDB
   mongod --dbpath ./data

   # Or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:6
   ```

## Configuration

Edit `.env` file with your settings:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/degen-raffle

# Coreum Blockchain
COREUM_RPC_URL=https://full-node.mainnet-1.coreum.dev:26657
COREUM_CHAIN_ID=coreum-mainnet-1
RAFFLE_CONTRACT_ADDRESS=core1your_contract_address

# Automation
AUTOMATION_PRIVATE_KEY=your_base64_private_key
AUTOMATION_ENABLED=true

# Server
PORT=8080
LOG_LEVEL=info
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Health Check
```bash
curl http://localhost:8080/api/system/health
```

## API Endpoints

### Raffles

- `GET /api/raffles` - List all raffles (with filtering & pagination)
- `GET /api/raffles/:id` - Get specific raffle details
- `GET /api/raffles/:id/participants` - Get raffle participants
- `GET /api/raffles/:id/tickets` - Get raffle tickets
- `GET /api/raffles/status/active` - Get only active raffles
- `GET /api/raffles/status/ended` - Get only ended raffles
- `GET /api/raffles/user/:address` - Get user's raffles (created or participated)
- `GET /api/raffles/stats/overview` - Get overall statistics

### System Management

- `GET /api/system/health` - Health check
- `GET /api/system/status` - Detailed system status
- `POST /api/system/indexer/start` - Start indexer manually
- `POST /api/system/indexer/stop` - Stop indexer manually
- `POST /api/system/automation/start` - Start automation manually
- `POST /api/system/automation/stop` - Stop automation manually
- `POST /api/system/indexer/process` - Process specific block range manually

## Services

### 1. Blockchain Service (`src/services/blockchain.js`)
- Connects to Coreum RPC using CosmJS
- Listens for contract events
- Provides signing capabilities for automation
- Handles transaction broadcasting

### 2. Indexer Service (`src/services/indexer.js`)
- Processes blockchain events in real-time
- Stores data in MongoDB
- Handles event parsing and data transformation
- Supports batch processing and error recovery

### 3. Automation Service (`src/services/automation.js`)
- Monitors raffles for end conditions
- Calls `end_raffle()` automatically
- Uses drand.sh for verifiable randomness
- Provides automation statistics

## Data Models

### Raffle
```javascript
{
  raffleId: String,          // Contract raffle ID
  creator: String,           // Creator address
  cw721Address: String,      // NFT contract address
  tokenId: String,           // NFT token ID
  ticketPrice: String,       // Price per ticket
  maxTickets: Number,        // Maximum tickets
  ticketsSold: Number,       // Current tickets sold
  startTime: Date,           // Raffle start time
  endTime: Date,             // Raffle end time
  status: String,            // OPEN, ENDED, CANCELLED
  winner: String,            // Winner address (when ended)
  paymentType: String,       // native or cw20
  revenueAddress: String     // Where proceeds go
}
```

### Ticket
```javascript
{
  raffleId: String,          // Associated raffle
  ticketIndex: Number,       // Ticket number
  buyer: String,             // Buyer address
  purchaseTime: Date,        // Purchase timestamp
  amountPaid: String,        // Amount paid
  txHash: String             // Transaction hash
}
```

### Participant
```javascript
{
  raffleId: String,          // Associated raffle
  address: String,           // Participant address
  ticketCount: Number,       // Total tickets owned
  totalPaid: String,         // Total amount paid
  firstPurchase: Date,       // First purchase time
  lastPurchase: Date         // Last purchase time
}
```

## Event Processing

The indexer processes these contract events:

1. **raffle_created** → Creates new Raffle record
2. **tickets_bought** → Creates Ticket records, updates Participant
3. **raffle_ended** → Updates Raffle status and end details
4. **winner_selected** → Sets winner information
5. **raffle_cancelled** → Updates status to cancelled
6. **refund_claimed** → Creates Refund record

## Automation

The automation service:

1. **Monitors** active raffles every minute
2. **Checks** end conditions (time expired OR sold out)
3. **Fetches** fresh randomness from drand.sh
4. **Calls** `end_raffle()` on the smart contract
5. **Logs** all automation actions

### drand Integration

Uses the League of Entropy mainnet for verifiable randomness:
- Endpoint: `https://api.drand.sh/public/latest`
- BLS12-381 signatures for verification
- Prevents precomputation attacks
- No fake randomness

## Monitoring

### Health Checks
- `/api/system/health` - Overall system health
- `/api/system/status` - Detailed component status

### Logging
- Structured logging with Winston
- Log levels: error, warn, info, debug
- File and console output
- Request/response logging

### Error Handling
- Graceful error recovery
- Retry mechanisms for blockchain calls
- Comprehensive error logging
- Proper HTTP status codes

## Development

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Database Reset
```bash
# Drop and recreate collections
npm run db:reset
```

## Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 8080
CMD ["npm", "start"]
```

### Environment Variables
All configuration is done via environment variables. See `env.example` for the complete list.

### Production Considerations
- Use MongoDB replica set for high availability
- Configure proper logging aggregation
- Set up monitoring and alerting
- Use PM2 or similar for process management
- Configure reverse proxy (nginx/apache)
- Enable SSL/TLS termination

## Support

For issues and questions:
1. Check the logs: `tail -f logs/combined.log`
2. Verify configuration: `GET /api/system/status`
3. Check MongoDB connection: `GET /api/system/health`
4. Review blockchain connectivity in status endpoint

## License

MIT License
