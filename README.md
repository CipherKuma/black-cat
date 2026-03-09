# Black Cat

Private copy trading signal platform built on Avalanche.

## Overview

Expert traders post encrypted positions on-chain, compete on a CRE-verified leaderboard, and subscribers auto-copy top traders based on their subscription tier.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Chain | Avalanche L1 | Custom trading chain |
| Execution | Chainlink CRE | Trade execution in TEE |
| Frontend | Next.js 16 + Tailwind v4 | Web application |
| Contracts | Foundry (^0.8.24) | Smart contracts |
| Wallet | Privy | Embedded wallets |
| AI | Claude Service | Market commentary |

## Deployed Contracts (Avalanche Fuji)

- TestUSDC: `0x7f9B9D8DbDe8a5495374228a4D92284A2043981d`
- BlackCat: `0x4b532156D13F8A8C56cef272Ce6Ad20c4E8C7995`

## Architecture

```
HTTP Trigger -> EVM Read (active signals) -> HTTP (CoinGecko prices)
             -> Compute PnL -> Confidential HTTP (AI commentary)
             -> EVM Write (settle signals + update leaderboard)
```

## Development

```bash
# Contracts
cd contracts && forge build && forge test

# Frontend
cd frontend && npm install && npm run dev -p 3030

# CRE Workflow
cd workflows && bun install
cre workflow simulate verify-signals --http-payload '{}' --trigger-index 0 --non-interactive
```

## Hackathon

- **Chainlink Convergence**: CRE & AI + DeFi
- **Avalanche Build Games**: Custom L1 + DeFi
