# Avalanche Build Games — Black Cat Submission

---

### 1. Project Name
Black Cat

---

### 2. One Sentence Summary
Black Cat is a private copy trading signal platform where expert traders post encrypted positions on an Avalanche L1, compete on a CRE-verified leaderboard, and subscribers auto-copy top traders based on their subscription tier.

*(Character count: 243)*

---

### 3. Category
DeFi DeFi Privacy

---

### 4. Started Before Build Games?
No — new idea

---

### 5. Problem Description

Copy trading is one of the fastest-growing segments in crypto derivatives — Binance, Bybit, Bitget, and Copin.io collectively process billions in daily copy volume. But every platform has a structural flaw: trading signals and positions are public, which destroys the value of expert alpha before followers can benefit from it.

This creates compounding problems on both sides. Expert traders who consistently outperform have no way to monetize their edge without exposing it — competitors watch their on-chain wallets, reverse-engineer entry timing and sizing, and replicate strategies for free. The better a trader performs publicly, the faster their alpha decays. On the copy side, existing platforms let followers see master positions in real time, which tempts over-trading, front-running, and destroys fill quality as more subscribers pile in.

For retail copiers, the deeper problem is trust. Leaderboards on every existing platform are either self-reported or scraped from public on-chain data with no cryptographic verification. There is no way to know whether a top-ranked trader's PnL reflects real positions on live markets or is manufactured through wash trading or selective reporting.

The result: expert traders cannot safely share signals, copiers cannot trust the leaderboards, and platforms extract most of the value without solving either problem.

---

### 6. Primary User Persona

**Two personas, B2C:**

**Expert Traders (Masters):** Professional or semi-professional crypto traders with consistent track records who trade on external DEXes — Hyperliquid, GMX, Vertex — using their own wallets and strategies. Frustration: their edge gets stolen the moment their positions become public. Competitors watch their on-chain wallets, replicate entries, and dilute their alpha. They want to register their positions on Black Cat with cryptographic privacy, get verified PnL, earn leaderboard rank, and receive revenue share — without ever revealing their strategy to competitors or early copiers.

**Retail Subscribers:** Active crypto participants who want exposure to verified expert strategy without the skill barrier or the noise. Frustration: existing platforms give them no reliable way to verify that leaderboard performance is real, and higher subscription tiers on legacy platforms don't translate to meaningfully better signal access. They want to subscribe to a tier, let CRE execute copy trades automatically on their behalf, and trust that the leaderboard they're copying from is cryptographically verified — not gamed.

---

### 7. Existing Workarounds / Solutions

**Binance / Bybit / Bitget Copy Trading (CEX):** Positions visible to all users on the platform, execution is internal only, sequential copy execution gives early subscribers better fills, leaderboard PnL is platform-controlled with no external verification. Masters cannot prove their results are real.

**Copin.io:** Reads public on-chain data from GMX, Kwenta, and others. Anyone with an Etherscan tab open can see master positions before copies execute. No leaderboard verification — if a wallet has good numbers on a public DEX, it appears on the leaderboard regardless of strategy quality or reproducibility. No subscription tier model that changes signal access.

**Perpy Finance:** GMX vault-based copy trading. Master wallet addresses are public, positions are visible, and every copy trade is a public GMX market order. No privacy layer, no leaderboard verification, no tiered access.

**GMGN:** Solana spot copy trading by watching public transactions. Not perps, positions are completely public, no signal encryption, no verified leaderboard.

**Why insufficient:** None of these platforms separate the signal layer from the execution layer. Every competitor makes master positions structurally public — either because they execute on-chain with visible transactions or because they display positions in the platform UI. There is no privacy-preserving signal registry, no cryptographically verified leaderboard, and no tiered access model that aligns subscriber value with copy quality.

---

### 8. How Black Cat Solves It Better

Black Cat separates the trading layer from the signal layer. Masters trade on Hyperliquid, GMX, or Vertex using their own wallets and strategies. Black Cat does not execute master trades — it receives, encrypts, verifies, and distributes the signals from those trades.

**Private Signal Registry on Avalanche L1 with eERC:** When a master opens a position on an external DEX, they register the position on the Black Cat Avalanche L1. The L1 uses Ava Labs' production eERC (Encrypted ERC) — zk-SNARK proofs (Groth16) combined with ElGamal encryption on BabyJubJub curve — to encrypt trader balances and position data. Nobody can see collateral amounts or accumulated PnL. `validatorOnly` mode restricts mempool visibility to validator nodes. A custom CommitReveal precompile at `0x0200...01` processes order hashes without revealing position details until after the master's fill has been confirmed on the external DEX.

**CRE Verification — Positions Match Claims:** A Chainlink CRE Cron Trigger queries the external DEX APIs and on-chain data to verify that each registered position actually exists and matches the master's claim. This runs every hour. Masters cannot post fake positions and earn leaderboard rank — CRE validates every claim against real external DEX state. Verified positions update `LeaderboardRegistry` via CRE Consensus across multiple DON nodes, making the leaderboard cryptographically tamper-proof.

