// Quick script to check wallet address from mnemonic
const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');

async function checkWallet() {
  try {
    const mnemonic = 'tuna note gesture illness rain female nut upset cluster reveal woman few armed slow brisk elite fantasy timber crystal gap trial type rebel silly';
    
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
      mnemonic,
      { prefix: 'testcore' }
    );
    
    const accounts = await wallet.getAccounts();
    console.log('🔑 Wallet Address:', accounts[0].address);
    console.log('🎯 Make sure this wallet has TESTCORE tokens for transaction fees');
    console.log('🚰 Get tokens from: https://docs.coreum.dev/docs/next/tools-and-ecosystem/faucet');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkWallet();
