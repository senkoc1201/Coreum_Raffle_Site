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
  private readonly COREUM_CHAIN_ID = 'coreum-mainnet-1';
  private readonly COREUM_RPC = 'https://full-node.mainnet-1.coreum.dev:26657';
  
  
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private addressSubject = new BehaviorSubject<string>('');
  private balanceSubject = new BehaviorSubject<string>('0');
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private nftsSubject = new BehaviorSubject<any[]>([]);
  private signingClient: SigningCosmWasmClient | null = null;

  public isConnected$ = this.connectedSubject.asObservable();
  public address$ = this.addressSubject.asObservable();
  public balance$ = this.balanceSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public nfts$ = this.nftsSubject.asObservable();

  get isConnected(): boolean {
    return this.connectedSubject.value;
  }

  get address(): string {
    return this.addressSubject.value;
  }

  get balance(): string {
    return this.balanceSubject.value;
  }

  get nfts(): any[] {
    return this.nftsSubject.value;
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
      
      // Fetch initial balance and NFTs
      await this.updateBalance();
      await this.fetchNFTs();
      
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
    this.nftsSubject.next([]);
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
      const balance = await this.signingClient.getBalance(this.address, 'ucore');
      // Convert ucore to CORE for display (1 CORE = 1,000,000 ucore)
      const coreBalance = (Number(balance.amount) / 1_000_000).toString();
      this.balanceSubject.next(coreBalance);
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
  
      // Define custom fee (0.05 ucore)
      const fee = {
        amount: [
          {
            denom: "ucore",
            amount: "50000", // 0.05 CORE = 50000 ucore (since 1 CORE = 1,000,000 ucore)
          },
        ],
        gas: "300000", // gas limit, adjust as needed
      };
  
      const result = await this.signingClient.execute(
        this.address,
        contractAddress,
        msg,
        fee,
        "Creating raffle via Leap wallet",
        funds
      );
  
      return result.transactionHash;
  
    } catch (error) {
      console.error("Transaction failed:", error);
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


  isWalletInstalled(): boolean {
    return typeof window.leap !== 'undefined';
  }

  /**
   * Fetch NFTs owned by the connected wallet (both CW721 and AssetNFT)
   */
  async fetchNFTs(): Promise<void> {
    if (!this.isConnected || !this.signingClient) {
      this.nftsSubject.next([]);
      return;
    }

    try {
      // Use connected wallet address
      const addressToQuery = this.address;
      
      if (!addressToQuery) {
        console.log('❌ No wallet connected, cannot fetch NFTs');
        this.nftsSubject.next([]);
        return;
      }
      
      const nfts: any[] = [];
      
      // Fetch CW721 NFTs
      const cw721NFTs = await this.fetchCW721NFTs(addressToQuery);
      nfts.push(...cw721NFTs);
      
      // Fetch AssetNFTs (Coreum native)
      const assetNFTs = await this.fetchAssetNFTs(addressToQuery);
      nfts.push(...assetNFTs);
      
      this.nftsSubject.next(nfts);
      console.log(`✅ Fetched ${nfts.length} NFTs (${cw721NFTs.length} CW721 + ${assetNFTs.length} AssetNFT)`);
      
    } catch (error) {
      console.error('❌ Failed to fetch NFTs:', error);
      this.nftsSubject.next([]);
    }
  }

  /**
   * Fetch CW721 NFTs from known collections
   */
  private async fetchCW721NFTs(address: string): Promise<any[]> {
    const nfts: any[] = [];
    
    // Known CW721 collections
    const testCollections = [
      'core1zmcgnyk93a9cgmftqxpu2lje88qngv3yzfwv3hzzpmjk0zytzr4q2py2qx',
      'core19gdha6jgw5ft6zr8n6dwc0rq7m3dkl54sh3gc6mw4v2uajjdqnyqc9kakx',
    ];
    
    for (const contractAddress of testCollections) {
      try {
        const tokensQuery = {
          tokens: {
            owner: address
          }
        };
        
        const tokensResponse = await this.signingClient!.queryContractSmart(contractAddress, tokensQuery);
        
        if (tokensResponse && tokensResponse.tokens && tokensResponse.tokens.length > 0) {
          // For each token, get its metadata
          for (const tokenId of tokensResponse.tokens) {
            try {
              const nftInfoQuery = {
                nft_info: {
                  token_id: tokenId
                }
              };
              
              const nftInfo = await this.signingClient!.queryContractSmart(contractAddress, nftInfoQuery);
              
              const nft = {
                id: `${contractAddress}-${tokenId}`,
                name: nftInfo?.extension?.name || `CW721 #${tokenId}`,
                description: nftInfo?.extension?.description || 'CW721 NFT from Coreum',
                image: nftInfo?.extension?.image || 'https://via.placeholder.com/300x300/20C789/FFFFFF?text=CW721',
                contract: contractAddress,
                tokenId: tokenId,
                collection: nftInfo?.extension?.name || 'Unknown CW721 Collection',
                type: 'CW721'
              };
              
              nfts.push(nft);
              
            } catch (tokenError) {
              console.warn(`Failed to get CW721 info for token ${tokenId}:`, tokenError);
            }
          }
        }
      } catch (contractError) {
        console.warn(`Failed to query CW721 contract ${contractAddress}:`, contractError);
      }
    }
    
    return nfts;
  }

  /**
   * Fetch AssetNFTs (Coreum native NFTs) using REST API
   */
  private async fetchAssetNFTs(address: string): Promise<any[]> {
    const nfts: any[] = [];
    
    try {
      // Use the REST API endpoint for AssetNFTs
      const restUrl = this.COREUM_RPC.replace(':26657', ':1317'); // Convert RPC to REST
      const assetQuery = `${restUrl}/cosmos/nft/v1beta1/nfts?owner=${address}`;
      
      const response = await fetch(assetQuery);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.nfts && data.nfts.length > 0) {
        for (const assetNFT of data.nfts) {
          try {
            // Try to get image URL from various possible fields
            let imageUrl = assetNFT.uri || assetNFT.image || assetNFT.image_url || assetNFT.metadata?.image;
            
            // If no direct image URL, try to construct one from metadata
            if (!imageUrl && assetNFT.metadata) {
              imageUrl = assetNFT.metadata.image || assetNFT.metadata.image_url || assetNFT.metadata.uri;
            }
            
            // Convert IPFS URLs to HTTP URLs and fetch metadata if needed
            if (imageUrl && imageUrl.startsWith('ipfs://')) {
              const ipfsGateways = [
                'https://ipfs.io/ipfs/',
                'https://gateway.pinata.cloud/ipfs/',
                'https://cloudflare-ipfs.com/ipfs/',
                'https://dweb.link/ipfs/'
              ];
              
              const httpUrl = imageUrl.replace('ipfs://', ipfsGateways[0]);
              
              // If it's a JSON file, fetch the metadata to get the actual image URL
              if (httpUrl.endsWith('.json')) {
                try {
                  const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('IPFS metadata fetch timeout')), 5000)
                  );
                  
                  const fetchPromise = this.fetchWithFallbackGateways(httpUrl, ipfsGateways).then(response => {
                    if (!response.ok) {
                      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    return response.json();
                  });
                  
                  const metadata = await Promise.race([fetchPromise, timeoutPromise]);
                  
                  // Extract image URL from metadata
                  const metadataImageUrl = metadata.image || metadata.image_url || metadata.uri;
                  if (metadataImageUrl) {
                    if (metadataImageUrl.startsWith('ipfs://')) {
                      imageUrl = metadataImageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
                    } else {
                      imageUrl = metadataImageUrl;
                    }
                  } else {
                    imageUrl = httpUrl; // Fallback to the JSON URL itself
                  }
                } catch (metadataError) {
                  console.warn('Failed to fetch IPFS metadata:', metadataError);
                  imageUrl = httpUrl; // Fallback to the JSON URL itself
                }
              } else {
                imageUrl = httpUrl;
              }
            }
            
            // If still no image URL, use placeholder
            if (!imageUrl) {
              imageUrl = 'https://via.placeholder.com/300x300/20C789/FFFFFF?text=AssetNFT';
            }
            
            // Create NFT object for AssetNFT
            const nft = {
              id: `assetnft-${assetNFT.class_id}-${assetNFT.id}`,
              name: assetNFT.name || `AssetNFT #${assetNFT.id}`,
              description: assetNFT.description || 'Coreum AssetNFT',
              image: imageUrl,
              contract: assetNFT.class_id, // Use class_id as contract identifier
              tokenId: assetNFT.id,
              collection: assetNFT.class_id,
              type: 'AssetNFT',
              owner: assetNFT.owner,
              classId: assetNFT.class_id
            };
            
            nfts.push(nft);
            
          } catch (assetError) {
            console.warn(`Failed to process AssetNFT ${assetNFT.id}:`, assetError);
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to fetch AssetNFTs:', error);
    }
    
    return nfts;
  }


  /**
   * Refresh NFTs (useful after creating a raffle)
   */
  async refreshNFTs(): Promise<void> {
    await this.fetchNFTs();
  }


  /**
   * Helper function to fetch from IPFS with fallback gateways
   */
  private async fetchWithFallbackGateways(url: string, gateways: string[]): Promise<Response> {
    const originalUrl = url;
    
    for (let i = 0; i < gateways.length; i++) {
      try {
        const gatewayUrl = originalUrl.replace(/https:\/\/[^\/]+\/ipfs\//, gateways[i]);
        const response = await fetch(gatewayUrl);
        if (response.ok) {
          return response;
        }
      } catch (error) {
        // Try next gateway
      }
    }
    
    // If all gateways fail, try the original URL
    return fetch(originalUrl);
  }
}