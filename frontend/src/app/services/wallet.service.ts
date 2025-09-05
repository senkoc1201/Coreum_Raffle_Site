import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  public isConnected = false;
  public connectedAddress = '';
  public connectedProvider = '';
  public showModal = false;

  openModal() {
    this.showModal = true;
  }
  
  closeModal() {
    this.showModal = false;
  }
  
  connectWallet(provider: string) {
    // Mock wallet connection
    this.isConnected = true;
    this.connectedProvider = provider;
    this.connectedAddress = this.generateMockAddress();
  }
  
  disconnectWallet() {
    this.isConnected = false;
    this.connectedAddress = '';
    this.connectedProvider = '';
  }
  
  private generateMockAddress(): string {
    // Generate a mock wallet address
    return '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
  }
}
