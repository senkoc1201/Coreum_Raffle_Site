import { Raffle } from '../models/raffle.model';
import { Participant } from '../models/participant.model';

export const MOCK_RAFFLE: Raffle = {
  id: '1',
  name: 'Big Boi Allocation',
  description: 'Premium NFT Raffle featuring exclusive bear artwork',
  imageUrl: 'https://via.placeholder.com/300x300/8B4513/FFFFFF?text=Bear+NFT',
  contractAddress: '0x891...3E7',
  status: 'CLOSED',
  totalTickets: 10000,
  totalSold: 2749,
  remainingTickets: 7251,
  pricePerTicket: 1.0,
  totalGenerated: 2749.0,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-02-01'),
  winner: '0xdef92...5850',
  winningTicket: 847
};

export const MOCK_PARTICIPANTS: Participant[] = [
  { address: '0x1f1...aabf', tickets: 658, totalSpent: 658.0, joinedAt: new Date() },
  { address: '0x1ac...E5d8', tickets: 302, totalSpent: 302.0, joinedAt: new Date() },
  { address: '0x8A...3tx5', tickets: 179, totalSpent: 179.0, joinedAt: new Date() },
  { address: '0x98e...4xn4', tickets: 167, totalSpent: 167.0, joinedAt: new Date() },
  { address: '0xfb...da07', tickets: 165, totalSpent: 165.0, joinedAt: new Date() },
  { address: '0x77...£w92', tickets: 163, totalSpent: 163.0, joinedAt: new Date() },
  { address: '0xaa1...Orf5', tickets: 157, totalSpent: 157.0, joinedAt: new Date() },
  { address: '0xd4...A1E0', tickets: 108, totalSpent: 108.0, joinedAt: new Date() },
  { address: '0x6E...5ds7', tickets: 105, totalSpent: 105.0, joinedAt: new Date() },
  { address: '0xc3n...fad1', tickets: 101, totalSpent: 101.0, joinedAt: new Date() },
  { address: '0x25...c1k8', tickets: 71, totalSpent: 71.0, joinedAt: new Date() },
  { address: '0xda...b3b1', tickets: 30, totalSpent: 30.0, joinedAt: new Date() },
  { address: '0xd4...ff82', tickets: 30, totalSpent: 30.0, joinedAt: new Date() },
  { address: '0x72...8cr9', tickets: 20, totalSpent: 20.0, joinedAt: new Date() },
  { address: '0xb2...8c08', tickets: 19, totalSpent: 19.0, joinedAt: new Date() },
  { address: '0x9A...1k1c', tickets: 19, totalSpent: 19.0, joinedAt: new Date() },
  { address: '0x5...8r34', tickets: 15, totalSpent: 15.0, joinedAt: new Date() },
  { address: '0xed...5r08', tickets: 14, totalSpent: 14.0, joinedAt: new Date() },
  { address: '0xrs...7k67', tickets: 13, totalSpent: 13.0, joinedAt: new Date() },
  { address: '0xc4...3r36', tickets: 11, totalSpent: 11.0, joinedAt: new Date() }
];
