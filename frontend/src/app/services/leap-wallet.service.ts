import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { OfflineDirectSigner } from '@cosmjs/proto-signing';

declare global {
  interface Window {
    leap?: {
      enable: (chainIds: string[]) => Promise<void>;
      getKey: (chainId: string) => Promise<{
        name: string;
        algo: string;
        pubKey: Uint8Array;
        address: Uint8Array;
        bech32Address: string;
      }>;
      signAmino: (chainId: string, signer: string, signDoc: any) => Promise<any>;
      signDirect: (chainId: string, signer: string, signDoc: any) => Promise<any>;
      sendTx: (chainId: string, tx: Uint8Array, mode: any) => Promise<any>;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class LeapWalletService {
  private readonly COREUM_CHAIN_ID = 'coreum-testnet-1';
  private readonly COREUM_RPC = 'https://full-node.testnet-1.coreum.dev:26657';
  
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private addressSubject = new BehaviorSubject<string>('');
  private balanceSubject = new BehaviorSubject<string>('0');
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private signingClient: SigningCosmWasmClient | null = null;

  public isConnected$ = this.connectedSubject.asObservable();
  public address$ = this.addressSubject.asObservable();
  public balance$ = this.balanceSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  get isConnected(): boolean {
    return this.connectedSubject.value;
  }

  get address(): string {
    return this.addressSubject.value;
  }

  get balance(): string {
    return this.balanceSubject.value;
  }

  async connectWallet(): Promise<boolean> {
    try {
      this.loadingSubject.next(true);
      
      if (!window.leap) {
        throw new Error('Leap wallet extension not found. Please install Leap wallet.');
      }

      await window.leap.enable([this.COREUM_CHAIN_ID]);
      const key = await window.leap.getKey(this.COREUM_CHAIN_ID);
      
      // Create signing client
      const signer: OfflineDirectSigner = {
        getAccounts: async () => [{
          address: key.bech32Address,
          algo: key.algo as any,
          pubkey: key.pubKey
        }],
        signDirect: async (signerAddress, signDoc) => {
          return await window.leap!.signDirect(this.COREUM_CHAIN_ID, signerAddress, signDoc);
        }
      };

      this.signingClient = await SigningCosmWasmClient.connectWithSigner(
        this.COREUM_RPC,
        signer
      );
      
      this.addressSubject.next(key.bech32Address);
      this.connectedSubject.next(true);
      
      // Fetch initial balance
      await this.updateBalance();
      
      console.log('✅ Connected to Leap wallet and created signing client');
      return true;
    } catch (error) {
      console.error('Failed to connect to Leap wallet:', error);
      throw error;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async disconnectWallet(): Promise<void> {
    this.connectedSubject.next(false);
    this.addressSubject.next('');
    this.balanceSubject.next('0');
    this.signingClient = null;
  }

  /**
   * Update the wallet balance
   */
  async updateBalance(): Promise<void> {
    if (!this.signingClient || !this.address) {
      this.balanceSubject.next('0');
      return;
    }

    try {
      const balance = await this.signingClient.getBalance(this.address, 'utestcore');
      // Convert utestcore to TESTCORE for display (1 TESTCORE = 1,000,000 utestcore)
      const testcoreBalance = (Number(balance.amount) / 1_000_000).toString();
      this.balanceSubject.next(testcoreBalance);
      console.log(`💰 Wallet balance: ${testcoreBalance} TESTCORE (${balance.amount} utestcore)`);
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
      this.balanceSubject.next('0');
    }
  }

  /**
   * Execute a CosmWasm contract message
   * @param contractAddress - The smart contract address
   * @param msg - The message to execute
   * @param funds - Optional funds to send with the transaction
   * @returns Transaction hash
   */
  async executeContract(
    contractAddress: string,
    msg: any,
    funds: any[] = []
  ): Promise<string> {
    if (!this.isConnected || !this.signingClient) {
      throw new Error('Wallet not connected or signing client not available');
    }
  
    try {
      this.loadingSubject.next(true);
      console.log('📤 Executing contract:', contractAddress, msg);
  
      // Define custom fee (0.05 utestcore)
      const fee = {
        amount: [
          {
            denom: "utestcore",
            amount: "50000", // 0.05 CORE = 50000 utestcore (since 1 CORE = 1,000,000 utestcore)
          },
        ],
        gas: "300000", // gas limit, adjust as needed
      };
  
      const result = await this.signingClient.execute(
        this.address,
        contractAddress,
        msg,
        fee, // use custom fee instead of 'auto'
        "Creating raffle via Leap wallet",
        funds
      );
  
      console.log("✅ Transaction successful:", result.transactionHash);
      return result.transactionHash;
  
    } catch (error) {
      console.error("❌ Transaction failed:", error);
      throw error;
    } finally {
      this.loadingSubject.next(false);
    }
  }
  

  /**
   * Send an NFT to a contract (for raffle creation)
   * @param nftContractAddress - CW721 contract address
   * @param tokenId - Token ID to send
   * @param recipient - Contract address to send to
   * @param msg - Message to include with the transfer
   */
  async sendNFT(nftContractAddress: string, tokenId: string, recipient: string, msg: any): Promise<string> {
    const sendMsg = {
      send_nft: {
        contract: recipient,
        token_id: tokenId,
        msg: btoa(JSON.stringify(msg)) // Use browser's btoa for base64 encoding
      }
    };

    return this.executeContract(nftContractAddress, sendMsg);
  }

  async getBalance(): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      // Mock balance - in real app, this would query the blockchain
      return Math.random() * 1000;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }

  isWalletInstalled(): boolean {
    return typeof window.leap !== 'undefined';
  }
}