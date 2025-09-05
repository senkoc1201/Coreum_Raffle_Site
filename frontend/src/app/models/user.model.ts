export interface User {
  address: string;
  roles: UserRole[];
  nfts: NFT[];
  isConnected: boolean;
}

export interface UserRole {
  type: 'creator' | 'player';
  isActive: boolean;
}

export interface NFT {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  imageUrl: string;
  collectionAddress: string;
  isEligibleForRaffle: boolean;
  metadata?: any; // Raw metadata from blockchain
}

export interface CreateRaffleRequest {
  nftId: string;
  ticketPrice: number;
  maxTickets: number;
  duration: number; // in hours
  description?: string;
}

export interface BuyTicketRequest {
  raffleId: string;
  ticketCount: number;
}

export interface RaffleStatus {
  id: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  endsAt: Date;
  winner?: string;
  winningTicketIndex?: number;
  totalTickets: number;
  totalSold: number;
  ticketPrice: number;
  prizeNft: NFT;
  creator: string;
  participants: RaffleParticipant[];
}

export interface RaffleParticipant {
  address: string;
  ticketCount: number;
  totalSpent: number;
  joinedAt: Date;
}

export interface UserTicket {
  raffleId: string;
  ticketNumbers: number[];
  purchaseDate: Date;
  isWinner: boolean;
}