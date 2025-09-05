export interface Raffle {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  contractAddress: string;
  status: 'ACTIVE' | 'CLOSED' | 'COMPLETED';
  totalTickets: number;
  totalSold: number;
  remainingTickets: number;
  pricePerTicket: number;
  totalGenerated: number;
  startDate: Date;
  endDate: Date;
  winner?: string;
  winningTicket?: number;
}
