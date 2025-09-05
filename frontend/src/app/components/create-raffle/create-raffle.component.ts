import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { LeapWalletService } from '../../services/leap-wallet.service';
import { UserRoleService } from '../../services/user-role.service';
import { RaffleContractService } from '../../services/raffle-contract.service';

@Component({
  selector: 'app-create-raffle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-raffle.component.html',
  styleUrls: ['./create-raffle.component.scss']
})
export class CreateRaffleComponent implements OnInit {
  createRaffleForm: FormGroup;
  availableNFTs: any[] = [];
  selectedNFT: any = null;
  loading = false;
  success = false;
  error: string | null = null;
  createdRaffleId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    public leapWalletService: LeapWalletService,
    private userRoleService: UserRoleService,
    private raffleContractService: RaffleContractService
  ) {
    this.createRaffleForm = this.fb.group({
      ticketPrice: [1, [Validators.required, Validators.min(0.1)]],
      maxTickets: [100, [Validators.required, Validators.min(1)]],
      duration: [24, [Validators.required, Validators.min(1)]], // hours
      description: ['']
    });
  }

  ngOnInit() {
    this.loadUserNFTs();
  }

  private async loadUserNFTs() {
    if (!this.leapWalletService.isConnected) {
      return;
    }

    try {
      this.availableNFTs = await this.apiService.getUserNFTs(this.leapWalletService.address);
    } catch (error) {
      console.error('Failed to load NFTs:', error);
    }
  }

  // Template property getter for eligible NFTs
  get eligibleNFTs(): any[] {
    return this.availableNFTs.filter(nft => nft.isEligibleForRaffle);
  }

  // Form error helper method
  getFormError(fieldName: string): string | null {
    const field = this.createRaffleForm.get(fieldName);
    if (field && field.invalid && (field.dirty || field.touched)) {
      if (field.errors?.['required']) {
        return `${fieldName} is required`;
      }
      if (field.errors?.['min']) {
        return `${fieldName} must be greater than ${field.errors['min'].min}`;
      }
    }
    return null;
  }

  selectNFT(nft: any) {
    this.selectedNFT = nft;
  }

  async onSubmit() {
    if (this.createRaffleForm.invalid || !this.selectedNFT) {
      this.error = 'Please fill out all required fields and select an NFT';
      return;
    }

    if (!this.leapWalletService.isConnected) {
      this.error = 'Please connect your Leap wallet first';
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = false;

    try {
      const formValue = this.createRaffleForm.value;
      
      // Calculate end time (current time + duration in hours)
      const endTime = Math.floor(Date.now() / 1000) + (formValue.duration * 3600);
      
      // Prepare raffle parameters
      const raffleParams = {
        nftContract: this.selectedNFT.collectionAddress,
        tokenId: this.selectedNFT.tokenId,
        ticketPrice: this.raffleContractService.coreToUcore(formValue.ticketPrice), // Convert CORE to ucore
        maxTickets: formValue.maxTickets,
        endTime: endTime,
        revenueAddress: this.leapWalletService.address // Creator receives the revenue
      };

      console.log('🎲 Creating raffle with parameters:', raffleParams);

      // Create raffle via smart contract
      const txHash = await this.raffleContractService.createRaffle(raffleParams);
      
      // Store description in backend if provided
      if (formValue.description && formValue.description.trim()) {
        try {
          // Wait a bit for the transaction to be processed
          setTimeout(async () => {
            // Note: We'd need to extract the raffle ID from the transaction events
            // For now, we'll skip storing the description
            console.log('📝 Description would be stored:', formValue.description);
          }, 5000);
        } catch (descError) {
          console.warn('⚠️ Failed to store description:', descError);
          // Don't fail the whole process for this
        }
      }

      // Success!
      this.success = true;
      this.createdRaffleId = txHash;
      this.resetForm();
      
      console.log('✅ Raffle created successfully! Transaction hash:', txHash);

    } catch (error: any) {
      console.error('❌ Failed to create raffle:', error);
      this.error = error.message || 'Failed to create raffle. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  resetForm() {
    this.createRaffleForm.reset({
      ticketPrice: 1,
      maxTickets: 100,
      duration: 24,
      description: ''
    });
    this.selectedNFT = null;
  }

  dismissSuccess() {
    this.success = false;
    this.createdRaffleId = null;
  }

  dismissError() {
    this.error = null;
  }
}