**Tiered Subscription Model — App-Level Access:** Users subscribe to Black Cat at one of four tiers: Free, Basic, Pro, or Elite. They subscribe to the app — not to individual traders. Higher tiers give better probability of being assigned copy trades from top-ranked masters. When signals are distributed, CRE's ACE (Access Control Engine) checks each subscriber's tier before routing copy orders. Elite subscribers get first priority on top-ranked trader signals; Free subscribers receive signals from lower-ranked masters and with lower frequency.

**CRE Copy Execution for Subscribers:** CRE executes copy trades on behalf of subscribers — not master trades. When a master's position is confirmed and their signal is released, a CRE Log Trigger reads `CopyVault` subscriptions, calculates proportional sizes based on subscriber tier and collateral, and dispatches copy orders to Hyperliquid/Vertex via Confidential HTTP or to GMX on Arbitrum via EVM Write. API keys and signing keys for subscriber accounts are threshold-encrypted across DON nodes and reconstructed only inside the TEE.

**Revenue Model:** Platform revenue comes from subscription fees (Free/Basic/Pro/Elite). Masters earn revenue share based on leaderboard rank — higher rank, larger cut of subscription revenue from copies of their signals. Platform also takes a percentage of subscriber copy trade profits.

**USDC as Native Gas via ICTT:** Users pay subscriptions and deposit collateral in USDC. USDC from C-Chain flows through ICTT to become the Black Cat L1's native gas token — no AVAX, no volatile gas token.

**Agora AUSD Bridge Integration:** AUSD serves as an alternative deposit asset alongside USDC. Bridge contract earns Agora yield on idle AUSD deposits — additional protocol revenue without any user cost.

**Kite AI for AI Trader Identity:** AI trading agents on Black Cat register through Kite AI's identity system, giving verifiable agent provenance — subscribers can distinguish human traders from AI agents and see the agent's model lineage via PoAI.

**Tether WDK Trader Wallets:** Each master trader has a self-custodial Tether WDK wallet for receiving revenue share distributions across multiple chains.

**Suzaku Validator Security:** Black Cat validators are bootstrapped via Suzaku restaking, providing economic security for the permissioned validator set from day one without requiring massive AVAX stakes.

---

### 9. Key Blockchain Interactions

**Black Cat L1 (Custom Avalanche L1 — Privacy Layer for Signals):**
- `SignalRegistry.sol` — `registerPosition(proof, encryptedPositionHash, externalDEX, orderId)`: master registers a position claim with encrypted details; zk-SNARK Groth16 proof verified on-chain to confirm collateral commitment
- CommitReveal precompile `0x0200...01` — `commit(bytes32 hash)`: stores position commitment; `reveal(bytes position, bytes32 nonce)`: verifies and emits `PositionRegistered(masterId, positionId, encodedPosition)` event after master fill is confirmed externally
- `LeaderboardRegistry.sol` — `updateLeaderboard(traderId, pnl, sharpeRatio, winRate, verifiedPositions)`: written by CRE Consensus workflow hourly after external DEX verification
- `SubscriptionManager.sol` — `createSubscription(tier, collateralAmount)`: registers subscriber at a tier level; tier stored on-chain and checked by CRE ACE policies before each copy signal dispatch
- `CopyVault.sol` — `receiveCopySignal(positionId, subscriberId, proportionalSize)`: called by CRE after master position is confirmed and signal is released to eligible tier
- `RevenueDistributor.sol` — `distributeRevenue(masterId, amount)`: allocates subscription revenue share to masters based on current leaderboard rank

**Avalanche C-Chain:**
- `BlackCatBridge.sol` (ICTT home contract) — `deposit(amount)`: locks USDC on C-Chain, mints wrapped USDC as native gas and subscription collateral on L1
- `StablecoinManager.sol` — `depositAUSD(amount)`: accepts Agora AUSD deposits, earns yield on idle bridge reserves

**Chainlink CRE (DON Network):**
- Cron Trigger (every hour) — Confidential HTTP to Hyperliquid/Vertex/GMX APIs: queries external DEX state to verify master position claims match registered signals; N DON nodes reach Consensus and write verified PnL to `LeaderboardRegistry.updateLeaderboard()`
- Log Trigger on `PositionRegistered` event — after CRE confirms external fill, reads `SubscriptionManager` for eligible subscribers by tier, calculates proportional copy sizes, dispatches copy orders via Confidential HTTP to Hyperliquid/Vertex or EVM Write to GMX ExchangeRouter on Arbitrum
- ACE (Access Control Engine) — enforces tier-based signal access: Free/Basic/Pro/Elite subscriber tiers gate which leaderboard rank signals each subscriber receives and at what priority
- Cron Trigger (every 6 hours) — `ProofOfReserve` verification: checks C-Chain USDC deposits match L1 eERC supply and subscriber collateral positions
