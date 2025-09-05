import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { LeapWalletModalComponent } from './components/leap-wallet-modal/leap-wallet-modal.component';
import { LeapWalletService } from './services/leap-wallet.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, LeapWalletModalComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  showWalletModal = false;

  constructor(public leapWalletService: LeapWalletService) {}

  openWalletModal() {
    this.showWalletModal = true;
  }

  closeWalletModal() {
    this.showWalletModal = false;
  }
}
