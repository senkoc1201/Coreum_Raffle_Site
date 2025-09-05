import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Participant } from '../../models/participant.model';
import { RaffleParticipant } from '../../models/user.model';

type AnyParticipant = Participant | RaffleParticipant;

@Component({
  selector: 'app-participants-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './participants-table.component.html',
  styleUrls: ['./participants-table.component.scss']
})

export class ParticipantsTableComponent implements OnChanges {
  @Input() participants: AnyParticipant[] = [];
  @Input() totalRaffleTickets: number = 100; // Total tickets in the raffle
  currentPage = 1;
  itemsPerPage = 11;
  totalPages = 1;
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['participants']) {
      console.log('🎯 ParticipantsTable received participants:', this.participants);
      console.log('📊 Participants count:', this.participants?.length || 0);
      if (this.participants && this.participants.length > 0) {
        console.log('📋 First participant:', this.participants[0]);
        console.log('🔍 Participant properties:', Object.keys(this.participants[0]));
      }
      this.totalPages = Math.ceil(this.participants.length / this.itemsPerPage) || 1;
      this.currentPage = 1;
    }
    
    if (changes['totalRaffleTickets']) {
      console.log('🎫 Total raffle tickets updated:', this.totalRaffleTickets);
    }
  }
  
  get paginatedParticipants(): AnyParticipant[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.participants.slice(start, end);
  }
  
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }
  
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
  
  getTickets(p: AnyParticipant): number {
    if (!p) return 0;
    // Handle RaffleParticipant type (from API)
    if ('ticketCount' in p) {
      return (p as RaffleParticipant).ticketCount || 0;
    }
    // Handle legacy Participant type
    if ('tickets' in p) {
      return (p as Participant).tickets || 0;
    }
    return 0;
  }

  getAddress(p: AnyParticipant): string {
    if (!p) {
      console.log('⚠️ getAddress called with null/undefined participant');
      return '';
    }
    const address = p.address || '';
    console.log('📍 getAddress called:', { participant: p, address });
    return address;
  }

  getTotalSpent(p: AnyParticipant): number {
    if (!p) return 0;
    // Handle RaffleParticipant type (from API)
    if ('totalSpent' in p) {
      return (p as RaffleParticipant).totalSpent || 0;
    }
    // Handle legacy Participant type
    if ('totalSpent' in p) {
      return (p as any).totalSpent || 0;
    }
    return 0;
  }

  calculateWinChanceFor(p: AnyParticipant): number {
    const tickets = this.getTickets(p);
    // Use totalRaffleTickets (100) instead of just tickets sold (25)
    return this.totalRaffleTickets > 0 ? (tickets / this.totalRaffleTickets) * 100 : 0;
  }

  // Removed trackByAddress function to fix binding issues
}
