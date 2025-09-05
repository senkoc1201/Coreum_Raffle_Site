import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { LeapWalletService } from './leap-wallet.service';
import { ApiService } from './api.service';
import { User, UserRole, NFT } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserRoleService {
  private userSubject = new BehaviorSubject<User | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public user$ = this.userSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  constructor(
    private leapWalletService: LeapWalletService,
    private apiService: ApiService
  ) {
    this.initializeUserTracking();
  }

  private initializeUserTracking(): void {
    combineLatest([
      this.leapWalletService.isConnected$,
      this.leapWalletService.address$
    ]).pipe(
      switchMap(([isConnected, address]) => {
        if (isConnected && address) {
          return this.loadUserData(address);
        } else {
          this.userSubject.next(null);
          return [];
        }
      })
    ).subscribe();
  }

  private async loadUserData(address: string): Promise<void> {
    try {
      this.loadingSubject.next(true);

      // Fetch user's NFTs from API
      const nfts = await this.apiService.getUserNFTs(address);
      
      // Determine user roles based on NFT ownership and other criteria
      const roles = this.determineUserRoles(nfts, address);

      const user: User = {
        address,
        roles,
        nfts,
        isConnected: true
      };

      this.userSubject.next(user);
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Set basic user info even if NFT loading fails
      const user: User = {
        address,
        roles: [{ type: 'player', isActive: true }], // Default to player role
        nfts: [],
        isConnected: true
      };
      this.userSubject.next(user);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  private determineUserRoles(nfts: NFT[], address: string): UserRole[] {
    const roles: UserRole[] = [];

    // Player role - everyone can be a player
    roles.push({ type: 'player', isActive: true });

    // Creator role - user must own eligible NFTs
    const hasEligibleNFTs = nfts.some(nft => nft.isEligibleForRaffle);
    if (hasEligibleNFTs) {
      roles.push({ type: 'creator', isActive: true });
    }

    return roles;
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  hasRole(roleType: 'creator' | 'player'): boolean {
    const user = this.currentUser;
    if (!user) return false;
    
    return user.roles.some(role => role.type === roleType && role.isActive);
  }

  canCreateRaffles(): boolean {
    return this.hasRole('creator') && this.getEligibleNFTs().length > 0;
  }

  canJoinRaffles(): boolean {
    return this.hasRole('player');
  }

  getEligibleNFTs(): NFT[] {
    const user = this.currentUser;
    if (!user) return [];
    
    return user.nfts.filter(nft => nft.isEligibleForRaffle);
  }

  async refreshUserData(): Promise<void> {
    const address = this.leapWalletService.address;
    if (address) {
      await this.loadUserData(address);
    }
  }
}