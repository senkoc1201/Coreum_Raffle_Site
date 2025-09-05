import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { LeapWalletService } from '../../services/leap-wallet.service';
import { RaffleContractService } from '../../services/raffle-contract.service';
import { RaffleStatus } from '../../models/user.model';
import { ParticipantsTableComponent } from '../participants-table/participants-table.component';

@Component({
  selector: 'app-raffle-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ParticipantsTableComponent],
  templateUrl: './raffle-details.component.html',
  styleUrls: ['./raffle-details.component.scss']
})
export class RaffleDetailsComponent implements OnInit {
  raffle: RaffleStatus | null = null;
  loading = false;
  purchasing = false;
  error: string | null = null;
  success: string | null = null;
  ticketQuantity = 1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    public leapWalletService: LeapWalletService,
    private raffleContractService: RaffleContractService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const raffleId = params['id'];
      if (raffleId) {
        this.load(raffleId);
      }
    });
  }

  private async load(raffleId?: string) {
    const id = raffleId || this.raffle?.id;
    if (!id) return;

    try {
      this.loading = true;
      this.error = null;
      
      this.raffle = await this.apiService.getRaffleDetails(id);
      
      // Debug logging for participants
      console.log('🔍 Raffle loaded:', this.raffle);
      console.log('👥 Participants data:', this.raffle.participants);
      console.log('📊 Participants count:', this.raffle.participants?.length || 0);
      
      // Additional debug info
      if (this.raffle.participants && this.raffle.participants.length > 0) {
        console.log('✅ Participants found - table should display');
        this.raffle.participants.forEach((p, i) => {
          console.log(`  ${i+1}. ${p.address}: ${p.ticketCount} tickets, ${p.totalSpent} CORE`);
        });
      } else {
        console.log('❌ No participants found - table will be empty');
      }
      
    } catch (error: any) {
      this.error = 'Failed to load raffle details. Please try again.';
      console.error('Failed to load raffle:', error);
    } finally {
      this.loading = false;
    }
  }

  // Template method for back navigation
  back() {
    this.goBack();
  }

  // Template method for adjusting ticket quantity
  adjustQuantity(change: number) {
    const newQuantity = this.ticketQuantity + change;
    const maxBuyable = this.getMaxBuyableTickets();
    
    if (newQuantity >= 1 && newQuantity <= maxBuyable) {
      this.ticketQuantity = newQuantity;
    }
  }

  async buyTickets() {
    if (!this.raffle) {
      this.error = 'Raffle data not loaded.';
      return;
    }

    if (!this.leapWalletService.isConnected) {
      this.error = 'Please connect your Leap wallet first.';
      return;
    }

    const maxBuyable = this.getMaxBuyableTickets();
    if (this.ticketQuantity <= 0 || this.ticketQuantity > maxBuyable) {
      this.error = `Invalid ticket quantity. You can buy 1-${maxBuyable} tickets.`;
      return;
    }

    if (this.raffle.status !== 'active') {
      this.error = 'This raffle is not active.';
      return;
    }

    this.purchasing = true;
    this.error = null;
    this.success = null;

    try {
      // Convert ticket price from CORE to ucore for the smart contract
      const ticketPriceUcore = this.raffleContractService.coreToUcore(this.raffle.ticketPrice);
      const totalCostCore = this.getTotalCost();
      
      // Check wallet balance before proceeding
      await this.leapWalletService.updateBalance();
      const walletBalance = Number(this.leapWalletService.balance);
      
      if (walletBalance < totalCostCore) {
        this.error = `Insufficient funds! You need ${totalCostCore} TESTCORE but only have ${walletBalance} TESTCORE. Please add funds to your wallet using the Coreum testnet faucet.`;
        return;
      }
      
      console.log(`🎫 Attempting to buy ${this.ticketQuantity} tickets`);
      console.log(`💰 Ticket price: ${this.raffle.ticketPrice} TESTCORE (${ticketPriceUcore} utestcore)`);
      console.log(`💳 Total cost: ${totalCostCore} TESTCORE`);

      // Buy tickets via smart contract
      const txHash = await this.raffleContractService.buyTickets(
        Number(this.raffle.id),
        this.ticketQuantity,
        ticketPriceUcore
      );

      // Success!
      this.success = `🎉 Successfully purchased ${this.ticketQuantity} ticket${this.ticketQuantity > 1 ? 's' : ''}! Transaction: ${txHash}`;
      
      // Reset quantity
      this.ticketQuantity = 1;
      
      // Refresh raffle data after a delay to show updated ticket counts
      setTimeout(() => {
        this.load();
      }, 3000);

      console.log(`✅ Tickets purchased successfully! Tx hash: ${txHash}`);

    } catch (error: any) {
      console.error('❌ Failed to purchase tickets:', error);
      this.error = error?.message || 'Failed to purchase tickets. Please try again.';
    } finally {
      this.purchasing = false;
    }
  }

  getMaxBuyableTickets(): number {
    if (!this.raffle) return 0;
    return Math.max(0, this.raffle.totalTickets - this.raffle.totalSold);
  }

  getTotalCost(): number {
    return this.ticketQuantity * (this.raffle?.ticketPrice || 0);
  }

  getProgressPercentage(): number {
    if (!this.raffle) return 0;
    return (this.raffle.totalSold / this.raffle.totalTickets) * 100;
  }

  getTimeRemaining(): string {
    if (!this.raffle) return '';
    
    const now = new Date();
    const endTime = new Date(this.raffle.endsAt);
    const timeDiff = endTime.getTime() - now.getTime();

    if (timeDiff <= 0) {
      return 'Expired';
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  goBack() {
    this.router.navigate(['/join']);
  }

  dismissSuccess() {
    this.success = null;
  }

  dismissError() {
    this.error = null;
  }

  async refreshBalance() {
    try {
      await this.leapWalletService.updateBalance();
      console.log(`🔄 Balance refreshed: ${this.leapWalletService.balance} TESTCORE`);
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  }
}
