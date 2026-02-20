# Black Cat — Hackathon MVP Plan

**Goal:** Build the minimum viable product that demonstrates private copy trading with CRE-verified leaderboards, deployable and demo-able for Chainlink Convergence submission.

**Chain:** Avalanche Fuji
**Auth:** Privy (embedded wallets)
**CRE:** 1 workflow (signal verification + leaderboard update), simulated via CLI

---

## What We're Building

A platform where expert traders (Masters) post trading signals (direction, token pair, entry price, target, stop loss). A CRE cron workflow runs every 30 seconds: reads active signals, fetches real prices from CoinGecko, calculates PnL for each signal, gets AI market commentary from Claude Service, reaches consensus, and writes verified results + updated leaderboard rankings on-chain. Subscribers pay for access to ranked trader signals. The verification is tamper-proof — no one can fake their leaderboard position because CRE independently verifies every signal against real market data.

---

## Architecture

```
[Master Trader] → postSignal() → [BlackCat Contract]
                                        ↑ onReport()
                                  [Keystone Forwarder]
                                        ↑ signed report
                                  [CRE DON / Simulation]
                                        |
                        ┌───────────────┼───────────────┐
                        ↓               ↓               ↓
                  [EVM Read]    [CoinGecko API]  [Claude Service]
                  active          current          AI market
                  signals         prices           analysis

[Subscriber] → subscribe() → [BlackCat Contract] → view leaderboard + signals
```

---

## Smart Contracts (Foundry)

### 1. TestUSDC.sol
Simple mintable ERC-20 (6 decimals). Owner can mint. Public `faucet(amount)` for testing.

### 2. BlackCat.sol
All-in-one: master registry + signal posting + leaderboard + subscriptions + CRE receiver.

**Structs:**
```
Master { address addr, string name, uint256 registeredAt, bool active }

Signal {
  uint256 id, address master,
  uint8 direction,       // 0=LONG, 1=SHORT
  string tokenPair,      // "ETH/USD", "BTC/USD", "AVAX/USD"
  uint256 entryPrice,    // 18 decimals
  uint256 targetPrice,
  uint256 stopLoss,
  uint256 createdAt,
  uint8 status,          // 0=ACTIVE, 1=TARGET_HIT, 2=STOPPED_OUT, 3=EXPIRED
  int256 pnlBps          // basis points (+500 = +5%, -300 = -3%)
}

MasterStats {
  uint256 totalSignals, uint256 wins, uint256 losses,
  int256 cumulativePnlBps, uint256 rank
}

Subscription { address subscriber, uint8 tier, uint256 expiresAt }
```
- Tier: 0=FREE (top 3 masters only), 1=PRO (all masters, 100 USDC/month)

**State:**
- `masters` mapping(address => Master)
- `masterAddresses` address[] — for iteration
- `signals` mapping(uint256 => Signal)
- `signalCount` uint256
- `masterStats` mapping(address => MasterStats)
- `subscriptions` mapping(address => Subscription)
- `leaderboard` address[] — sorted by rank
- `keystoneForwarder` address

**Key Functions:**

*Master Functions:*
- `registerMaster(string name)` — register as master trader
- `postSignal(uint8 direction, string tokenPair, uint256 entryPrice, uint256 targetPrice, uint256 stopLoss)` — post a new signal (must be registered master)
- `getMasterSignals(address master)` → Signal[]

*Subscriber Functions:*
- `subscribe(uint8 tier)` — pay TestUSDC for PRO tier (FREE is default)
- `getAccessibleMasters(address subscriber)` → address[] — returns masters accessible at subscriber's tier

*CRE Receiver:*
- `onReport(bytes metadata, bytes report)` — only keystoneForwarder
- Decodes report: `(uint256[] signalIds, int256[] pnlBps, uint8[] statuses, address[] rankedMasters)`
- Settles each signal with PnL and status
- Overwrites leaderboard with new rankings

*View Functions:*
- `getLeaderboard()` → (address[], MasterStats[])
- `getActiveSignals()` → Signal[]
- `getMasterStats(address)` → MasterStats
- `getSignal(uint256 id)` → Signal

**Events:**
- `MasterRegistered(address master, string name)`
- `SignalPosted(uint256 id, address master, uint8 direction, string tokenPair, uint256 entryPrice)`
- `SignalSettled(uint256 id, int256 pnlBps, uint8 status)`
- `LeaderboardUpdated(address[] rankedMasters)`
- `Subscribed(address subscriber, uint8 tier, uint256 expiresAt)`

