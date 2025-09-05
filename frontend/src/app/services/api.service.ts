import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NFT, RaffleStatus, CreateRaffleRequest, BuyTicketRequest, UserTicket, RaffleParticipant } from '../models/user.model';
import { BlockchainNftService } from './blockchain-nft.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // Point to Node backend running on port 3000
  private readonly baseUrl = 'http://localhost:3000/api';
  
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(
    private http: HttpClient,
    private blockchainNftService: BlockchainNftService
  ) {}

  // Store off-chain metadata (description) for a raffle
  async postRaffleMetadata(raffleId: string, metadata: { description?: string }): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/raffles/${raffleId}/metadata`, metadata, this.httpOptions)
      );
    } catch (error) {
      console.error('Failed to save raffle metadata:', error);
      // Don't throw - this is optional data
    }
  }

  // Get active raffles from backend API
  async getActiveRaffles(): Promise<RaffleStatus[]> {
    try {
      console.log('📊 Fetching active raffles from backend...');
      const response = await firstValueFrom(
        this.http.get<{ data: any[] }>(`${this.baseUrl}/raffles?limit=1000`, this.httpOptions)
      );
      const items = response?.data || [];
      console.log(`✅ Backend returned ${items.length} total raffles`);
      
      // Map all raffles and filter for active ones (including time-based filtering)
      const mappedRaffles = items.map((r) => this.mapBackendRaffleToStatus(r));
      const activeRaffles = mappedRaffles.filter(raffle => raffle.status === 'active');
      
      console.log(`🎯 Filtered to ${activeRaffles.length} active raffles`);
      return activeRaffles;
    } catch (error) {
      console.error('❌ Failed to fetch active raffles from backend:', error);
      return [];
    }
  }

  // Get ended raffles from backend API
  async getEndedRaffles(): Promise<RaffleStatus[]> {
    try {
      console.log('📊 Fetching ended raffles from backend...');
      const response = await firstValueFrom(
        this.http.get<{ data: any[] }>(`${this.baseUrl}/raffles?limit=1000`, this.httpOptions)
      );
      const items = response?.data || [];
      console.log(`✅ Backend returned ${items.length} total raffles`);
      
      // Map all raffles and filter for completed/cancelled ones (including time-based filtering)
      const mappedRaffles = items.map((r) => this.mapBackendRaffleToStatus(r));
      const endedRaffles = mappedRaffles.filter(raffle => raffle.status === 'completed' || raffle.status === 'cancelled');
      
      console.log(`🏁 Filtered to ${endedRaffles.length} ended raffles`);
      return endedRaffles;
    } catch (error) {
      console.error('❌ Failed to fetch ended raffles from backend:', error);
      return [];
    }
  }

  // Get specific raffle details from backend API
  async getRaffleDetails(raffleId: string): Promise<RaffleStatus> {
    try {
      console.log(`📊 Fetching raffle ${raffleId} from backend...`);
      const [raffleRes, participantsRes] = await Promise.all([
        firstValueFrom(this.http.get<any>(`${this.baseUrl}/raffles/${raffleId}`, this.httpOptions)),
        firstValueFrom(this.http.get<{ data: any[] }>(`${this.baseUrl}/raffles/${raffleId}/participants`, this.httpOptions)),
      ]);
      
      const status = this.mapBackendRaffleToStatus(raffleRes);
      const participants = (participantsRes?.data || []).map((p) => this.mapBackendParticipant(p));
      console.log(`✅ Retrieved raffle ${raffleId} with ${participants.length} participants`);
      
      return { ...status, participants } as RaffleStatus;
    } catch (error) {
      console.error(`❌ Failed to fetch raffle ${raffleId} from backend:`, error);
      // Return minimal empty raffle
      return {
        id: raffleId,
        status: 'active',
        createdAt: new Date(),
        endsAt: new Date(),
        totalTickets: 0,
        totalSold: 0,
        ticketPrice: 0,
        creator: '',
        prizeNft: {
          id: '',
          tokenId: '',
          name: 'Raffle not found',
          description: '',
          imageUrl: '/assets/bear-mascot.svg',
          collectionAddress: '',
          isEligibleForRaffle: false
        },
        participants: []
      } as RaffleStatus;
    }
  }

  // Get raffles by creator from backend API
  async getRafflesByCreator(creatorAddress: string): Promise<RaffleStatus[]> {
    try {
      console.log(`📊 Fetching raffles by creator ${creatorAddress}...`);
      const res = await firstValueFrom(
        this.http.get<{ data: any[] }>(`${this.baseUrl}/raffles?creator=${creatorAddress}`, this.httpOptions)
      );
      const raffles = (res?.data || []).map((r) => this.mapBackendRaffleToStatus(r));
      console.log(`✅ Found ${raffles.length} raffles by creator ${creatorAddress}`);
      return raffles;
    } catch (error) {
      console.error('❌ Failed to fetch creator raffles from backend:', error);
      return [];
    }
  }

  // NFT discovery - query blockchain directly from frontend
  async getUserNFTs(address: string): Promise<NFT[]> {
    try {
      console.log(`🔍 Querying blockchain for NFTs owned by address: ${address}`);
      
      // Query blockchain directly for user's NFTs
      const discoveredNFTs = await this.blockchainNftService.discoverUserNFTs(address);
      
      console.log(`✅ Blockchain returned ${discoveredNFTs.length} NFTs for ${address}`);
      
      // Log collections found
      const collections = [...new Set(discoveredNFTs.map(nft => nft.collectionAddress))];
      console.log(`📦 Collections found: ${collections.join(', ') || 'none'}`);
      
      return discoveredNFTs;
    } catch (error) {
      console.error(`❌ Failed to fetch NFTs from blockchain for ${address}:`, error);
      
      // Fallback: Create mock NFT for testing if blockchain query fails
      if (address && address.startsWith('testcore')) {
        console.log(`🎭 Blockchain query failed, using fallback mock NFT for testing`);
        return [{
          id: `fallback:testtoken`,
          tokenId: 'testtoken', 
          name: 'Fallback Test NFT',
          description: 'Mock NFT used when blockchain is unavailable',
          imageUrl: '/assets/bear-mascot.svg',
          collectionAddress: 'testcore1tua2qt9ajjddj7xluul2lnc6pvpd02yjraqcz6yuje0tw8f36l3qn3xnnm',
          isEligibleForRaffle: true
        }];
      }
      
      return [];
    }
  }

  // Raffle creation is on-chain via wallet (CW721 send hook), not a backend POST
  async createRaffle(_request: CreateRaffleRequest, _creatorAddress: string): Promise<string> {
    throw new Error('Raffle creation is handled via wallet transaction (CW721 send)');
  }

  // Ticket purchasing endpoints
  async buyTickets(_request: BuyTicketRequest, _playerAddress: string): Promise<UserTicket> {
    // Real flow is via wallet → contract execute; backend endpoint not used
    throw new Error('Ticket purchase is handled via on-chain wallet transaction');
  }

  async getUserTickets(address: string): Promise<UserTicket[]> {
    console.log(`ℹ️ getUserTickets called for ${address} - returning empty (not implemented in backend)`);
    return []; // Backend doesn't have /api/tickets endpoint yet
  }

  // Mapping helpers from backend → frontend model
  private mapBackendRaffleToStatus(r: any): RaffleStatus {
    const statusMap: Record<string, 'active' | 'completed' | 'cancelled'> = {
      OPEN: 'active', 
      ENDED: 'completed', 
      CANCELLED: 'cancelled',
      open: 'active', 
      ended: 'completed', 
      active: 'active', 
      completed: 'completed'
    };
    
    // Get base status from backend
    let status = statusMap[r?.status] || 'active';
    
    // Trust the database status - no client-side filtering needed
    // The automation service handles time-based and sold-out ending
    // The frontend should display exactly what the database contains
    
    const prizeNft: NFT = {
      id: `${r?.cw721Address ?? r?.nftContract}:${r?.tokenId}`,
      tokenId: r?.tokenId ?? '',
      name: r?.tokenId ? `${r.tokenId}` : 'Raffle NFT',
      description: r?.description || '',
      imageUrl: '/assets/bear-mascot.svg',
      collectionAddress: r?.cw721Address ?? r?.nftContract ?? '',
      isEligibleForRaffle: false,
    };
    
          return {
        id: String(r?.raffleId ?? r?.id ?? ''),
        status,
        createdAt: r?.createdAt ? new Date(r.createdAt) : new Date(),
        endsAt: r?.endTime ? new Date(r.endTime) : new Date(),
        winner: r?.winner,
        winningTicketIndex: r?.winnerTicketIndex,
        totalTickets: Number(r?.maxTickets ?? 0),
        totalSold: Number(r?.totalSold ?? r?.ticketsSold ?? 0),
        ticketPrice: Number(r?.ticketPrice ?? 0),
        prizeNft,
        creator: r?.creator ?? '',
        participants: [],
      } as RaffleStatus;
  }

  private mapBackendParticipant(p: any): RaffleParticipant {
    console.log('🔍 Mapping participant:', p); // Debug log
    return {
      address: p?.address ?? '',
      ticketCount: Number(p?.ticketCount ?? 0),
      totalSpent: Number(p?.totalPaid ?? 0), // Convert string to number
      joinedAt: p?.firstPurchase ? new Date(p.firstPurchase) : new Date(),
    } as RaffleParticipant;
  }
}