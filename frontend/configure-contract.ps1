# Coreum Raffle Contract Configuration Script

param(
    [Parameter(Mandatory=$true)]
    [string]$ContractAddress
)

Write-Host "🎯 Configuring Coreum Raffle Contract" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

if (-not $ContractAddress) {
    Write-Host "❌ Contract address is required!" -ForegroundColor Red
    Write-Host "Usage: .\configure-contract.ps1 -ContractAddress 'testcore1abc123...'" -ForegroundColor Yellow
    exit 1
}

# Validate contract address format
if (-not $ContractAddress.StartsWith("testcore1")) {
    Write-Host "⚠️  Warning: Contract address should start with 'testcore1' for Coreum testnet" -ForegroundColor Yellow
}

Write-Host "🔧 Contract Address: $ContractAddress" -ForegroundColor Green

# Update frontend configuration
$indexPath = "src\index.html"
if (Test-Path $indexPath) {
    $content = Get-Content $indexPath -Raw
    $updatedContent = $content -replace "window\.RAFFLE_CONTRACT_ADDRESS = 'REPLACE_WITH_YOUR_CONTRACT_ADDRESS';", "window.RAFFLE_CONTRACT_ADDRESS = '$ContractAddress';"
    Set-Content $indexPath $updatedContent -Encoding UTF8
    Write-Host "✅ Updated frontend configuration" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend index.html not found" -ForegroundColor Red
}

# Update backend configuration if .env exists
$envPath = "backend\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    $envContent = $envContent -replace "RAFFLE_CONTRACT_ADDRESS=.*", "RAFFLE_CONTRACT_ADDRESS=$ContractAddress"
    Set-Content $envPath $envContent
    Write-Host "✅ Updated backend configuration" -ForegroundColor Green
} else {
    # Create .env file
    $envContent = @"
RAFFLE_CONTRACT_ADDRESS=$ContractAddress
MONGODB_URI=mongodb://localhost:27017/degen-raffle
COREUM_CHAIN_ID=coreum-testnet-1
COREUM_RPC_URL=https://full-node.testnet-1.coreum.dev:26657
INDEXING_START_HEIGHT=1
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
"@
    Set-Content $envPath $envContent
    Write-Host "✅ Created backend .env configuration" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Configuration Complete!" -ForegroundColor Green
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Restart your backend: cd backend && npm start" -ForegroundColor White
Write-Host "  2. Restart your frontend: npm run serve" -ForegroundColor White
Write-Host "  3. Visit: http://localhost:4200" -ForegroundColor White
Write-Host "  4. Check browser console for live data queries" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Your raffle should now display live data from:" -ForegroundColor Yellow
Write-Host "  Contract: $ContractAddress" -ForegroundColor White
Write-Host "  Chain: coreum-testnet-1" -ForegroundColor White
