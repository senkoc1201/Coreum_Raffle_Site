import { Injectable } from '@angular/core';
import { Raffle } from '../models/raffle.model';
import { Participant } from '../models/participant.model';
import { MOCK_RAFFLE, MOCK_PARTICIPANTS } from '../data/mock-data';

@Injectable({
  providedIn: 'root'
})
export class RaffleService {
  private currentRaffle: Raffle = MOCK_RAFFLE;
  private participants: Participant[] = MOCK_PARTICIPANTS;

  getCurrentRaffle(): Raffle {
    return this.currentRaffle;
  }
  
  getParticipants(): Participant[] {
    return this.participants;
  }
  
  purchaseTickets(quantity: number): boolean {
    // Mock purchase logic
    if (quantity <= this.currentRaffle.remainingTickets) {
      this.currentRaffle.totalSold += quantity;
      this.currentRaffle.remainingTickets -= quantity;
      this.currentRaffle.totalGenerated += quantity * this.currentRaffle.pricePerTicket;
      return true;
    }
    return false;
  }
}
