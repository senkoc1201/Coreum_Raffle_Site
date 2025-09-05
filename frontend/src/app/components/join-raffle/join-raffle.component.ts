import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { LeapWalletService } from '../../services/leap-wallet.service';
import { UserRoleService } from '../../services/user-role.service';
import { RaffleStatus, BuyTicketRequest, UserTicket } from '../../models/user.model';

@Component({
  selector: 'app-join-raffle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './join-raffle.component.html',
  styleUrls: ['./join-raffle.component.scss']
})
export class JoinRaffleComponent implements OnInit, OnDestroy {
  activeRaffles: RaffleStatus[] = [];
  endedRaffles: RaffleStatus[] = [];
  userTickets: UserTicket[] = [];
  loading = false;
  error: string | null = null;
  success: string | null = null;
  
  private refreshSubscription?: Subscription;

  constructor(
    private apiService: ApiService,
    public leapWalletService: LeapWalletService,
    private userRoleService: UserRoleService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadRaffles();
    this.loadUserTickets();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.refreshSubscription?.unsubscribe();
  }

  private async loadRaffles() {
    try {
      this.loading = true;
      this.error = null;
      
      this.activeRaffles = await this.apiService.getActiveRaffles();
      this.endedRaffles = await this.apiService.getEndedRaffles();
      
    } catch (error: any) {
      this.error = 'Failed to load active raffles. Please try again.';
      console.error('Failed to load raffles:', error);
    } finally {
      this.loading = false;
    }
  }

  private async loadUserTickets() {
    if (!this.leapWalletService.isConnected) return;
    
    try {
      this.userTickets = await this.apiService.getUserTickets(this.leapWalletService.address);
    } catch (error) {
      console.error('Failed to load user tickets:', error);
    }
  }

  private startAutoRefresh() {
    // Refresh raffles every 30 seconds
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.loadRaffles();
      this.loadUserTickets();
    });
  }

  async refreshRaffles() {
    await this.loadRaffles();
    await this.loadUserTickets();
  }

  openRaffleDetails(raffle: RaffleStatus) {
    this.router.navigate(['/raffles', raffle.id]);
  }

  // No quantity updates in list view; keep method to satisfy template references in conditional paths
  updateTicketQuantity(_: string, __: number) {}

  // In list view, we do not purchase, so omit purchase helpers

  getProgressPercentage(raffle: RaffleStatus): number {
    return (raffle.totalSold / raffle.totalTickets) * 100;
  }

  getTimeRemaining(raffle: RaffleStatus): string {
    // Show COMPLETED for completed raffles
    if (raffle.status === 'completed') {
      return 'COMPLETED';
    }
    
    const now = new Date();
    const endTime = new Date(raffle.endsAt);
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

  getUserTicketsForRaffle(raffleId: string): UserTicket | undefined {
    return this.userTickets.find(ticket => ticket.raffleId === raffleId);
  }

  getTotalCost(_: string): number { return 0; }

  dismissSuccess() {
    this.success = null;
  }

  dismissError() {
    this.error = null;
  }
}