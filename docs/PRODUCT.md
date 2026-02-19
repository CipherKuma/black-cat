# BLACK CAT

**Private Copy Trading Signal Platform**
**Powered by Avalanche L1 + Chainlink CRE**

---

**Hackathon Submissions:**
- Chainlink Convergence Hackathon: CRE & AI Track + DeFi Track
- Avalanche Build Games: Custom L1 + Kite AI + Agora + Tether WDK + Suzaku

**Team:** Gabriel Antony Xaviour (solo)
**Wallet:** `0x5477656f6D587bea3ade5f17BDD6EDcbee4599bD`

---

## Table of Contents

1. [Vision](#1-vision)
2. [How It Works](#2-how-it-works)
3. [Solution Architecture](#3-solution-architecture)
4. [Tech Stack](#4-tech-stack)
5. [Smart Contracts](#5-smart-contracts)
6. [CRE Workflows](#6-cre-workflows)
7. [Privacy Architecture](#7-privacy-architecture)
8. [Cross-Chain Architecture](#8-cross-chain-architecture)
9. [External DEX Reference](#9-external-dex-reference)
10. [Partner Integrations](#10-partner-integrations)
11. [Frontend Pages](#11-frontend-pages)
12. [Subscription Model](#12-subscription-model)
13. [User Flows](#13-user-flows)
14. [Avalanche L1 Specifications](#14-avalanche-l1-specifications)
15. [Proof of Reserve](#15-proof-of-reserve)
16. [Leaderboard System](#16-leaderboard-system)
17. [Revenue Model](#17-revenue-model)
18. [Security Considerations](#18-security-considerations)
19. [Testing Strategy](#19-testing-strategy)
20. [Deployment Strategy](#20-deployment-strategy)
21. [Demo Flow](#21-demo-flow)
22. [Hackathon Submission](#22-hackathon-submission)
23. [Competitive Analysis](#23-competitive-analysis)
24. [Roadmap](#24-roadmap)
25. [Reference Links](#25-reference-links)

---

## 1. VISION

### 1.1 What Black Cat Is

Black Cat is a **private copy trading signal platform**. It is NOT a DEX. It does not have an order book or a matching engine. Expert traders trade on external DEXes themselves (Hyperliquid, GMX v2, Vertex Protocol), then post/register their positions on Black Cat. Those posted signals are encrypted on the Avalanche L1 using eERC so nobody can front-run the copy flow. CRE verifies that masters actually hold the positions they claim, executes copy trades for subscribers on the same external DEX, and maintains a tamper-proof leaderboard.

```
BLACK CAT IS:                          BLACK CAT IS NOT:
+---------------------------------+    +---------------------------------+
| Signal registry                 |    | A DEX                           |
| Encrypted trade signals (eERC) |    | An order book                   |
| CRE-verified leaderboard       |    | A matching engine               |
| Subscription copy platform     |    | A perps aggregator              |
| Privacy layer for copy trading  |    | A place where masters trade     |
+---------------------------------+    +---------------------------------+
```

### 1.2 The Copy Trading Problem

Every copy trading platform -- centralized and decentralized -- has a fatal flaw: **master trader positions are visible before copy trades execute.**

| Attack Vector | Description |
|---------------|-------------|
| Front-running by followers | Followers see "Trader X opened 10x long ETH" and race ahead of the copy mechanism |
| Strategy theft | Competitors reverse-engineer a master's approach from public on-chain data |
| Alpha decay | 500 copy orders create predictable price impact; market makers adjust quotes |
| MEV/sandwich attacks | Copy orders in mempools are perfect sandwich targets (predictable, follows master) |

### 1.3 Competitive Landscape

| Platform | Type | Position Privacy | Copy Latency | Revenue Model | Front-Run Risk |
|----------|------|-----------------|--------------|---------------|----------------|
| Binance Copy | CEX | None | ~5ms internal | Fees + profit share | Medium |
| Bybit Copy | CEX | None | Sub-100ms | Fees + profit share | Medium |
| Copin.io | On-chain aggregator | None (public chain data) | 2-15s | 0.025% + AUM + profit | Critical |
| Perpy Finance | On-chain (GMX vault) | None (public mempool) | Same block | Protocol fee + profit | Critical |
| GMGN | On-chain (Solana) | None (public txs) | 1-3 blocks | Priority fees | Critical |
| **Black Cat** | **Private L1 signal platform** | **Full -- encrypted until copy executes** | **4-24s** | **Subscription tiers** | **None** |

### 1.4 Market Opportunity

Perpetual futures DEX daily volume in early 2026:

| DEX | Daily Volume |
|-----|-------------|
| Hyperliquid | $8-15B |
| GMX v2 | $500M-1B |
| Vertex Protocol | $1-3B |
| Jupiter Perps | $1-3B |
| dYdX v4 | $500M-1B |

Copy trading is ~10-15% of CEX derivatives volume. Addressable market: $1.5-2.25B daily in perps DEX copy trading. No platform currently offers **private** copy trading.

---

## 2. HOW IT WORKS

### 2.1 Core Flow (6 Steps)

```
HOW BLACK CAT WORKS
====================

Step 1: MASTER TRADES ON EXTERNAL DEX
  Master trader opens a position on Hyperliquid/GMX/Vertex themselves.
  Black Cat does NOT place this trade. The master uses the DEX directly.

Step 2: MASTER POSTS SIGNAL ON BLACK CAT
  Master registers their position on Black Cat L1:
    - pair (ETH-PERP), direction (LONG/SHORT), size ($10k)
    - entry price, DEX used, leverage
  Signal is encrypted with eERC on the L1. Nobody sees it.

Step 3: CRE VERIFIES THE SIGNAL
  CRE Confidential HTTP (inside TEE) calls the external DEX API
  to verify the master actually holds the claimed position.
  If the position does not exist or does not match -> signal rejected.
  If verified -> signal is marked VERIFIED on-chain.

Step 4: LEADERBOARD UPDATES
  CRE Cron (hourly) reads all verified signals, fetches current prices,
  calculates real PnL across DEXes. DON Consensus agrees on scores.
  LeaderboardRegistry updated on L1. Rankings are tamper-proof.

Step 5: SUBSCRIBERS GET COPY TRADES EXECUTED
  Users subscribe to Black Cat (not to individual traders).
  Tier determines which ranked traders they can copy:
    - Free: view leaderboard only
    - Basic ($19/mo): copy traders ranked 51-100
    - Pro ($49/mo): copy traders ranked 11-50
    - Elite ($99/mo): copy traders ranked 1-10
  CRE executes the copy trade on the SAME external DEX the master used.

Step 6: REVENUE DISTRIBUTION
  Subscription fees -> platform treasury.
  Masters earn revenue share from subscription pool based on rank.
  Higher rank = larger share of the subscription revenue.
```

### 2.2 What Each Actor Does

| Actor | Action | Where |
|-------|--------|-------|
| Master trader | Trades on external DEX | Hyperliquid / GMX v2 / Vertex |
| Master trader | Posts/registers signal | Black Cat L1 (encrypted via eERC) |
| CRE (Verification) | Reads external DEX API to verify master position | TEE via Confidential HTTP |
| CRE (Leaderboard) | Calculates PnL, DON Consensus on scores | Hourly Cron |
| CRE (Copy Execution) | Executes copy trades for eligible subscribers | TEE -> external DEX |
| CRE (Fraud Detection) | Catches fake/mismatched position claims | TEE verification |
| Subscriber | Pays subscription, gets copy trades executed | Black Cat app |
| L1 | Encrypts signals, stores leaderboard, manages subscriptions | Avalanche L1 |

### 2.3 What the L1 Does (Privacy Layer)

The Black Cat L1 is a **privacy layer**, not a trading venue.

| L1 Feature | Purpose |
|------------|---------|
| eERC encrypted balances | Encrypt trade signals so nobody front-runs copy flow |
| validatorOnly mode | Mempool privacy -- external observers cannot see pending signals |
| USDC native gas via ICTT | Stablecoin gas, no volatile token needed |
| 500ms blocks (ACP-226) | Fast signal confirmations |
| No order book | L1 does not match trades. Masters trade externally. |
| No matching engine | L1 stores encrypted signals and leaderboard data only. |

---

## 3. SOLUTION ARCHITECTURE

### 3.1 System Diagram

```
                              BLACK CAT SYSTEM ARCHITECTURE
                              =============================

+------------------+         +----------------------------------------+
|   USER BROWSER   |         |         BLACK CAT L1 (Subnet-EVM)      |
|                  |         |            PRIVACY LAYER                |
|  Privy Auth      |-------->|                                        |
|  Tether WDK      |         |  SignalRegistry.sol  (encrypted sigs)  |
|  Next.js 15 App  |         |  LeaderboardRegistry.sol               |
|                  |         |  SubscriptionManager.sol               |
|                  |         |  CopyExecutionLog.sol                  |
|                  |         |  RevenueDistributor.sol                |
|                  |         |  ProofOfReserve.sol                    |
|                  |         |  BlackCatVault.sol   (eERC balances)   |
|                  |         |                                        |
|                  |         |  eERC: Encrypted signals + balances    |
|                  |         |  validatorOnly: Mempool privacy        |
|                  |         |  Gas Token: Wrapped USDC (ICTT)        |
+------------------+         +---+----------+-------------------------+
                                 |          |
                          ICTT/  |          | CRE Log Trigger
                       Teleporter|          | (SignalPosted event)
                                 |          |
                  +--------------+--+    +--+----------------------------+
                  |  AVALANCHE      |    |  CHAINLINK CRE (DON)         |
                  |  C-CHAIN        |    |                              |
                  |                 |    |  +-- TEE (AWS Nitro) ------+ |
                  | BlackCatBridge  |    |  |                         | |
                  |   .sol          |    |  | Trade Verification:     | |
                  | StablecoinMgr   |    |  |   Confidential HTTP ->  | |
                  |   .sol          |    |  |   Hyperliquid API       | |
                  |                 |    |  |   Vertex API            | |
                  | USDC deposits   |    |  |   GMX on-chain read     | |
                  | Agora AUSD      |    |  |                         | |
                  |                 |    |  | Copy Execution:         | |
                  +---------+-------+    |  |   Confidential HTTP ->  | |
                            |            |  |   Hyperliquid API       | |
                       CCIP |            |  |   Vertex API            | |
                            |            |  |   EVM Write -> GMX      | |
                  +---------+-------+    |  |                         | |
                  |  EXTERNAL DEXes |    |  | Leaderboard Consensus:  | |
                  |                 |    |  |   N nodes agree on PnL  | |
                  | Hyperliquid     |    |  |                         | |
                  |   (master+copy) |    |  | Fraud Detection:        | |
                  | GMX v2 Arbitrum |    |  |   Position mismatch ->  | |
                  |   (master+copy) |    |  |   signal rejected       | |
                  | Vertex Protocol |    |  |                         | |
                  |   (master+copy) |    |  | Cron:                   | |
                  |                 |    |  |   Leaderboard (hourly)  | |
                  |                 |    |  |   PoR (6h)              | |
                  |                 |    |  |   Subscriptions (daily) | |
                  +-----------------+    |  +-------------------------+ |
                                         +------------------------------+
```

### 3.2 Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Masters trade externally, post signals | Black Cat is not a DEX. No order book needed. Masters use liquid DEXes. |
| Signals encrypted on L1 | eERC prevents anyone from seeing what masters posted until copies execute |
| CRE verifies positions exist | Prevents masters from posting fake signals to game the leaderboard |
| CRE executes copies (not masters) | CRE only places copy trades for subscribers, not master trades |
| Subscription to the APP, not traders | Tier determines access to ranked traders. Simpler UX. |
| Revenue share by rank | Masters earn from subscription pool based on leaderboard position |

### 3.3 Why Avalanche L1

| Feature | What It Does for Black Cat |
|---------|---------------------------|
| eERC (zk-SNARKs + ElGamal) | Encrypts signal data so nobody front-runs copy flow |
| validatorOnly mode | Restricts P2P to validators only. No mempool observation. |
| USDC native gas via ICTT | Stablecoin gas. No volatile token. |
| 500ms blocks (ACP-226) | Sub-second signal confirmations |
| Custom precompiles (precompile-evm) | Not needed for MVP (no commit-reveal since masters trade externally) |
| Low cost (ACP-77) | ~1.33 AVAX/month per validator. 3 validators = ~$100-150/mo |

#### eERC Technical Details

eERC (Encrypted ERC) uses:
- **zk-SNARKs (Groth16 proofs)** -- prove validity without revealing amounts
- **Partially Homomorphic Encryption (ElGamal on BabyJubJub curve)** -- encrypted values can be updated without decryption

Four circuits:

| Circuit | Purpose |
|---------|---------|
| Registration | Generate encryption keypair, prove ownership |
| Mint | Convert plaintext USDC to encrypted balance (when arriving via ICTT) |
| Transfer | Move encrypted amounts between accounts (prove validity without revealing) |
| Withdraw | Convert encrypted balance back to plaintext (for bridging to C-Chain) |

Proof generation is CLIENT-SIDE (WASM-compiled prover, 2-5 seconds). No relayers.
GitHub: github.com/ava-labs/EncryptedERC

### 3.4 Why Chainlink CRE

| CRE Capability | How Black Cat Uses It |
|----------------|----------------------|
| Confidential HTTP (TEE) | Verify master positions on Hyperliquid/Vertex APIs. Execute copy trades on same DEXes. |
| EVM Read | Read signal data from L1. Read position data from GMX on Arbitrum. |
| EVM Write | Execute copy trades on GMX (Arbitrum). Update leaderboard on L1. |
| Consensus | Multiple DON nodes independently calculate PnL, agree on leaderboard scores |
| Cron Trigger | Hourly leaderboard updates. 6-hour PoR checks. Daily subscription renewals. |
| Log Trigger | SignalPosted events trigger verification. VerifiedSignal events trigger copy execution. |
| CCIP | C-Chain to Arbitrum routing for future cross-chain settlement |
| ACE Policies | Subscription tier enforcement. Risk limits on copy sizes. |

CRE is Early Access in 2026. Hackathon uses CRE simulator.

---

## 4. TECH STACK

| Layer | Component | Technology | Justification |
|-------|-----------|------------|---------------|
| Chain | VM | Subnet-EVM (latest) | Production-ready, EVM compatible |
| Chain | Privacy | eERC (EncryptedERC) | zk-SNARKs + ElGamal for encrypted signals |
| Chain | Network | validatorOnly mode | Restricts P2P to validators |
| Chain | Gas Token | Wrapped USDC via ICTT | Stablecoin gas |
| Chain | Block Time | 500ms (ACP-226) | Sub-second confirmations |
| Chain | Validators | PoAValidatorManager.sol | Permissioned set, Suzaku restaking later |
| Chain | Bridge | ICTT + Teleporter | C-Chain to L1 token/message transfer |
| Oracle | Runtime | Chainlink CRE (EA) | TEE execution, cross-chain verification |
| Oracle | HTTP | Confidential HTTP | DEX API calls from TEE (verify + copy) |
| Oracle | On-chain | EVM Read/Write | Contract reads on L1 + Arbitrum |
| Oracle | Verification | Consensus | Multi-node leaderboard agreement |
| Oracle | Scheduling | Cron Trigger | PoR, subscriptions, leaderboard |
| Oracle | Events | Log Trigger | Signal verification, copy execution |
| Oracle | Cross-chain | CCIP | C-Chain to Arbitrum/Base messaging |
| Oracle | Policies | ACE | Subscription + risk enforcement |
| Frontend | Framework | Next.js 15 | App Router, RSC, server actions |
| Frontend | Styling | Tailwind CSS v4 | Utility-first |
| Frontend | Components | shadcn/ui | Accessible, composable |
| Frontend | Charts | TradingView Widget | Professional charts |
| Frontend | Auth | Privy | Email/social/wallet auth + embedded wallets |
| Frontend | Wallets | Tether WDK | Self-custodial wallet SDK |
| Contracts | Framework | Foundry | forge, cast, anvil |
| Contracts | Language | Solidity ^0.8.24 | Latest stable |
| Stablecoin | Primary | USDC (Circle) | Most liquid, native on Avalanche |
| Stablecoin | Alternative | Agora AUSD | Treasury-backed, yield-sharing |
| AI | Agent Identity | Kite AI | PoAI for AI trading agents |
| Security | Restaking | Suzaku | Bootstrap validator security |
| AI Inference | Service | Claude Service | App-level AI via Claude CLI wrapper |
| Testing | Contracts | Foundry (forge test) | Unit + integration |
| Testing | E2E | Playwright | Browser automation |
| Deployment | L1 | Avalanche CLI | L1 on Fuji testnet |
| Deployment | Frontend | Vercel | Next.js hosting |

---

## 5. SMART CONTRACTS

### 5.1 Overview

Black Cat deploys contracts across two chains. The L1 contracts manage the signal registry, leaderboard, subscriptions, copy execution logging, and revenue distribution. The C-Chain contracts handle deposits and bridging.

```
BLACK CAT L1 (Privacy Layer):
  1. SignalRegistry.sol        -- Masters post encrypted signals here
  2. BlackCatVault.sol         -- eERC encrypted balances, subscription payments
  3. LeaderboardRegistry.sol   -- CRE-verified PnL scores and rankings
  4. SubscriptionManager.sol   -- Tier management (Free/Basic/Pro/Elite)
  5. CopyExecutionLog.sol      -- Tracks CRE-executed copy trades
  6. RevenueDistributor.sol    -- Distributes subscription revenue to masters by rank
  7. ProofOfReserve.sol        -- Verifies C-Chain deposits match L1 supply

AVALANCHE C-CHAIN (Custody Layer):
  8. BlackCatBridge.sol        -- USDC/AUSD deposits, ICTT bridging
  9. StablecoinManager.sol     -- AUSD/USDC conversion, yield-sharing

ACE POLICIES:
  10. SubscriptionPolicy.sol   -- Only active subscribers can get copies
  11. TierAccessPolicy.sol     -- Tier determines which ranks are copyable
  12. CopySizePolicy.sol       -- Max copy size per tier
  13. BlackCatExtractor.sol    -- Extract params from CRE workflow data
```

### 5.2 SignalRegistry.sol (L1)

**Purpose:** Masters post their external DEX positions here. Signals are encrypted with eERC. CRE verifies them. This is the core data structure -- not an order router.

```solidity
struct Signal {
    address master;
    bytes32 pair;              // keccak256("ETH-PERP")
    uint8 direction;           // 0 = LONG, 1 = SHORT
    uint256 sizeUsd;           // Position size in USD (6 decimals)
    uint256 entryPrice;        // Entry price on external DEX (18 decimals)
    uint8 dex;                 // 0 = HYPERLIQUID, 1 = GMX_V2, 2 = VERTEX
    uint256 leverage;          // Leverage multiplier
    uint256 timestamp;         // When signal was posted
    uint8 status;              // 0=POSTED, 1=VERIFIED, 2=REJECTED, 3=CLOSED
    bytes32 externalRef;       // DEX-specific reference (order ID / tx hash)
}

mapping(uint256 => Signal) public signals;              // signalId => Signal
mapping(address => uint256[]) public masterSignals;     // master => signalIds
mapping(address => bool) public registeredMasters;      // master => registered
uint256 public nextSignalId;

// CRE address for verification writes
address public creAddress;
```

**Key Functions:**

```solidity
// Master posts a signal (encrypted on-chain via eERC)
function postSignal(
    bytes32 pair,
    uint8 direction,
    uint256 sizeUsd,
    uint256 entryPrice,
    uint8 dex,
    uint256 leverage,
    bytes32 externalRef
) external onlyRegisteredMaster;
// Emits: SignalPosted(uint256 signalId, address master, bytes32 pair, uint8 dex)
// NOTE: SignalPosted is the CRE Log Trigger for verification

// CRE verifies the signal matches the actual DEX position
function verifySignal(uint256 signalId, bool verified) external onlyCRE;
// If verified=true: status -> VERIFIED, emits SignalVerified(signalId, master)
// If verified=false: status -> REJECTED, emits SignalRejected(signalId, reason)
// NOTE: SignalVerified triggers copy execution workflow

// Master closes their signal (after closing on external DEX)
function closeSignal(uint256 signalId, uint256 closePrice) external;
// Emits: SignalClosed(signalId, closePrice, pnl)

// Master registration
function registerAsMaster() external;
// Emits: MasterRegistered(address master)
```

**Events:**

```solidity
event MasterRegistered(address indexed master);
event SignalPosted(uint256 indexed signalId, address indexed master, bytes32 pair, uint8 dex);
event SignalVerified(uint256 indexed signalId, address indexed master);
event SignalRejected(uint256 indexed signalId, string reason);
event SignalClosed(uint256 indexed signalId, uint256 closePrice, int256 pnl);
```

### 5.3 BlackCatVault.sol (L1)

**Purpose:** Manages eERC encrypted USDC balances. Entry point for subscription payments and copy trade collateral.

```solidity
mapping(address => uint256) public encryptedBalances;    // eERC encrypted USDC
mapping(address => uint256) public lockedCollateral;     // Locked for active copies
uint256 public totalDeposits;
address public eercToken;
address public icttRemote;
```

**Key Functions:**

```solidity
function deposit(bytes calldata eercProof) external;
// Convert USDC from ICTT to eERC encrypted balance
// Emits: Deposited(address user, uint256 encryptedAmount)

function withdraw(uint256 amount, bytes calldata eercProof) external;
// Convert eERC back to plaintext, initiate ICTT transfer to C-Chain
// Emits: WithdrawalInitiated(address user, uint256 amount)

function lockCopyCollateral(address user, uint256 amount) external onlyAuthorized;
// Lock collateral for an active copy trade
// Emits: CollateralLocked(address user, uint256 amount)

function unlockCopyCollateral(address user, uint256 amount, int256 pnl) external onlyAuthorized;
// Unlock after copy trade closes, adjust for PnL
// Emits: CollateralUnlocked(address user, uint256 amount, int256 pnl)

function paySubscription(address user, uint256 amount) external onlyAuthorized;
// Deduct subscription fee from encrypted balance
// Emits: SubscriptionPaid(address user, uint256 amount)
```

### 5.4 LeaderboardRegistry.sol (L1)

**Purpose:** CRE-verified PnL scores and rankings. Only CRE DON can write. Public read.

```solidity
struct LeaderboardEntry {
    address master;
    int256 totalPnl;              // Realized + unrealized PnL in USD
    uint256 winRate;              // Basis points (7500 = 75%)
    uint256 totalSignals;         // Total signals posted
    uint256 verifiedSignals;      // Signals that passed CRE verification
    uint256 avgHoldingTime;       // Average position hold time (seconds)
    int256 maxDrawdown;           // Max drawdown in USD
    uint256 sharpeRatio;          // Sharpe * 1000 (2500 = 2.5)
    uint256 totalVolume;          // Total trading volume USD
    uint256 subscribersCopying;   // How many subscribers copied this master
    uint256 lastUpdated;          // Block timestamp of last CRE update
    bool isActive;
}

mapping(address => LeaderboardEntry) public entries;
address[] public rankedMasters;                          // Sorted by totalPnl desc
mapping(address => uint256) public masterRank;           // 1-indexed rank
```

**Key Functions:**

```solidity
function batchUpdateScores(
    address[] calldata masters,
    int256[] calldata totalPnls,
    uint256[] calldata winRates,
    uint256[] calldata totalSignals,
    uint256[] calldata verifiedSignals,
    uint256[] calldata avgHoldingTimes,
    int256[] calldata maxDrawdowns,
    uint256[] calldata sharpeRatios,
    uint256[] calldata totalVolumes,
    uint256[] calldata subscribersCopying
) external onlyCRE;
// Batch update + re-sort rankings
// Emits: LeaderboardUpdated(uint256 timestamp, uint256 numMasters)

function getTopMasters(uint256 count) external view returns (LeaderboardEntry[] memory);
function getMasterRank(address master) external view returns (uint256);
function getMastersByMetric(uint8 metric, uint256 offset, uint256 limit)
    external view returns (LeaderboardEntry[] memory);
```

### 5.5 SubscriptionManager.sol (L1)

**Purpose:** Manages subscription tiers. Users subscribe to the APP, not to individual traders. Tier determines which leaderboard ranks the user can copy.

```solidity
enum Tier { FREE, BASIC, PRO, ELITE }

struct TierConfig {
    uint256 monthlyPrice;         // USDC (6 decimals). FREE=0.
    uint256 copyableRankMin;      // Minimum rank copyable (e.g. 51 for Basic)
    uint256 copyableRankMax;      // Maximum rank copyable (e.g. 100 for Basic)
    uint256 maxCopySize;          // Max USD per copy trade
    bool alertsEnabled;
    bool analyticsEnabled;
    bool apiAccessEnabled;
}

struct Subscription {
    Tier tier;
    uint256 startTimestamp;
    uint256 expiryTimestamp;
    bool autoRenew;
    uint256 totalPaid;
}

mapping(Tier => TierConfig) public tierConfigs;
mapping(address => Subscription) public subscriptions;
address[] public activeSubscribers;
uint256 public totalRevenue;
address public treasury;
```

**Default Tier Configuration:**

```
FREE:   $0/mo    | View leaderboard only    | No copying
BASIC:  $19/mo   | Copy ranks 51-100        | Max $5k per copy   | Alerts
PRO:    $49/mo   | Copy ranks 11-50         | Max $25k per copy  | Alerts + Analytics
ELITE:  $99/mo   | Copy ranks 1-10          | Max $100k per copy | Alerts + Analytics + API
```

**Key Functions:**

```solidity
function subscribe(Tier tier) external;
// Pay from BlackCatVault balance. Set expiry = now + 30 days.
// Emits: Subscribed(address user, Tier tier, uint256 expiry)

function upgrade(Tier newTier) external;
// Pro-rated upgrade. Emits: TierUpgraded(address user, Tier old, Tier new)

function setAutoRenew(bool enabled) external;
function processRenewal(address subscriber) external onlyCRE;
// CRE Cron daily. Renew or expire.

function canCopyRank(address user, uint256 rank) external view returns (bool);
// Check if user's tier allows copying a master at given rank
```

### 5.6 CopyExecutionLog.sol (L1)

**Purpose:** Tracks all CRE-executed copy trades. Updated by CRE after executing copy on external DEX.

```solidity
struct CopyTrade {
    uint256 signalId;             // Which master signal was copied
    address subscriber;           // Who got the copy
    uint256 copySize;             // Copy trade size in USD
    uint256 entryPrice;           // Fill price on external DEX
    uint8 dex;                    // Which DEX
    uint256 timestamp;
    uint8 status;                 // 0=EXECUTING, 1=FILLED, 2=CLOSED, 3=FAILED
    int256 pnl;                   // Realized PnL (set on close)
    bytes32 externalTxHash;       // Tx hash on external DEX
}

mapping(uint256 => CopyTrade) public copyTrades;         // copyId => CopyTrade
mapping(address => uint256[]) public subscriberCopies;   // subscriber => copyIds
mapping(uint256 => uint256[]) public signalCopies;       // signalId => copyIds
uint256 public nextCopyId;
```

**Key Functions:**

```solidity
function recordCopyExecution(
    uint256 signalId,
    address subscriber,
    uint256 copySize,
    uint256 entryPrice,
    uint8 dex,
    bytes32 externalTxHash
) external onlyCRE;
// Emits: CopyExecuted(uint256 copyId, uint256 signalId, address subscriber)

function recordCopyClose(
    uint256 copyId,
    uint256 closePrice,
    int256 pnl
) external onlyCRE;
// Emits: CopyClosed(uint256 copyId, int256 pnl)
```

### 5.7 RevenueDistributor.sol (L1)

**Purpose:** Distributes subscription revenue to masters based on leaderboard rank. Higher rank = larger share.

```solidity
struct RevenueShare {
    uint256 rankMin;              // e.g. 1
    uint256 rankMax;              // e.g. 10
    uint256 shareBps;             // Basis points of subscription pool
}

RevenueShare[] public revenueShares;
// Example: ranks 1-10 share 50%, ranks 11-50 share 30%, ranks 51-100 share 20%

uint256 public totalDistributed;
uint256 public pendingDistribution;
```

**Key Functions:**

```solidity
function distribute() external onlyCRE;
// Called monthly. Reads subscription revenue, splits by rank tiers.
// Emits: RevenueDistributed(uint256 amount, uint256 numMasters)

function claimRevenue() external;
// Masters claim their accumulated revenue share.
// Emits: RevenueClaimed(address master, uint256 amount)
```

### 5.8 ProofOfReserve.sol (L1)

**Purpose:** CRE Cron verifies C-Chain deposits match L1 supply every 6 hours.

```solidity
struct ReserveHealth {
    uint256 cChainDeposits;       // Total USDC in BlackCatBridge on C-Chain
    uint256 l1Supply;             // Total wrapped USDC on L1
    uint256 ratio;                // l1Supply * 10000 / cChainDeposits (bps)
    uint256 timestamp;
    bool isHealthy;               // ratio <= 10000
}

ReserveHealth public currentHealth;
ReserveHealth[] public healthHistory;
uint256 public alertThreshold;                           // Default: 10050 (0.5% over)
uint256 public criticalThreshold;                        // Default: 10200 (2% over)
```

**Key Functions:**

```solidity
function updateHealth(uint256 cChainDeposits, uint256 l1Supply) external onlyCRE;
// Emits: HealthCheckCompleted(uint256 deposits, uint256 supply, uint256 ratio, bool healthy)
// If ratio > alertThreshold: emits ReserveAlert
// If ratio > criticalThreshold: emits ReserveCritical

function getHealth() external view returns (ReserveHealth memory);
function isHealthy() external view returns (bool);
```

### 5.9 C-Chain Contracts

#### BlackCatBridge.sol

**Purpose:** Entry point for deposits. Users deposit USDC/AUSD on C-Chain. ICTT bridges to L1.

```solidity
address public usdc;
address public ausd;
address public icttHome;
uint256 public totalUsdcDeposited;
uint256 public totalAusdDeposited;
bool public paused;
```

```solidity
function depositUSDC(uint256 amount) external whenNotPaused;
// Transfer USDC -> ICTT bridge -> L1
// Emits: DepositedUSDC(address user, uint256 amount)

function depositAUSD(uint256 amount) external whenNotPaused;
// Transfer AUSD -> convert -> bridge
// Emits: DepositedAUSD(address user, uint256 amount)

function processWithdrawal(address user, uint256 amount) external onlyICTT;
// USDC back to user from L1 withdrawal
// Emits: WithdrawalProcessed(address user, uint256 amount)

function getTotalDeposits() external view returns (uint256);
function pause() external onlyAdmin;
function unpause() external onlyAdmin;
```

#### StablecoinManager.sol

**Purpose:** AUSD/USDC conversion. Agora yield-sharing.

```solidity
function swapAUSDtoUSDC(uint256 amount) external returns (uint256);
function claimYield() external onlyAdmin;
// Emits: YieldClaimed(uint256 amount)
```

### 5.10 ACE Policies

```solidity
// SubscriptionPolicy -- only active subscribers can get copies
contract SubscriptionPolicy is IACEPolicy {
    function evaluate(address user, bytes calldata) external view returns (bool) {
        return subscriptionManager.isActiveSubscriber(user);
    }
}

// TierAccessPolicy -- tier determines copyable ranks
contract TierAccessPolicy is IACEPolicy {
    function evaluate(address user, bytes calldata data) external view returns (bool) {
        uint256 masterRank = abi.decode(data, (uint256));
        return subscriptionManager.canCopyRank(user, masterRank);
    }
}

// CopySizePolicy -- max copy size per tier
contract CopySizePolicy is IACEPolicy {
    function evaluate(address user, bytes calldata data) external view returns (bool) {
        (uint256 copySize, Tier tier) = abi.decode(data, (uint256, uint8));
        return copySize <= tierConfigs[tier].maxCopySize;
    }
}
```

---

## 6. CRE WORKFLOWS

### 6.1 signal-verification/ -- Verify Master Positions

**Trigger:** Log Trigger on `SignalPosted(uint256 signalId, address master, bytes32 pair, uint8 dex)` on L1.

**Capabilities:** EVM Read (L1), Confidential HTTP (TEE), EVM Write (L1)

**Latency:** 4-15 seconds

```
+---------------------------------------------------------------+
|  CRE SIGNAL VERIFICATION WORKFLOW                             |
|                                                               |
|  1. Log Trigger detects SignalPosted on L1                    |
|  2. EVM Read: SignalRegistry.signals(signalId)                |
|  3. Branch by dex:                                            |
|     +-- HYPERLIQUID -> Confidential HTTP to verify position   |
|     +-- GMX_V2 -> EVM Read on Arbitrum to verify position     |
|     +-- VERTEX -> Confidential HTTP to verify position        |
|  4. Compare: does master's DEX position match the signal?     |
|     - Same pair? Same direction? Same size (+/- 5%)? Same     |
|       entry price (+/- 1%)?                                   |
|  5. EVM Write: SignalRegistry.verifySignal(signalId, result)  |
|     - true -> VERIFIED (triggers copy workflow)               |
|     - false -> REJECTED (master penalized on leaderboard)     |
+---------------------------------------------------------------+
```

**Pseudocode:**

```typescript
const verificationWorkflow = new CREWorkflow({
  name: "signal-verification",
  trigger: new LogTrigger({
    chain: "black-cat-l1",
    contractAddress: SIGNAL_REGISTRY_ADDRESS,
    eventSignature: "SignalPosted(uint256,address,bytes32,uint8)",
  }),
});

verificationWorkflow.run(async (ctx, event) => {
  const { signalId, master } = event.args;

  // Read signal details from L1
  const signal = await ctx.evmRead({
    chain: "black-cat-l1",
    contract: SIGNAL_REGISTRY_ADDRESS,
    method: "signals",
    args: [signalId],
  });

  let verified = false;

  switch (signal.dex) {
    case 0: // HYPERLIQUID
      verified = await verifyOnHyperliquid(ctx, signal);
      break;
    case 1: // GMX_V2
      verified = await verifyOnGMXv2(ctx, signal);
      break;
    case 2: // VERTEX
      verified = await verifyOnVertex(ctx, signal);
      break;
  }

  // Write verification result back to L1
  await ctx.evmWrite({
    chain: "black-cat-l1",
    contract: SIGNAL_REGISTRY_ADDRESS,
    method: "verifySignal",
    args: [signalId, verified],
  });

  return { signalId, verified };
});
```

**Verification per DEX:**

```typescript
// Hyperliquid: Confidential HTTP to check master's position
async function verifyOnHyperliquid(ctx, signal) {
  const response = await ctx.confidentialHttp.post(
    "https://api.hyperliquid.xyz/info",
    {
      body: JSON.stringify({
        type: "userState",
        user: signal.master, // Master's Hyperliquid wallet
      }),
    }
  );

  const positions = response.assetPositions;
  const match = positions.find(p =>
    p.position.coin === pairToCoin(signal.pair) &&
    (p.position.szi > 0) === (signal.direction === 0) && // LONG check
    Math.abs(Number(p.position.szi) * Number(p.position.entryPx) - signal.sizeUsd) / signal.sizeUsd < 0.05 &&
    Math.abs(Number(p.position.entryPx) - signal.entryPrice) / signal.entryPrice < 0.01
  );

  return match !== undefined;
}

// GMX v2: EVM Read on Arbitrum to check position
async function verifyOnGMXv2(ctx, signal) {
  const position = await ctx.evmRead({
    chain: "arbitrum",
    contract: GMX_READER_ADDRESS, // 0xf60becbba223EEA9495Da3f606753867eC10d139
    method: "getAccountPositions",
    args: [GMX_DATASTORE, signal.master, 0, 10],
  });
  // Match position against signal params
  return positionMatchesSignal(position, signal);
}

// Vertex: Confidential HTTP to check subaccount position
async function verifyOnVertex(ctx, signal) {
  const response = await ctx.confidentialHttp.post(
    "https://gateway.prod.vertexprotocol.com/v1/query",
    {
      body: JSON.stringify({
        type: "subaccount_info",
        subaccount: masterToVertexSubaccount(signal.master),
      }),
    }
  );
  // Match position against signal params
  return vertexPositionMatchesSignal(response, signal);
}
```

### 6.2 copy-execution/ -- Execute Copies for Subscribers

**Trigger:** Log Trigger on `SignalVerified(uint256 signalId, address master)` on L1.

**Capabilities:** EVM Read (L1), Confidential HTTP (TEE), EVM Write (Arbitrum + L1), ACE Policy checks

**Latency:** 4-20 seconds per copy trade

```
+---------------------------------------------------------------+
|  CRE COPY EXECUTION WORKFLOW                                  |
|                                                               |
|  1. Log Trigger detects SignalVerified on L1                  |
|  2. EVM Read: signal details + master's rank                  |
|  3. EVM Read: all active subscribers whose tier allows        |
|     copying this master's rank                                |
|  4. For each eligible subscriber:                             |
|     a. Check ACE policies (subscription, tier, copy size)     |
|     b. Calculate copy size (based on tier max)                |
|     c. Lock collateral in BlackCatVault                       |
|     d. Execute copy trade on SAME DEX as master:              |
|        - Hyperliquid -> Confidential HTTP                     |
|        - GMX v2 -> EVM Write to Arbitrum                      |
|        - Vertex -> Confidential HTTP                          |
|     e. Record in CopyExecutionLog                             |
|  5. Return execution receipts                                 |
+---------------------------------------------------------------+
```

**Pseudocode:**

```typescript
const copyWorkflow = new CREWorkflow({
  name: "copy-execution",
  trigger: new LogTrigger({
    chain: "black-cat-l1",
    contractAddress: SIGNAL_REGISTRY_ADDRESS,
    eventSignature: "SignalVerified(uint256,address)",
  }),
});

copyWorkflow.run(async (ctx, event) => {
  const { signalId, master } = event.args;

  const signal = await ctx.evmRead({
    chain: "black-cat-l1",
    contract: SIGNAL_REGISTRY_ADDRESS,
    method: "signals",
    args: [signalId],
  });

  const masterRank = await ctx.evmRead({
    chain: "black-cat-l1",
    contract: LEADERBOARD_ADDRESS,
    method: "getMasterRank",
    args: [master],
  });

  // Get eligible subscribers (tier allows this rank)
  const subscribers = await getEligibleSubscribers(ctx, masterRank);

  for (const subscriber of subscribers) {
    const tierConfig = await getTierConfig(ctx, subscriber);
    const copySize = Math.min(tierConfig.maxCopySize, calculateDefaultCopySize(subscriber));

    // Lock collateral
    await ctx.evmWrite({
      chain: "black-cat-l1",
      contract: VAULT_ADDRESS,
      method: "lockCopyCollateral",
      args: [subscriber, copySize / signal.leverage],
    });

    // Execute on same DEX as master
    let result;
    switch (signal.dex) {
      case 0: result = await executeOnHyperliquid(ctx, signal, copySize); break;
      case 1: result = await executeOnGMXv2(ctx, signal, copySize); break;
      case 2: result = await executeOnVertex(ctx, signal, copySize); break;
    }

    // Record copy execution
    await ctx.evmWrite({
      chain: "black-cat-l1",
      contract: COPY_LOG_ADDRESS,
      method: "recordCopyExecution",
      args: [signalId, subscriber, copySize, result.fillPrice, signal.dex, result.txHash],
    });
  }
});
```

**DEX Execution (same as before -- CRE places the copy trade):**

Hyperliquid: Confidential HTTP POST to `https://api.hyperliquid.xyz/exchange` with EIP-712 signed order from TEE. CRE DON address is the trader on Hyperliquid (agent wallet system).

GMX v2: EVM Write to Arbitrum `ExchangeRouter.createOrder()` at `0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8`. USDC collateral sent to OrderVault `0x31eF83a530Fde1B38deDA89C0A6c72a85c7b8b4c`. Execution fee in ETH.

Vertex: Confidential HTTP POST to `https://gateway.prod.vertexprotocol.com/v1/execute` with EIP-712 signed order. CRE DON subaccount.

### 6.3 leaderboard-update/ -- Hourly PnL Consensus

**Trigger:** Cron every 1 hour

**Capabilities:** EVM Read (L1), Confidential HTTP (price APIs + DEX APIs), Consensus, EVM Write (L1)

```
+---------------------------------------------------------------+
|  CRE LEADERBOARD UPDATE WORKFLOW                              |
|                                                               |
|  1. Cron fires hourly                                         |
|  2. EVM Read: all registered masters from SignalRegistry      |
|  3. For each master:                                          |
|     a. Read all VERIFIED signals (open + closed)              |
|     b. For open signals: fetch current price from DEX API     |
|     c. Calculate: realized PnL + unrealized PnL               |
|     d. Calculate: win rate, Sharpe, max drawdown              |
|     e. Read subscriber copy count                             |
|  4. Consensus: N DON nodes independently compute scores       |
|  5. EVM Write: LeaderboardRegistry.batchUpdateScores()        |
+---------------------------------------------------------------+
```

**Latency:** 10-30 seconds depending on number of masters.

### 6.4 proof-of-reserve/ -- Bridge Solvency Check

**Trigger:** Cron every 6 hours

**Capabilities:** EVM Read (C-Chain + L1), EVM Write (L1)

```
1. EVM Read C-Chain: BlackCatBridge.getTotalDeposits()
2. EVM Read L1: eERCToken.totalSupply()
3. EVM Write L1: ProofOfReserve.updateHealth(deposits, supply)
```

**Latency:** 5-10 seconds. Simplest workflow.

### 6.5 subscription-renewal/ -- Daily Subscription Check

**Trigger:** Cron daily at 00:00 UTC

**Capabilities:** EVM Read (L1), EVM Write (L1)

Reads all active subscriptions, processes renewals for expired ones, downgrades if insufficient balance.

### 6.6 fraud-detection/ -- Continuous Position Monitoring

**Trigger:** Cron every 15 minutes

**Capabilities:** Confidential HTTP (DEX APIs), EVM Read (L1), EVM Write (L1)

```
+---------------------------------------------------------------+
|  CRE FRAUD DETECTION WORKFLOW                                 |
|                                                               |
|  1. Read all VERIFIED + open signals from L1                  |
|  2. For each signal: check if master still holds the position |
|     on the external DEX                                       |
|  3. If master closed their DEX position without closing the   |
|     signal on Black Cat:                                      |
|     a. Auto-close the signal with current price               |
|     b. Flag master for "silent close" (leaderboard penalty)   |
|  4. If master's actual position size diverges >20% from       |
|     signal: flag as "size mismatch"                           |
+---------------------------------------------------------------+
```

This prevents masters from gaming the system by posting signals, then closing their actual positions without reporting it.

---

## 7. PRIVACY ARCHITECTURE

Black Cat implements privacy through four layers. The goal: nobody sees what masters posted until after copy trades execute.

### 7.1 Layer 1: eERC Encrypted Signals

**Protects:** Signal data (pair, direction, size, entry price) on L1.

When a master posts a signal, the data is stored as eERC encrypted values. Only CRE (inside TEE) can read them for verification and copy execution.

| What observers see | What observers cannot see |
|-------------------|--------------------------|
| A signal was posted (event emitted) | Pair, direction, size, entry price |
| Master address | Position details until copies execute |
| That CRE verified it | Verification details |

### 7.2 Layer 2: validatorOnly Network Mode

**Protects:** Transaction propagation, mempool contents.

`validatorOnly=true` restricts P2P gossip to validator nodes only. External observers cannot run a node to monitor pending signal submissions.

### 7.3 Layer 3: TEE Execution via CRE

**Protects:** The link between signal data and copy trade execution.

- CRE reads encrypted signals inside TEE
- Copy trades executed from inside TEE
- External DEXes see CRE DON address, not subscriber addresses
- No on-chain link between "signal on L1" and "copy trade on Hyperliquid"

### 7.4 Layer 4: Delayed Revelation

**Protects:** Trade details during the execution window.

Signal details are NOT revealed on L1 until AFTER all copy trades have executed. Sequence:

```
1. Master posts signal       -> encrypted on L1 (nobody sees details)
2. CRE verifies in TEE       -> checks external DEX (private)
3. CRE executes copies       -> places copy trades on DEXes (private)
4. All copies confirmed      -> signal details revealed on L1
5. Leaderboard updates       -> public performance data
```

### 7.5 What Is Intentionally Public

| Public Data | Reason |
|-------------|--------|
| Leaderboard rankings | Core product -- showcasing trader performance |
| Proof of Reserve status | Transparency on protocol solvency |
| Master registration | Who is registered (not what they posted) |
| Subscription tiers exist | Pricing is public |
| Copy execution results (after completion) | Post-execution transparency |

---

## 8. CROSS-CHAIN ARCHITECTURE

### 8.1 Chain Topology

```
                    +------------------+
                    |  BLACK CAT L1    |
                    |  (Privacy Layer) |
                    +--------+---------+
                             |
                       ICTT/Teleporter
                             |
                    +--------+---------+
                    |  AVALANCHE       |
                    |  C-CHAIN         |<---- User deposits USDC here
                    |  (Custody Layer) |
                    +--------+---------+
                             |
                            CCIP
                             |
              +--------------+----------------+
              |              |                |
     +--------+---+   +-----+------+   +-----+------+
     |  ARBITRUM  |   |    BASE    |   |  ETHEREUM  |
     |  GMX v2    |   | (future)   |   |  (future)  |
     |  Vertex    |   |            |   |            |
     +------------+   +------------+   +------------+

     DIRECT CRE EXECUTION (no CCIP):
     +------------+
     | HYPERLIQUID|   CRE -> Confidential HTTP -> API
     |  (API)     |
     +------------+
```

### 8.2 Deposit Flow

```
User USDC on C-Chain -> BlackCatBridge.depositUSDC(amount)
  -> USDC transferred to bridge contract
  -> ICTT bridges to L1
  -> L1 receives wrapped USDC (native gas token)
  -> User calls BlackCatVault.deposit(eercProof)
  -> USDC converted to eERC encrypted balance
  -> User can now pay subscriptions and fund copy trades

Latency: ~5-15 seconds (ICTT bridge time)
```

### 8.3 Copy Execution Routing

| Target DEX | CRE Method | Latency | Pre-funding |
|------------|-----------|---------|-------------|
| Hyperliquid | Confidential HTTP from TEE | 4-8s | CRE DON registered as agent wallet |
| GMX v2 (Arbitrum) | EVM Write to ExchangeRouter | 8-20s | ETH + USDC on Arbitrum |
| Vertex (Arbitrum) | Confidential HTTP from TEE | 4-10s | Vertex subaccount funded |

### 8.4 Bridge Architecture

**ICTT (Avalanche ecosystem):**
- C-Chain to Black Cat L1
- USDC deposits/withdrawals, AUSD bridging
- Secured by Avalanche Warp Messaging (AWM)
- Latency: ~5-15 seconds

**CCIP (to non-Avalanche chains):**
- C-Chain to Arbitrum/Base/Ethereum
- Future cross-chain settlement
- Latency: ~15-30 minutes (finality)
- Route: `L1 -> [ICTT] -> C-Chain -> [CCIP] -> Arbitrum`

---

## 9. EXTERNAL DEX REFERENCE

Masters trade on these DEXes themselves. CRE reads positions for verification and executes copy trades for subscribers.

### 9.1 Hyperliquid

| Property | Value |
|----------|-------|
| Type | Independent L1, off-chain CLOB matching |
| API | REST: `https://api.hyperliquid.xyz` |
| Order endpoint | POST `/exchange` |
| Info endpoint | POST `/info` |
| Signing | EIP-712, chain ID 1337 |
| Taker fee | 4.5 bps |
| Maker fee | 1.5 bps |
| Min order | ~$10.25 |
| Rate limit | 1200 weight/min per IP |
| Agent wallets | CRE DON registered as agent for master wallet |

**Order payload (long ETH):**
```json
{
  "action": {
    "type": "order",
    "orders": [{
      "a": 1, "b": true, "p": "3250.5", "s": "1.0",
      "r": false, "t": { "limit": { "tif": "Ioc" } }
    }],
    "grouping": "na"
  },
  "nonce": 1708000000000,
  "signature": { "r": "0x...", "s": "0x...", "v": 27 }
}
```

### 9.2 GMX v2

| Property | Value |
|----------|-------|
| Type | On-chain perps on Arbitrum |
| ExchangeRouter | `0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8` |
| OrderVault | `0x31eF83a530Fde1B38deDA89C0A6c72a85c7b8b4c` |
| Reader | `0xf60becbba223EEA9495Da3f606753867eC10d139` |
| DataStore | `0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8` |
| Taker fee | 4-6 bps |
| Execution fee | ~0.0001 ETH per order |
| USD precision | 30 decimals |
| Order types | 2=MarketIncrease, 3=LimitIncrease, 5=MarketDecrease |
| Signed prices | `https://arbitrum-api.gmxinfra.io/prices/signed:latest` |

### 9.3 Vertex Protocol

| Property | Value |
|----------|-------|
| Type | Hybrid -- off-chain sequencer, on-chain settlement |
| API | `https://gateway.prod.vertexprotocol.com/v1` |
| Execute endpoint | POST `/execute` |
| Query endpoint | POST `/query` |
| Signing | EIP-712, Arbitrum chain ID |
| Taker fee | 2 bps |
| Maker fee | 0 bps |
| Matching speed | 5-15ms |
| Amount precision | 18 decimals, signed (positive=buy, negative=sell) |
| Subaccounts | 32-byte IDs (address + 12-byte suffix) |

### 9.4 Fee Comparison

| DEX | Open $10k (taker) | Close $10k (taker) | Round-trip | CRE Method |
|-----|-------------------|-------------------|------------|------------|
| Hyperliquid | $4.50 | $4.50 | $9.00 | Confidential HTTP |
| GMX v2 | $5.00 + gas | $5.00 + gas | $10.00 + gas | EVM Write |
| Vertex | $2.00 | $2.00 | $4.00 | Confidential HTTP |

---

## 10. PARTNER INTEGRATIONS

### 10.1 Agora AUSD

| Aspect | Detail |
|--------|--------|
| What | Institutional stablecoin, 100% US Treasuries + overnight repos |
| On Avalanche | $20M+ minted on C-Chain |
| Integration | Alternative deposit asset alongside USDC |
| Yield-sharing | AUSD in bridge earns ~4-5% APY, shared with Black Cat |
| Contracts | `BlackCatBridge.depositAUSD()`, `StablecoinManager.swapAUSDtoUSDC()` |

### 10.2 Kite AI

| Aspect | Detail |
|--------|--------|
| What | AI-focused Avalanche L1 with Proof of Attributed Intelligence (PoAI) |
| Integration | AI trading agents register through Kite AI identity system |
| PoAI | Verifies agent performance is attributable to its actual model |
| Frontend | "AI Agent" badge on leaderboard, agent metadata on profile |
| Cross-L1 | Kite AI L1 to Black Cat L1 via Teleporter |

### 10.3 Tether WDK

| Aspect | Detail |
|--------|--------|
| What | Open-source SDK for self-custodial wallets |
| Integration | Every user gets a WDK wallet for self-custody |
| Multi-chain | Works across C-Chain (deposits) and Black Cat L1 (subscriptions) |
| Signing | eERC proofs + signal submissions signed with WDK key |
| Fallback | Users can also use MetaMask/WalletConnect |

### 10.4 Suzaku

| Aspect | Detail |
|--------|--------|
| What | Restaking protocol for Avalanche L1 validator security |
| Integration | PoA validators at launch, Suzaku restaking later |
| Multi-asset | Stake AVAX, BTC, or ETH to secure Black Cat validators |
| Phases | Phase 1: PoA (3-5 validators) -> Phase 2: Suzaku (10+) -> Phase 3: full PoS (20+) |
| Rewards | Validators earn L1 gas fees (USDC), restakers get a share |

---

## 11. FRONTEND PAGES

All pages: Next.js 15 (App Router), Tailwind v4, shadcn/ui, Privy auth, Tether WDK wallets.

### 11.1 Landing Page -- `/`

| Component | Content |
|-----------|---------|
| HeroSection | "Copy the best. Privately." + privacy visualization |
| ProblemStatement | Exposed positions on other platforms vs encrypted on Black Cat |
| HowItWorks | 6-step flow from Section 2.1 |
| FeaturedMasters | Top 5 from leaderboard |
| PartnerLogos | Avalanche, Chainlink, Agora, Kite AI, Tether, Suzaku |
| CTASection | "Start Copying" / "View Leaderboard" |

### 11.2 Leaderboard -- `/leaderboard`

| Component | Content |
|-----------|---------|
| LeaderboardTable | Rank, Master, PnL, Win Rate, Sharpe, Signals, Volume |
| TimeframeSelector | 7d / 30d / 90d / All Time |
| TraderTypeFilter | All / Human / AI Agent |
| TierBadges | Shows which tier can copy which ranks |
| SearchBar | Search by master name or address |

Contract reads: `LeaderboardRegistry.getTopMasters()`, `getMastersByMetric()`

### 11.3 Master Profile -- `/master/:address`

| Component | Content |
|-----------|---------|
| ProfileHeader | Avatar, name, rank, AI badge, registration date |
| StatsGrid | PnL, Win Rate, Sharpe, Max DD, Volume, Verified Signals |
| PnLChart | Cumulative PnL over time |
| RecentSignals | Closed signals with PnL (only after close) |
| CopySection | "Subscribe to copy this master" with tier requirement |

### 11.4 Subscribe -- `/subscribe`

| Component | Content |
|-----------|---------|
| TierCards | Free / Basic ($19) / Pro ($49) / Elite ($99) |
| TierComparison | Feature matrix: ranks copyable, max size, alerts, analytics, API |
| CurrentPlanBadge | Current subscription status |
| PaymentConfirmation | Confirm USDC payment from L1 balance |

### 11.5 Portfolio -- `/portfolio`

| Component | Content |
|-----------|---------|
| EncryptedBalanceCard | Total balance, available, locked in copies |
| ActiveCopies | Current copy trades with real-time PnL |
| CopyHistory | Closed copy trades with PnL breakdown |
| SubscriptionTab | Current tier, expiry, auto-renew toggle |
| WithdrawButton | Initiate L1 to C-Chain withdrawal |

### 11.6 Deposit -- `/deposit`

| Component | Content |
|-----------|---------|
| DepositForm | Amount, asset (USDC/AUSD), deposit button |
| BridgeStatus | C-Chain tx -> ICTT -> L1 confirmation |
| BalanceDisplay | C-Chain USDC balance + L1 encrypted balance |
| WithdrawForm | Amount, withdraw button |

### 11.7 Master Dashboard -- `/master-dashboard`

For registered masters to manage their signals.

| Component | Content |
|-----------|---------|
| PostSignalForm | Pair, direction, size, entry price, DEX, leverage |
| ActiveSignals | Open signals with verification status |
| SignalHistory | Closed signals with PnL |
| RevenueEarnings | Revenue share earned from subscription pool |
| PerformanceStats | Leaderboard metrics |

### 11.8 Admin -- `/admin`

| Component | Content |
|-----------|---------|
| ProofOfReservePanel | Current PoR status, health ratio, history |
| CREHealthPanel | Workflow status, execution times, error rates |
| ValidatorPanel | Validator set status, uptime |
| PlatformStats | Users, signals, copies, revenue |
| EmergencyControls | Pause bridge, pause signals |

### 11.9 Pitch Deck -- `/pitch`

Full-screen presentation: Problem -> Solution -> Architecture -> Privacy -> Demo -> Market -> Revenue -> Partners -> Team.

---

## 12. SUBSCRIPTION MODEL

### 12.1 Tier Comparison

| Feature | Free ($0) | Basic ($19/mo) | Pro ($49/mo) | Elite ($99/mo) |
|---------|-----------|----------------|--------------|----------------|
| View leaderboard | Yes | Yes | Yes | Yes |
| Copy trades | No | Ranks 51-100 | Ranks 11-50 | Ranks 1-10 |
| Max copy size | -- | $5,000 | $25,000 | $100,000 |
| Copy alerts | No | Discord | Discord + Telegram | All channels |
| Analytics | Basic | Basic | Detailed | Full + export |
| API access | No | No | No | Yes |
| Priority execution | No | No | No | Yes (first in queue) |

### 12.2 Why Subscribe to the App (Not Traders)

| App Subscription Model | Per-Trader Subscription Model |
|------------------------|------------------------------|
| One payment, access to a tier of masters | Pay each master separately |
| Tier determines quality (rank range) | User must evaluate each master |
| Masters compete for rank (better product) | Masters compete for individual followers |
| Revenue share incentivizes performance | Profit share creates conflicts |
| Simpler UX | Complex UX |

---

## 13. USER FLOWS

### 13.1 New User Signs Up and Subscribes

```
1. User visits black-cat.xyz
2. Clicks "Connect Wallet" -> Privy auth (email/social/wallet)
3. Navigates to /deposit
4. Deposits $500 USDC on Avalanche C-Chain
5. Bridge status: "Bridging..." (5-15 seconds)
6. USDC arrives on L1 via ICTT
7. Generates eERC proof (client-side, 2-5 seconds)
8. Calls BlackCatVault.deposit(eercProof) on L1
9. Navigates to /subscribe
10. Selects Pro tier ($49/month)
11. Confirms payment -> SubscriptionManager.subscribe(PRO)
12. User can now copy masters ranked 11-50
```

### 13.2 Master Posts a Signal

```
1. Master trades on Hyperliquid directly (opens ETH-PERP Long $10k 5x)
2. Master navigates to /master-dashboard on Black Cat
3. Fills in signal form: ETH-PERP, LONG, $10,000, entry $3,250.50, Hyperliquid, 5x
4. Clicks "Post Signal"
5. Signal encrypted with eERC, stored on L1
6. SignalPosted event emitted
7. CRE picks up event, verifies on Hyperliquid API
8. CRE confirms: master does hold ETH-PERP Long ~$10k @ ~$3,250
9. SignalVerified event emitted
10. Dashboard shows: "Signal verified -- eligible for copy execution"
```

### 13.3 Copies Execute for Subscribers

```
1. CRE detects SignalVerified event
2. CRE reads master's rank (e.g. rank 25)
3. CRE reads all Pro + Elite subscribers (ranks 11-50 and 1-10)
4. For each eligible subscriber:
   a. Check ACE policies (active subscription, tier allows rank 25, copy size OK)
   b. Lock collateral in BlackCatVault
   c. Execute copy trade on Hyperliquid via Confidential HTTP
   d. Record in CopyExecutionLog
5. Subscribers see copy positions in /portfolio
6. CRITICAL: Subscribers never saw the signal details until AFTER their copies filled
```

### 13.4 Signal Closes, PnL Settled

```
1. Master closes ETH-PERP on Hyperliquid (sells at $3,400)
2. Master posts signal close on Black Cat: closeSignal(signalId, $3,400)
3. CRE verifies position is actually closed on Hyperliquid
4. CRE closes all copy trades for this signal
5. PnL calculated for each copy trade
6. Collateral unlocked + PnL settled in BlackCatVault
7. Next hourly leaderboard update includes this PnL
```

### 13.5 Revenue Distribution (Monthly)

```
1. End of month: $50,000 total subscription revenue
2. CRE reads LeaderboardRegistry rankings
3. Revenue split:
   - Ranks 1-10 share 50% ($25,000) = ~$2,500 per master
   - Ranks 11-50 share 30% ($15,000) = ~$375 per master
   - Ranks 51-100 share 20% ($10,000) = ~$200 per master
4. RevenueDistributor.distribute() called by CRE
5. Masters claim via claimRevenue()
```

### 13.6 Fraud Detection Catches Fake Signal

```
1. Master posts signal: ETH-PERP Long $50k
2. CRE verifies on Hyperliquid: master has ETH-PERP Long $5k (not $50k)
3. Size mismatch >20% -> signal REJECTED
4. Master flagged on leaderboard (penalty to ranking)
5. No copy trades executed for this signal
```

---

## 14. AVALANCHE L1 SPECIFICATIONS

### 14.1 Configuration

| Parameter | Value |
|-----------|-------|
| VM | Subnet-EVM (latest stable) |
| Chain ID | 77777 |
| Block time | 500ms (ACP-226) |
| Max gas per block | 20,000,000 |
| Gas token | Wrapped USDC via ICTT (6 decimals) |
| Gas price target | ~0.001 USDC per tx |
| Network mode | validatorOnly = true |
| EVM compatibility | Full |

### 14.2 Validator Set

| Phase | Timeline | Validators | Security |
|-------|----------|------------|----------|
| 1 (Launch) | Day 0 | 3-5 PoA (trusted) | PoAValidatorManager.sol |
| 2 (Month 3) | +3 months | 10 (Suzaku restaking) | AVAX/BTC/ETH staked |
| 3 (Month 6) | +6 months | 20+ (full PoS) | Permissionless via Suzaku |

Cost: ~1.33 AVAX/month per validator. 3 validators = ~4 AVAX/month (~$100-150).

### 14.3 eERC Deployment

| Parameter | Value |
|-----------|-------|
| Mode | Converter (wrap USDC into eUSDC) |
| Proof system | Groth16 zk-SNARKs |
| Encryption | ElGamal on BabyJubJub |
| Client prover | WASM-compiled, browser-side |
| Proof generation | 2-5 seconds |
| Proof size | ~256 bytes per transfer |

### 14.4 Genesis Configuration

```json
{
  "config": {
    "chainId": 77777,
    "homesteadBlock": 0,
    "eip150Block": 0,
    "eip155Block": 0,
    "eip158Block": 0,
    "byzantiumBlock": 0,
    "constantinopleBlock": 0,
    "petersburgBlock": 0,
    "istanbulBlock": 0,
    "muirGlacierBlock": 0,
    "subnetEVMTimestamp": 0,
    "feeConfig": {
      "gasLimit": 20000000,
      "targetBlockRate": 1,
      "minBaseFee": 1000,
      "targetGas": 10000000,
      "baseFeeChangeDenominator": 48,
      "minBlockGasCost": 0,
      "maxBlockGasCost": 10000000,
      "blockGasCostStep": 500000
    }
  },
  "alloc": {
    "0xADMIN_ADDRESS": {
      "balance": "0x204FCE5E3E25026110000000"
    }
  }
}
```

### 14.5 Network Configuration

```json
{
  "validatorOnly": true,
  "networkUpgrades": {
    "subnetEVMTimestamp": 0
  }
}
```

### 14.6 L1 Launch Steps (Fuji)

```bash
# 1. Install Avalanche CLI
curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh

# 2. Create L1
avalanche blockchain create black-cat --evm --chain-id 77777 --token-symbol USDC --custom-gas-token

# 3. Deploy to Fuji
avalanche blockchain deploy black-cat --fuji

# 4. Add validators
avalanche node validate black-cat --fuji

# 5. Configure ICTT bridge (Home on C-Chain, Remote on L1)
# 6. Deploy eERC contracts (verifier + token in Converter mode)
# 7. Deploy Black Cat contracts (see Section 20)
```

---

## 15. PROOF OF RESERVE

### 15.1 Invariant

**L1 wrapped USDC supply must NEVER exceed C-Chain USDC deposits.**

### 15.2 Health Formula

```
ratio = (L1_wrapped_supply * 10000) / C_Chain_deposits

Healthy:   ratio <= 10000
Alert:     10001-10050 (0-0.5% over)
Warning:   10051-10200 (0.5-2% over)
Critical:  ratio > 10200 (>2% over -> auto-pause bridge)
```

### 15.3 CRE Implementation

```
Cron every 6 hours:
1. EVM Read C-Chain: BlackCatBridge.getTotalDeposits()
2. EVM Read L1: eERCToken.totalSupply()
3. EVM Write L1: ProofOfReserve.updateHealth(deposits, supply)
```

No Confidential HTTP needed. No Consensus needed. Two reads, one write.

---

## 16. LEADERBOARD SYSTEM

### 16.1 Scoring Metrics

| Metric | Weight | Calculation |
|--------|--------|-------------|
| Total PnL | Primary sort | Sum of all verified signal PnL (realized + unrealized) |
| Win Rate | Secondary | (profitable signals / total closed signals) * 10000 bps |
| Sharpe Ratio | Tie-breaker | avg return / std dev of returns * 1000 |
| Max Drawdown | Risk indicator | Largest peak-to-trough PnL decline |
| Verified Signals | Trust metric | Total signals that passed CRE verification |
| Total Volume | Activity metric | Sum of all signal sizes in USD |

### 16.2 CRE Consensus

Each hourly update: N DON nodes independently calculate all scores. Consensus ensures:
- No single node can manipulate rankings
- Stale price data is excluded (outlier detection)
- Agreed scores are written on-chain

### 16.3 Anti-Gaming

| Attack | Defense |
|--------|---------|
| Fake signals (no real position) | CRE verifies actual DEX position via Confidential HTTP |
| Size inflation ($5k real, post $50k) | CRE checks size within 5% tolerance |
| Silent close (close DEX position, keep signal open) | Fraud detection workflow every 15 min |
| Wash trading (open/close rapidly for volume) | Minimum hold time for signal to count toward PnL |
| Multiple accounts | Kite AI identity for AI agents; human KYC via Privy for top ranks |

---

## 17. REVENUE MODEL

### 17.1 Revenue Streams

| Stream | Source | Projected (Month 12) |
|--------|--------|---------------------|
| Subscription fees | Basic ($19) + Pro ($49) + Elite ($99) | ~$45,000/month |
| L1 gas fees | ~$0.001 per tx, ~10k tx/day | ~$300/month |
| AUSD yield | ~4-5% APY on bridge AUSD | ~$4,000/month (at $1M AUSD) |
| Copy trade spread | Small markup on copy execution | TBD |

### 17.2 Subscription Revenue Projection

| Metric | Month 1 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| Free users | 500 | 5,000 | 20,000 |
| Basic ($19) | 50 | 300 | 800 |
| Pro ($49) | 20 | 150 | 500 |
| Elite ($99) | 5 | 30 | 100 |
| Monthly sub revenue | $2,425 | $14,820 | $44,600 |

### 17.3 Master Revenue Share

Subscription revenue is pooled and distributed monthly by rank:

| Rank Range | Pool Share | Example (Month 12) |
|------------|-----------|---------------------|
| 1-10 | 50% | ~$2,230 per master/month |
| 11-50 | 30% | ~$334 per master/month |
| 51-100 | 20% | ~$178 per master/month |

### 17.4 Key Differentiator

**Black Cat does NOT take a cut of trading profits.** Revenue comes from subscriptions. Clean regulatory positioning.

---

## 18. SECURITY CONSIDERATIONS

### 18.1 TEE Guarantees

| Guarantee | Detail |
|-----------|--------|
| Code integrity | Attestation proves exact code running in enclave |
| Data confidentiality | DEX API keys and signing keys never exposed outside TEE |
| Execution isolation | Host OS cannot observe or tamper with TEE |
| Limitation | Side-channel timing attacks possible (mitigated by CRE design) |
| Limitation | Bugs in workflow code are still bugs |

### 18.2 eERC Security

| Property | Detail |
|----------|--------|
| Groth16 soundness | Breaking requires solving discrete log |
| ElGamal IND-CPA | Ciphertexts indistinguishable from random |
| Trust assumption | Groth16 trusted setup (eERC ships with completed ceremony) |
| Client-side proofs | User private key never leaves their device |
| Visible | THAT a transfer occurred (addresses). NOT the amount. |

### 18.3 Key Management

| Key | Location | Risk if Compromised |
|-----|----------|---------------------|
| User eERC private key | Tether WDK (user device) | User loses balance privacy |
| User wallet key | Privy / WDK | User loses funds |
| CRE DEX signing key | TEE (threshold-split) | Unauthorized copy trades |
| Admin key | Hardware wallet (multisig) | Full protocol compromise |
| Validator keys | Validator nodes | Chain halt or reorg |

### 18.4 Bridge Security (ICTT)

- Secured by Avalanche Warp Messaging (AWM) with BLS multi-signatures
- ProofOfReserve monitors bridge health every 6 hours
- Emergency pause on BlackCatBridge
- Rate limiting on large withdrawals

### 18.5 Graceful Degradation

| Failure | Impact | Recovery |
|---------|--------|----------|
| CRE down | No new verifications or copies. Existing positions unaffected. | CRE resumes; pending signals processed. |
| External DEX down | Copies fail on that DEX. Other DEXes unaffected. | Retry with backoff. |
| L1 down | No new signals/subscriptions. C-Chain bridge holds USDC safely. | Restart validators. |

---

## 19. TESTING STRATEGY

### 19.1 Contract Testing (Foundry)

```bash
forge test --match-contract SignalRegistryTest
forge test --match-contract BlackCatVaultTest
forge test --match-contract LeaderboardRegistryTest
forge test --match-contract SubscriptionManagerTest
forge test --match-contract CopyExecutionLogTest
forge test --match-contract RevenueDistributorTest
forge test --match-contract ProofOfReserveTest
forge test --match-contract BlackCatBridgeTest
```

Test categories: signal posting/verification, subscription lifecycle, copy execution recording, leaderboard batch updates, PoR health checks, ACE policy enforcement, access control, edge cases.

### 19.2 CRE Workflow Testing

- CRE simulator for local testing
- Mock DEX servers (Express.js) mimicking Hyperliquid and Vertex APIs
- Test: signal verification (match/mismatch), copy execution, leaderboard consensus, PoR

### 19.3 Frontend E2E (Playwright)

```bash
npx playwright test tests/auth.spec.ts
npx playwright test tests/deposit.spec.ts
npx playwright test tests/subscribe.spec.ts
npx playwright test tests/leaderboard.spec.ts
npx playwright test tests/master-dashboard.spec.ts
npx playwright test tests/portfolio.spec.ts
```

Auth: Privy test mode `test-1870@privy.io` + OTP `414954`.

### 19.4 L1 Testnet Testing

- Deploy L1 on Fuji with Avalanche CLI
- Test ICTT bridge (C-Chain Fuji to Black Cat L1)
- Verify validatorOnly mode
- Gas token configuration (USDC native)
- Block time verification (500ms)

---

## 20. DEPLOYMENT STRATEGY

### 20.1 Phase 1: Deploy L1 on Fuji

```bash
avalanche blockchain create black-cat --evm
avalanche blockchain deploy black-cat --fuji
avalanche node validate black-cat --fuji --node-id NodeID-xxx
```

### 20.2 Phase 2: Deploy Contracts

```
C-CHAIN:
1. BlackCatBridge.sol
2. StablecoinManager.sol

L1:
3. eERC Verifier + Token (Converter mode)
4. BlackCatVault.sol
5. SignalRegistry.sol
6. LeaderboardRegistry.sol
7. SubscriptionManager.sol
8. CopyExecutionLog.sol
9. RevenueDistributor.sol
10. ProofOfReserve.sol

ACE POLICIES:
11. SubscriptionPolicy.sol
12. TierAccessPolicy.sol
13. CopySizePolicy.sol
14. BlackCatExtractor.sol

POST-DEPLOYMENT:
15. Configure cross-references
16. Set CRE DON address on all contracts
17. Configure ICTT bridge endpoints
18. Fund CRE DON on Arbitrum (ETH + USDC for GMX)
19. Register CRE DON subaccount on Vertex
20. Register CRE DON as Hyperliquid agent wallet
```

```bash
forge script script/DeployCChain.s.sol --rpc-url $FUJI_RPC --broadcast --verify
forge script script/DeployL1.s.sol --rpc-url $BLACK_CAT_L1_RPC --broadcast
forge script script/Configure.s.sol --rpc-url $BLACK_CAT_L1_RPC --broadcast
```

### 20.3 Phase 3: Register CRE Workflows

```bash
cre workflow register signal-verification --trigger log --chain black-cat-l1 \
  --contract $SIGNAL_REGISTRY --event "SignalPosted(uint256,address,bytes32,uint8)"

cre workflow register copy-execution --trigger log --chain black-cat-l1 \
  --contract $SIGNAL_REGISTRY --event "SignalVerified(uint256,address)"

cre workflow register leaderboard-update --trigger cron --schedule "0 * * * *"

cre workflow register proof-of-reserve --trigger cron --schedule "0 */6 * * *"

cre workflow register subscription-renewal --trigger cron --schedule "0 0 * * *"

cre workflow register fraud-detection --trigger cron --schedule "*/15 * * * *"
```

### 20.4 Phase 4: Deploy Frontend

```bash
pnpm install && pnpm build && vercel deploy --prod
```

Environment variables:
```
NEXT_PUBLIC_PRIVY_APP_ID
NEXT_PUBLIC_MODE=testnet
NEXT_PUBLIC_L1_RPC_URL
NEXT_PUBLIC_CCHAIN_RPC_URL
NEXT_PUBLIC_SIGNAL_REGISTRY_ADDRESS
NEXT_PUBLIC_VAULT_ADDRESS
NEXT_PUBLIC_LEADERBOARD_ADDRESS
NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS
NEXT_PUBLIC_COPY_LOG_ADDRESS
NEXT_PUBLIC_BRIDGE_ADDRESS
```

---

## 21. DEMO FLOW

### 21.1 Five-Minute Demo

```
[0:00 - 0:30] INTRODUCTION
"Black Cat is a private copy trading signal platform. Masters trade on external
DEXes, post encrypted signals on our Avalanche L1, CRE verifies positions and
executes copies for subscribers. Nobody sees signals until copies are done."

[0:30 - 1:30] DEPOSIT AND SUBSCRIBE
- Deposit $500 USDC via BlackCatBridge on C-Chain
- Show ICTT bridge progress
- Show encrypted balance on L1
- Subscribe to Pro tier ($49/month)
- "Now I can copy masters ranked 11-50."

[1:30 - 2:30] MASTER POSTS A SIGNAL
- Switch to "Master" account
- Show Hyperliquid: master has ETH-PERP Long $10k open
- On Black Cat /master-dashboard: post signal (ETH-PERP, Long, $10k, Hyperliquid)
- Show CRE verification: "Checking Hyperliquid API..."
- Signal verified

[2:30 - 3:30] COPY TRADES EXECUTE
- Switch to "Subscriber" account
- CRE executes copy trade on Hyperliquid for subscriber
- Show copy appearing in /portfolio
- "The subscriber never saw the master's signal until after the copy filled.
  Zero front-running."

[3:30 - 4:00] LEADERBOARD + PROOF OF RESERVE
- Show /leaderboard with CRE-verified PnL scores
- Show /admin with PoR status: green, 99.97% healthy
- "Chainlink CRE verifies positions, calculates PnL, checks bridge solvency."

[4:00 - 4:30] FRAUD DETECTION
- Show a rejected signal: master posted $50k but only has $5k on Hyperliquid
- "CRE caught the mismatch. Signal rejected. No copies executed."

[4:30 - 5:00] WRAP UP
- "Black Cat: private signals, verified performance, automated copy execution.
  Built on Avalanche L1 with Chainlink CRE."
```

### 21.2 Convergence Demo Angle

CRE capabilities: Confidential HTTP (verify + copy on Hyperliquid/Vertex from TEE), EVM Write (GMX on Arbitrum), Consensus (leaderboard PnL), Cron (PoR + subscriptions + fraud detection), Log Trigger (signal verification + copy execution), ACE (subscription enforcement), CCIP (cross-chain routing).

### 21.3 Build Games Demo Angle

Avalanche L1 + partners: eERC encrypted signals, USDC native gas via ICTT, validatorOnly mode, Agora AUSD deposits, Kite AI agent identity, Tether WDK wallets, Suzaku validator security.

---

## 22. HACKATHON SUBMISSION

### 22.1 Chainlink Convergence

**CRE & AI Track:**
- 6 CRE workflows: signal verification, copy execution, leaderboard, PoR, subscriptions, fraud detection
- Confidential HTTP for DEX position verification and copy execution
- DON Consensus for tamper-proof leaderboard
- ACE policies for subscription and tier enforcement
- AI agent trading with Kite AI identity

**DeFi Track:**
- Copy trading signal platform across 3 Tier 1 DEXes
- CRE-verified leaderboard (no self-reported stats)
- Proof of Reserve via CRE Cron
- Subscription-based revenue (does not touch trading profits)

### 22.2 Avalanche Build Games

**Custom Avalanche L1:**
- Subnet-EVM, chainId 77777
- eERC for encrypted signals (zk-SNARKs + ElGamal)
- validatorOnly mode for mempool privacy
- USDC native gas via ICTT
- 500ms block time

**Partner Integrations:**
- Kite AI: AI trading agent identity + PoAI
- Agora AUSD: Alternative deposit + yield-sharing
- Tether WDK: Self-custodial wallets
- Suzaku: Validator security via restaking

### 22.3 Judging Criteria

| Criterion | Black Cat |
|-----------|-----------|
| Technical Implementation | 14 contracts, 6 CRE workflows, 4-layer privacy, 3 DEX integrations |
| Innovation | First private copy trading signal platform. First eERC for signal encryption. |
| User Experience | 9 frontend pages, USDC gas, Privy email login, no crypto knowledge needed |
| Business Viability | Subscription revenue from Day 1. $1.5B+ daily addressable market. |

---

## 23. COMPETITIVE ANALYSIS

| Feature | Black Cat | Copin.io | Perpy Finance | GMGN |
|---------|----------|----------|---------------|------|
| Signal privacy | Yes (4 layers) | No | No | No |
| Position verification | CRE (TEE) | No (trusts chain data) | No | No |
| Leaderboard integrity | CRE Consensus | Self-reported | No leaderboard | No |
| Proof of Reserve | CRE Cron | No | No | No |
| Cross-chain copies | 3 DEXes | Reads only | GMX only | Solana only |
| Custom chain | Avalanche L1 | No | No | No |
| Encrypted data | eERC | No | No | No |
| Revenue model | Subscriptions | Fees + AUM + profit | Fees + profit | Priority fees |
| AI agent support | Kite AI | No | No | No |
| Fraud detection | CRE automated | None | None | None |

---

## 24. ROADMAP

| Phase | Timeline | Milestones |
|-------|----------|------------|
| Hackathon MVP | Now | L1 on Fuji, core contracts, CRE simulator, frontend, 3 DEX integrations |
| Alpha | +1 month | Real CRE workflows, 10 master testers, leaderboard live |
| Beta | +3 months | Suzaku restaking, 50+ masters, subscription payments live |
| Public | +6 months | Full PoS, 100+ masters, mobile app, additional DEXes |

---

## 25. REFERENCE LINKS

| Resource | URL |
|----------|-----|
| eERC (EncryptedERC) | https://github.com/ava-labs/EncryptedERC |
| Avalanche L1 docs | https://docs.avax.network/avalanche-l1s |
| ICTT | https://docs.avax.network/tooling/cross-chain/interchain-token-transfer |
| Chainlink CRE | https://docs.chain.link/cre |
| CCIP | https://docs.chain.link/ccip |
| ACE | https://docs.chain.link/ccip/concepts/ace |
| Subnet-EVM | https://github.com/ava-labs/subnet-evm |
| precompile-evm | https://github.com/ava-labs/precompile-evm |
| Hyperliquid API | https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api |
| GMX v2 contracts | https://github.com/gmx-io/gmx-synthetics |
| Vertex Protocol | https://vertex-protocol.gitbook.io/docs/developer-resources/api |
| Agora AUSD | https://www.agora.finance/ |
| Kite AI | https://www.gokite.ai/ |
| Tether WDK | https://github.com/nicola/tether-wdk |
| Suzaku | https://www.suzaku.network/ |
| ACP-77 (Avalanche9000) | https://github.com/avalanche-foundation/ACPs/tree/main/ACPs/77-reinventing-subnets |
| ACP-226 (Dynamic block times) | https://github.com/avalanche-foundation/ACPs/tree/main/ACPs/226-dynamic-min-block-time |