**Report Encoding:**
```
abi.encode(uint256[] signalIds, int256[] pnlBps, uint8[] statuses, address[] rankedMasters)
```

### Deployment Order
1. Deploy TestUSDC
2. Mint 1,000,000 TestUSDC to deployer
3. Deploy BlackCat(testUSDC, keystoneForwarder)

---

## CRE Workflow: `verify-signals`

**Trigger:** Cron (every 30 seconds for demo)
**Capabilities:** EVM Read, HTTP Client (x2), Consensus, EVM Write
**HTTP Calls:** 2 of 5 limit

### Flow:

**Step 1 — EVM Read: Active Signals**
- Read `getActiveSignals()` from BlackCat contract
- If no active signals, exit early (no report needed)
- Chain: avalanche-testnet-fuji

**Step 2 — HTTP Client #1: Current Prices**
- GET `https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,avalanche-2&vs_currencies=usd`
- Consensus: `consensusIdenticalAggregation`
- Parse prices for each active signal's token pair

**Step 3 — Compute PnL**
- For each active signal:
  - Calculate PnL in basis points: `(currentPrice - entryPrice) / entryPrice * 10000`
  - If SHORT: invert sign
  - Determine status: TARGET_HIT if pnl >= targetBps, STOPPED_OUT if pnl <= -stopBps, else ACTIVE
- Rank masters by cumulative PnL (descending)

**Step 4 — HTTP Client #2: AI Market Commentary**
- POST to Claude Service with settled signal data
- Ask for brief market analysis and signal quality assessment
- Response logged but NOT written on-chain (commentary is for frontend enrichment only)
- Consensus: `consensusIdenticalAggregation`

**Step 5 — Prepare Report**
- Encode: `(signalIds[], pnlBps[], statuses[], rankedMasters[])`
- Only include signals that have been settled (TARGET_HIT or STOPPED_OUT)
- Include full leaderboard ranking
- `prepareReportRequest(encodedPayload)`

**Step 6 — EVM Write: Settle Signals + Update Leaderboard**
- `writeReport()` to BlackCat receiver
- Contract's `onReport()` settles signals and updates leaderboard

### Config (config.staging.json):
```json
{
  "receiverAddress": "<deployed_BlackCat_address>",
  "gasLimit": 800000,
  "chainSelectorName": "avalanche-testnet-fuji"
}
```

### Secrets (secrets.yaml):
```yaml
secretsNames:
  CLAUDE_SERVICE_API_KEY:
    - CLAUDE_API_KEY_VAR
```

---

## Frontend (Next.js 15)

### Page 1: `/` — Landing
**Sections:**
- Hero: "Black Cat — Private Copy Trading" with tagline about CRE-verified signals
- How It Works: 3-step visual (Post Signal → CRE Verifies → Leaderboard Updates)
- Live Leaderboard Preview: Top 5 masters with stats (pulls from contract)
- CTAs: "Become a Master" + "Subscribe"

### Page 2: `/leaderboard` — Verified Leaderboard
**Sections:**
- Ranked table of all masters: rank, name, address, total signals, win rate, cumulative PnL, streak
- Click on master → expand to see their recent signals (direction, token, entry, result, PnL)
- Badge: "CRE Verified" indicator showing last verification timestamp
- Filter: by token pair, by time period

**Data Sources:**
- `BlackCat.getLeaderboard()`
- `BlackCat.getMasterSignals(masterAddress)`
- LeaderboardUpdated events for verification timestamps

### Page 3: `/master` — Master Dashboard
**Sections:**
- Register form: name input → registerMaster()
- Post Signal form: direction (LONG/SHORT dropdown), token pair (ETH/USD, BTC/USD, AVAX/USD), entry price (auto-filled from current price), target price, stop loss → postSignal()
- Your Stats: total signals, wins, losses, cumulative PnL, current rank
- Your Active Signals: table with live PnL (calculated client-side using CoinGecko)
- Your Signal History: settled signals with outcomes

**Data Sources:**
- `BlackCat.getMasterStats(user)`
- `BlackCat.getMasterSignals(user)`
- CoinGecko API (client-side) for live PnL display

### Page 4: `/subscribe` — Subscriber View
**Sections:**
- Tier comparison: FREE (top 3 masters) vs PRO (all masters, 100 USDC/month)
- Subscribe button (approve TestUSDC + subscribe)
- Faucet button: mint 1000 TestUSDC
- Your Subscription: current tier, expiry
- Accessible Signals: list of signals from masters you can see based on tier

