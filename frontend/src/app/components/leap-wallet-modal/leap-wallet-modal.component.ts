import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeapWalletService } from '../../services/leap-wallet.service';

@Component({
  selector: 'app-leap-wallet-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leap-wallet-modal.component.html',
  styleUrls: ['./leap-wallet-modal.component.scss']
})
export class LeapWalletModalComponent {
  @Output() close = new EventEmitter<void>();
  
  connecting = false;
  error: string | null = null;

  constructor(public leapWalletService: LeapWalletService) {}

  closeModal() {
    this.close.emit();
  }

  async connectWallet() {
    if (!this.leapWalletService.isWalletInstalled()) {
      this.error = 'Leap wallet extension is not installed. Please install it first.';
      return;
    }

    this.connecting = true;
    this.error = null;

    try {
      await this.leapWalletService.connectWallet();
      this.closeModal();
    } catch (error: any) {
      this.error = error.message || 'Failed to connect wallet. Please try again.';
    } finally {
      this.connecting = false;
    }
  }

  openLeapWebsite() {
    window.open('https://www.leapwallet.io/', '_blank');
  }

  dismissError() {
    this.error = null;
  }
}