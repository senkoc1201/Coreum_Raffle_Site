import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LeapWalletService } from '../../services/leap-wallet.service';
import { UserRoleService } from '../../services/user-role.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  @Output() walletModalOpen = new EventEmitter<void>();

  constructor(
    public leapWalletService: LeapWalletService,
    public userRoleService: UserRoleService
  ) {}

  openWalletModal() {
    this.walletModalOpen.emit();
  }

  async disconnectWallet() {
    await this.leapWalletService.disconnectWallet();
  }
}
