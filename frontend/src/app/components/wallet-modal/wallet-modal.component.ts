import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletService } from '../../services/wallet.service';

interface WalletProvider {
  name: string;
  icon: string;
  status?: string;
  action?: string;
}

@Component({
  selector: 'app-wallet-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wallet-modal.component.html',
  styleUrls: ['./wallet-modal.component.scss']
})
export class WalletModalComponent {
  @Output() close = new EventEmitter<void>();
  
  walletProviders: WalletProvider[] = [
    { name: 'WalletConnect', icon: 'fab fa-wallet', action: 'QR CODE' },
    { name: 'MetaMask', icon: 'fab fa-firefox-browser', status: 'INSTALLED' },
    { name: 'Trust Wallet', icon: 'fas fa-shield-alt' },
    { name: 'All Wallets', icon: 'fas fa-th', action: '190+' }
  ];
  
  constructor(private walletService: WalletService) {}
  
  closeModal() {
    this.close.emit();
  }
  
  connectWallet(provider: WalletProvider) {
    // Mock wallet connection
    this.walletService.connectWallet(provider.name);
    this.closeModal();
  }
  
  continueWithGoogle() {
    // Mock Google auth
    this.walletService.connectWallet('Google');
    this.closeModal();
  }
  
  continueWithEmail() {
    // Mock email auth
    alert('Email authentication not implemented in this demo');
  }
}