**Data Sources:**
- `BlackCat.subscriptions(user)`
- `BlackCat.getAccessibleMasters(user)`
- Filtered signals based on accessible masters

### Layout
- Header: Logo + nav links + Privy wallet button (DiceBear avatar, balance pill)
- Dark theme, trading terminal aesthetic (think dark Bloomberg/TradingView)
- Green for profits, red for losses throughout

---

## File Structure

```
black-cat/
├── contracts/
│   ├── src/
│   │   ├── BlackCat.sol
│   │   └── TestUSDC.sol
│   ├── script/Deploy.s.sol
│   ├── test/BlackCat.t.sol
│   ├── foundry.toml
│   └── remappings.txt
├── workflows/
│   ├── verify-signals/
│   │   ├── main.ts
│   │   ├── workflow.yaml
│   │   └── config.staging.json
│   ├── project.yaml
│   ├── secrets.yaml
│   └── .env
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx
│   │   ├── leaderboard/page.tsx
│   │   ├── master/page.tsx
│   │   ├── subscribe/page.tsx
│   │   ├── layout.tsx
│   │   └── providers.tsx
│   ├── src/components/
│   ├── src/hooks/
│   ├── src/lib/
│   ├── package.json
│   └── next.config.ts
├── docs/
│   ├── PRODUCT.md
│   └── MVP.md
└── CLAUDE.md
```

---

## Build Order

1. **Contracts** — Write + test BlackCat.sol and TestUSDC.sol in Foundry
2. **Deploy** — Deploy both to Avalanche Fuji, save addresses
3. **Seed Data** — Register 3-5 master traders, post 10-15 signals with varied token pairs
4. **CRE Workflow** — Write verify-signals workflow, test with `cre workflow simulate`
5. **Frontend** — Build 4 pages, connect to deployed contracts via Privy + viem
6. **Simulate** — Run CRE simulation with `--broadcast`, verify signals settle + leaderboard updates
7. **Demo** — Record 3-5 min video showing: register master → post signal → CRE verifies → leaderboard updates → subscriber subscribes → sees verified signals

---

## Hackathon Submission (Pre-filled)

**Project name:** Black Cat

**1-line description:** Private copy trading with CRE-verified leaderboards and tamper-proof signal verification

**Full description:**
Black Cat solves the fundamental problem in copy trading: trust. On every existing platform (Binance Copy, Bybit, GMGN), leaderboard rankings are self-reported or trivially gameable. Master traders can fake performance, cherry-pick results, or manipulate their stats. Black Cat makes this impossible. Master traders post signals (long/short, token pair, entry/target/stop), and a Chainlink CRE workflow independently verifies every signal against real market data from CoinGecko. PnL calculations happen inside the DON with consensus — no single party can manipulate results. The leaderboard is written on-chain by CRE, creating a tamper-proof ranking that anyone can audit. Subscribers pay for tiered access to verified signal feeds from proven traders.

**How is it built?**
One smart contract (Solidity, Foundry) deployed on Avalanche Fuji handles everything: master registration, signal posting, subscription management, leaderboard storage, and CRE report receiving. One CRE cron workflow (TypeScript, CRE SDK) runs every 30 seconds: reads active signals (EVM Read), fetches current prices from CoinGecko (HTTP Client), calculates PnL per signal, gets AI market analysis from Claude Service (HTTP Client), reaches consensus across DON nodes, and writes settled signals + updated leaderboard rankings on-chain (EVM Write). Frontend built with Next.js 15, Privy for wallet auth, dark trading terminal aesthetic.

**Challenges:**
Designing the report encoding to batch-settle multiple signals in a single CRE write (gas efficiency vs. data size trade-off). Computing PnL correctly for both LONG and SHORT positions with basis-point precision. Handling the case where no signals need settling (early exit to avoid empty reports). Ranking masters fairly when they have different numbers of signals (using win rate + cumulative PnL weighted scoring).

**Chainlink Usage:**
CRE workflow using: Cron Trigger, EVM Read (active signals), HTTP Client (x2 — CoinGecko prices + AI analysis), Consensus (byFields — identical on signal settlements, median on PnL calculations), EVM Write (batch signal settlement + leaderboard update). CRE is the sole authority on signal verification — the onlyForwarder modifier ensures no human can fake results.

**Prize tracks:** DeFi Applications, AI Agents, Privacy-Focused Solutions
