import { Injectable } from '@angular/core';
import { LeapWalletService } from './leap-wallet.service';

export interface CreateRaffleParams {
  nftContract: string;
  tokenId: string;
  ticketPrice: string; // In CORE (e.g., "1000000" for 1 CORE)
  maxTickets: number;
  startTime?: number; // Unix timestamp, optional
  endTime: number; // Unix timestamp
  revenueAddress?: string; // Optional, defaults to creator
  paymentCw20?: string; // Optional CW20 token address
}

@Injectable({
  providedIn: 'root'
})
export class RaffleContractService {
  // Your deployed raffle contract address (Coreum Mainnet)
  private readonly RAFFLE_CONTRACT_ADDRESS = 'core1nw29p6jfmm0d62dw2m0g7sz5zw8q6sgjt7pg6scgpz4s4ylkye8s03peml';

  constructor(private leapWallet: LeapWalletService) {}

  /**
   * Create a raffle by sending an NFT to the raffle contract
   * This uses the CW721 send_nft hook mechanism
   * @param params - Raffle creation parameters
   * @returns Transaction hash
   */
  async createRaffle(params: CreateRaffleParams): Promise<string> {
    try {
      console.log('🎲 Creating raffle with params:', params);

      // Validate parameters
      this.validateRaffleParams(params);

      // Prepare the message that will be sent with the NFT
      // Note: nft_contract and token_id are automatically extracted from the CW721 transfer
      const raffleMsg = {
        price: {
          denom: 'ucore', // Coreum mainnet token  
          amount: params.ticketPrice
        },
        max_tickets: params.maxTickets,
        start_time: params.startTime ? (params.startTime * 1_000_000_000).toString() : null,
        end_time: (params.endTime * 1_000_000_000).toString(),
        revenue_address: params.revenueAddress || this.leapWallet.address,
        payment_cw20: params.paymentCw20 || null
      };

      // Send NFT to the raffle contract with the raffle creation message
      const txHash = await this.leapWallet.sendNFT(
        params.nftContract,
        params.tokenId,
        this.RAFFLE_CONTRACT_ADDRESS,
        raffleMsg
      );

      console.log('✅ Raffle created successfully! Tx hash:', txHash);
      return txHash;

    } catch (error) {
      console.error('❌ Failed to create raffle:', error);
      throw new Error(`Failed to create raffle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Buy tickets for a raffle
   * @param raffleId - Raffle ID  
   * @param ticketCount - Number of tickets to buy
   * @param ticketPrice - Price per ticket in ucore
   * @returns Transaction hash
   */
  async buyTickets(raffleId: number, ticketCount: number, ticketPrice: string): Promise<string> {
    try {
      if (!this.leapWallet.isConnected) {
        throw new Error('Wallet not connected');
      }

      if (ticketCount <= 0) {
        throw new Error('Ticket count must be greater than 0');
      }

      // Calculate total payment amount
      const totalAmount = (Number(ticketPrice) * ticketCount).toString();
      
      console.log(`🎫 Buying ${ticketCount} tickets for raffle ${raffleId}`);
      console.log(`💰 Total payment: ${totalAmount} ucore (${this.ucoreToCore(totalAmount)} CORE)`);

      const msg = {
        buy_tickets: {
          raffle_id: raffleId,
          count: ticketCount
        }
      };

      const funds = [{
        denom: 'ucore', // Coreum mainnet token
        amount: totalAmount
      }];

      const txHash = await this.leapWallet.executeContract(
        this.RAFFLE_CONTRACT_ADDRESS,
        msg,
        funds
      );

      console.log(`✅ Tickets purchased successfully! Tx hash: ${txHash}`);
      return txHash;

    } catch (error) {
      console.error('❌ Failed to buy tickets:', error);
      throw new Error(`Failed to buy tickets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * End a raffle (permissionless)
   * @param raffleId - Raffle ID
   * @param drandRound - Drand round for randomness
   * @param randomness - Drand randomness value
   * @param signature - Drand signature
   */
  async endRaffle(raffleId: number, drandRound: number, randomness: string, signature: string): Promise<string> {
    try {
      const msg = {
        end_raffle: {
          raffle_id: raffleId,
          drand_round: drandRound,
          randomness,
          signature
        }
      };

      return await this.leapWallet.executeContract(
        this.RAFFLE_CONTRACT_ADDRESS,
        msg
      );

    } catch (error) {
      console.error('❌ Failed to end raffle:', error);
      throw new Error(`Failed to end raffle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel a raffle (creator only)
   * @param raffleId - Raffle ID
   */
  async cancelRaffle(raffleId: number): Promise<string> {
    try {
      const msg = {
        cancel_raffle: {
          raffle_id: raffleId
        }
      };

      return await this.leapWallet.executeContract(
        this.RAFFLE_CONTRACT_ADDRESS,
        msg
      );

    } catch (error) {
      console.error('❌ Failed to cancel raffle:', error);
      throw new Error(`Failed to cancel raffle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  /**
   * Validate raffle creation parameters
   * @param params - Parameters to validate
   */
  private validateRaffleParams(params: CreateRaffleParams): void {
    if (!params.nftContract || !params.nftContract.startsWith('core')) {
      throw new Error('Invalid NFT contract address');
    }

    if (!params.tokenId || params.tokenId.trim() === '') {
      throw new Error('Token ID is required');
    }

    if (!params.ticketPrice || isNaN(Number(params.ticketPrice)) || Number(params.ticketPrice) <= 0) {
      throw new Error('Invalid ticket price');
    }

    if (!params.maxTickets || params.maxTickets <= 0) {
      throw new Error('Max tickets must be greater than 0');
    }

    if (!params.endTime || params.endTime <= Date.now() / 1000) {
      throw new Error('End time must be in the future');
    }

    if (params.startTime && params.startTime >= params.endTime) {
      throw new Error('Start time must be before end time');
    }

    console.log('✅ Raffle parameters validated successfully');
  }

  /**
   * Convert CORE amount to microCORE (ucore)
   * @param coreAmount - Amount in CORE
   * @returns Amount in ucore
   */
  coreToUcore(coreAmount: number): string {
    return (coreAmount * 1_000_000).toString();
  }

  /**
   * Convert microCORE to CORE
   * @param ucoreAmount - Amount in ucore
   * @returns Amount in CORE
   */
  ucoreToCore(ucoreAmount: string): number {
    return Number(ucoreAmount) / 1_000_000;
  }

  /**
   * Get the raffle contract address
   */
  getContractAddress(): string {
    return this.RAFFLE_CONTRACT_ADDRESS;
  }
}
