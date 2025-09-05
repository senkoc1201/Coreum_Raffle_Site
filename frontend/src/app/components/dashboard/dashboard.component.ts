import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RaffleService } from '../../services/raffle.service';
import { WalletService } from '../../services/wallet.service';
import { ParticipantsTableComponent } from '../participants-table/participants-table.component';
import { Raffle } from '../../models/raffle.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ParticipantsTableComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentRaffle: Raffle | null = null;
  ticketQuantity = 1;
  
  constructor(
    public raffleService: RaffleService,
    public walletService: WalletService
  ) {}
  
  ngOnInit() {
    this.currentRaffle = this.raffleService.getCurrentRaffle();
  }
  
  increaseTickets() {
    if (this.currentRaffle && this.ticketQuantity < this.currentRaffle.remainingTickets) {
      this.ticketQuantity++;
    }
  }
  
  decreaseTickets() {
    if (this.ticketQuantity > 1) {
      this.ticketQuantity--;
    }
  }
  
  purchaseTickets() {
    if (this.walletService.isConnected && this.currentRaffle) {
      // Mock purchase logic
      alert(`Purchasing ${this.ticketQuantity} ticket(s) for ${(this.ticketQuantity * this.currentRaffle.pricePerTicket).toFixed(2)} AVAX`);
    } else {
      this.walletService.openModal();
    }
  }
  
  getProgressPercentage(): number {
    if (!this.currentRaffle) return 0;
    return (this.currentRaffle.totalSold / this.currentRaffle.totalTickets) * 100;
  }
}
