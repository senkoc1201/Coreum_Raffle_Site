import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
  
  // Pagination properties
  currentPage = 1;
  itemsPerPage = 10; // Changed default to 10 to match the screenshot
  pageSizeOptions = [10, 20, 50, 100];

  constructor(
    private fb: FormBuilder,
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
    
    // Subscribe to wallet connection changes
    this.leapWalletService.isConnected$.subscribe(isConnected => {
      if (isConnected) {
        this.loadUserNFTs();
      } else {
        this.availableNFTs = [];
        this.selectedNFT = null;
      }
    });
  }

  private async loadUserNFTs() {
    if (!this.leapWalletService.isConnected) {
      this.availableNFTs = [];
      return;
    }

    try {
      console.log('🔄 Loading NFTs for connected wallet...');
      
      // Always use Leap wallet service for NFT fetching
      await this.leapWalletService.fetchNFTs();
      
      if (this.leapWalletService.nfts && this.leapWalletService.nfts.length > 0) {
        // Convert Leap wallet NFTs to our format
        this.availableNFTs = this.leapWalletService.nfts.map(nft => {
          console.log(`🖼️ Mapping NFT: ${nft.name}, image: ${nft.image}, type: ${nft.type}`);
          return {
            id: nft.id,
            name: nft.name,
            description: nft.description || 'NFT from Leap wallet',
            imageUrl: nft.image,
            collectionAddress: nft.contract,
            tokenId: nft.tokenId,
            collection: nft.collection,
            isEligibleForRaffle: true // All NFTs from wallet are eligible
          };
        });
        console.log('✅ Loaded NFTs from Leap wallet:', this.availableNFTs.length);
        console.log('🖼️ NFT images:', this.availableNFTs.map(nft => ({ name: nft.name, imageUrl: nft.imageUrl })));
      } else {
        // No NFTs found in wallet
        this.availableNFTs = [];
        console.log('ℹ️ No NFTs found in wallet');
        console.log('💡 Try running: await window.leapWalletService.testNFTFetching() in console');
      }
    } catch (error) {
      console.error('Failed to load NFTs:', error);
      this.availableNFTs = [];
    }
  }

  // Template property getter for eligible NFTs
  get eligibleNFTs(): any[] {
    return this.availableNFTs.filter(nft => nft.isEligibleForRaffle);
  }

  // Pagination getters
  get paginatedNFTs(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.eligibleNFTs.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.eligibleNFTs.length / this.itemsPerPage);
  }

  get hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  get hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  get paginationInfo(): string {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endIndex = Math.min(this.currentPage * this.itemsPerPage, this.eligibleNFTs.length);
    return `Showing ${startIndex}-${endIndex} of ${this.eligibleNFTs.length} NFTs`;
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

  onImageError(event: any, nft: any) {
    console.error(`❌ Failed to load image for NFT ${nft.name}:`, nft.imageUrl);
    console.log(`🖼️ NFT data:`, nft);
    
    // Set a fallback image
    event.target.src = 'https://via.placeholder.com/300x300/20C789/FFFFFF?text=NFT+Image+Not+Found';
  }

  onImageLoad(event: any, nft: any) {
    console.log(`✅ Successfully loaded image for NFT ${nft.name}:`, nft.imageUrl);
  }

  async refreshNFTs() {
    if (!this.leapWalletService.isConnected) {
      return;
    }

    try {
      await this.leapWalletService.refreshNFTs();
      await this.loadUserNFTs();
      this.resetPagination(); // Reset to first page when refreshing
      console.log('✅ NFTs refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh NFTs:', error);
    }
  }

  // Pagination methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage() {
    if (this.hasNextPage) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.hasPreviousPage) {
      this.currentPage--;
    }
  }

  changePageSize(newSize: number) {
    this.itemsPerPage = newSize;
    this.currentPage = 1; // Reset to first page when changing page size
  }

  resetPagination() {
    this.currentPage = 1;
  }

  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);

      if (currentPage <= 4) {
        // Show pages 2-5, then ellipsis, then last page
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Show first page, ellipsis, then last 4 pages
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show first page, ellipsis, current page and neighbors, ellipsis, last page
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  }

  // Helper method for page size change
  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newSize = parseInt(target.value, 10);
    this.changePageSize(newSize);
  }

  // Helper method for page click
  onPageClick(page: number | string): void {
    if (page !== '...' && typeof page === 'number') {
      this.goToPage(page);
    }
  }
}