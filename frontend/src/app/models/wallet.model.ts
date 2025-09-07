export interface WalletInfo {
  name: string;
  address: string;
  pubKey: Uint8Array;
  algo: string;
  bech32Address: string;
}

export interface WalletSigner {
  signAmino: (chainId: string, signer: string, signDoc: any) => Promise<any>;
  signDirect: (chainId: string, signer: string, signDoc: any) => Promise<any>;
}

export interface WalletProvider {
  enable: (chainIds: string[]) => Promise<void>;
  getKey: (chainId: string) => Promise<WalletInfo>;
  signAmino: (chainId: string, signer: string, signDoc: any) => Promise<any>;
  signDirect: (chainId: string, signer: string, signDoc: any) => Promise<any>;
  sendTx: (chainId: string, tx: Uint8Array, mode: any) => Promise<any>;
}

export interface WalletConfig {
  name: string;
  displayName: string;
  icon: string;
  website: string;
  downloadUrl: string;
  isInstalled: () => boolean;
  getProvider: () => WalletProvider | null;
}

export enum WalletType {
  LEAP = 'leap',
  COSMOSTATION = 'cosmostation',
  KEPLR = 'keplr'
}

export interface WalletConnectionState {
  isConnected: boolean;
  walletType: WalletType | null;
  address: string;
  balance: string;
  nfts: any[];
  loading: boolean;
  error: string | null;
}
