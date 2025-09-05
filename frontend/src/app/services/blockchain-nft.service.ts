import { Injectable } from '@angular/core';
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { NFT } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class BlockchainNftService {
  private client: CosmWasmClient | null = null;
  private readonly rpcEndpoint = 'https://full-node.testnet-1.coreum.dev:26657';
  
  // Known CW721 NFT collections on Coreum testnet
  private readonly knownCollections = [
    'testcore1tua2qt9ajjddj7xluul2lnc6pvpd02yjraqcz6yuje0tw8f36l3qn3xnnm',
    // Add more collections as needed
  ];

  constructor() {}

  /**
   * Connect to Coreum RPC
   */
  private async connect(): Promise<void> {
    if (!this.client) {
      console.log(`🔗 Connecting to Coreum RPC: ${this.rpcEndpoint}`);
      this.client = await CosmWasmClient.connect(this.rpcEndpoint);
      console.log(`✅ Connected to Coreum for NFT queries`);
    }
  }

  /**
   * Discover all NFTs owned by a wallet address
   * @param address - Coreum wallet address
   * @returns Promise<NFT[]> - Array of NFTs owned by the address
   */
  async discoverUserNFTs(address: string): Promise<NFT[]> {
    try {
      await this.connect();
      
      console.log(`🔍 Discovering NFTs for address: ${address}`);
      const allNFTs: NFT[] = [];

      // Query each known collection for tokens owned by this address
      for (const collectionAddress of this.knownCollections) {
        try {
          const nftsFromCollection = await this.queryCollectionForUserNFTs(address, collectionAddress);
          allNFTs.push(...nftsFromCollection);
        } catch (collectionError) {
          console.warn(`⚠️ Failed to query collection ${collectionAddress}:`, collectionError);
          // Continue with other collections
        }
      }

      console.log(`✅ Found ${allNFTs.length} NFTs for address ${address}`);
      return allNFTs;

    } catch (error) {
      console.error(`❌ Failed to discover NFTs for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Query a specific CW721 collection for NFTs owned by an address
   * @param userAddress - User's wallet address
   * @param collectionAddress - CW721 contract address
   * @returns Promise<NFT[]> - NFTs from this collection
   */
  private async queryCollectionForUserNFTs(userAddress: string, collectionAddress: string): Promise<NFT[]> {
    try {
      if (!this.client) {
        throw new Error('Client not connected');
      }

      // Query CW721 contract for tokens owned by user
      const queryMsg = {
        tokens: {
          owner: userAddress,
          start_after: null,
          limit: 100 // Adjust as needed
        }
      };

      console.debug(`🔍 Querying collection ${collectionAddress} for user ${userAddress}`);
      const response = await this.client.queryContractSmart(collectionAddress, queryMsg);
      
      const tokenIds = response?.tokens || [];
      console.debug(`📦 Found ${tokenIds.length} token IDs in collection ${collectionAddress}`);

      // For each token, get metadata
      const nfts: NFT[] = [];
      for (const tokenId of tokenIds) {
        try {
          const nftData = await this.fetchNFTMetadata(collectionAddress, tokenId);
          nfts.push({
            id: `${collectionAddress}:${tokenId}`,
            tokenId,
            collectionAddress,
            name: nftData?.name || `Token #${tokenId}`,
            description: nftData?.description || '',
            imageUrl: nftData?.image || '/assets/bear-mascot.svg',
            isEligibleForRaffle: true, // All discovered NFTs are eligible
            metadata: nftData
          });
        } catch (metadataError) {
          console.warn(`⚠️ Failed to fetch metadata for ${collectionAddress}:${tokenId}:`, metadataError);
          // Create basic NFT without metadata
          nfts.push({
            id: `${collectionAddress}:${tokenId}`,
            tokenId,
            collectionAddress,
            name: `Token #${tokenId}`,
            description: 'NFT metadata unavailable',
            imageUrl: '/assets/bear-mascot.svg',
            isEligibleForRaffle: true,
            metadata: null
          });
        }
      }

      return nfts;

    } catch (error) {
      console.error(`❌ Error querying collection ${collectionAddress}:`, error);
      throw error;
    }
  }

  /**
   * Fetch NFT metadata for a specific token
   * @param collectionAddress - CW721 contract address
   * @param tokenId - Token ID
   * @returns Promise<any> - NFT metadata
   */
  private async fetchNFTMetadata(collectionAddress: string, tokenId: string): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Client not connected');
      }

      const queryMsg = {
        nft_info: { token_id: tokenId }
      };

      const response = await this.client.queryContractSmart(collectionAddress, queryMsg);
      
      // Extract metadata from response
      const extension = response?.extension;
      if (extension) {
        return {
          name: extension.name || response.name,
          description: extension.description || response.description,
          image: extension.image || response.image,
          attributes: extension.attributes || response.attributes || [],
          external_url: extension.external_url || response.external_url,
          raw: extension
        };
      }

      return null;

    } catch (error) {
      console.debug(`Could not fetch metadata for ${collectionAddress}:${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Add a new collection to be monitored
   * @param collectionAddress - CW721 contract address
   */
  addCollection(collectionAddress: string): void {
    if (!this.knownCollections.includes(collectionAddress)) {
      this.knownCollections.push(collectionAddress);
      console.log(`➕ Added new collection for monitoring: ${collectionAddress}`);
    }
  }

  /**
   * Get list of monitored collections
   * @returns Array<string> - Collection addresses
   */
  getMonitoredCollections(): string[] {
    return [...this.knownCollections];
  }

  /**
   * Verify NFT ownership for a specific token
   * @param address - Wallet address
   * @param collectionAddress - CW721 contract address
   * @param tokenId - Token ID
   * @returns Promise<boolean> - True if address owns the token
   */
  async verifyNFTOwnership(address: string, collectionAddress: string, tokenId: string): Promise<boolean> {
    try {
      await this.connect();
      
      if (!this.client) {
        throw new Error('Client not connected');
      }

      const queryMsg = {
        owner_of: { token_id: tokenId }
      };

      const response = await this.client.queryContractSmart(collectionAddress, queryMsg);
      return response?.owner === address;

    } catch (error) {
      console.error(`❌ Failed to verify NFT ownership:`, error);
      return false;
    }
  }

  /**
   * Get collection info
   * @param collectionAddress - CW721 contract address
   * @returns Promise<any> - Collection information
   */
  async getCollectionInfo(collectionAddress: string): Promise<any> {
    try {
      await this.connect();
      
      if (!this.client) {
        throw new Error('Client not connected');
      }

      const queryMsg = { contract_info: {} };
      const response = await this.client.queryContractSmart(collectionAddress, queryMsg);
      
      return {
        name: response?.name || 'Unknown Collection',
        symbol: response?.symbol || 'UNKNOWN',
        description: response?.description || ''
      };

    } catch (error) {
      console.warn(`⚠️ Failed to get collection info for ${collectionAddress}:`, error);
      return {
        name: 'Unknown Collection',
        symbol: 'UNKNOWN',
        description: ''
      };
    }
  }

  /**
   * Disconnect from the blockchain client
   */
  disconnect(): void {
    this.client = null;
    console.log('🔌 Disconnected from Coreum RPC');
  }
}
