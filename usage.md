# How Black Cat Uses Chainlink CRE

Black Cat is a private copy trading signal platform on Avalanche. The CRE workflow `verify-signals` runs every settlement cycle — reading on-chain signals, fetching live market data, computing PnL, generating AI commentary, and writing settlement results back on-chain. Everything below is implemented and verified via `cre workflow simulate`.

**Repository:** https://github.com/BonneyMantra/alpha-street

---

## Workflow Overview

One CRE workflow handles the full settlement pipeline:

```
verify-signals
├── Step 1: EVM Read — fetch active signals from BlackCat contract
├── Step 2: HTTP Client — fetch live prices from CoinGecko (consensus)
├── Step 3: Compute — calculate PnL and resolve signal status
├── Step 4: Confidential HTTP — AI market commentary via Claude (secrets sealed in TEE)
├── Step 5: EVM Read — fetch all masters, compute projected rankings
└── Step 6: EVM Write — submit settlement report on-chain
```

**File:** [`workflows/verify-signals/main.ts`](https://github.com/BonneyMantra/alpha-street/blob/main/workflows/verify-signals/main.ts)

---

## Step 1 — EVM Read: Active Signals

The workflow reads all active trading signals directly from the `BlackCat` contract on Avalanche Fuji using `encodeCallMsg` + `callContract`.

```
main.ts — import { EVMClient, encodeCallMsg, bytesToHex } from "@chainlink/cre-sdk"
main.ts — EVMClient.SUPPORTED_CHAIN_SELECTORS["avalanche-testnet-fuji"]
main.ts — evmClient.callContract(runtime, { call: encodeCallMsg({ from, to, data }) })
main.ts — decodeFunctionResult() to parse Signal[] struct array
```

Each signal includes: `id`, `master`, `direction` (LONG/SHORT), `tokenPair`, `entryPrice`, `targetPrice`, `stopLoss`, `status`, `pnlBps`. The workflow exits early if no active signals exist.

---

## Step 2 — HTTP Client with Consensus: Market Prices

Live market prices for ETH, BTC, and AVAX are fetched from the CoinGecko API. Multiple DON nodes independently make the same request, and `consensusIdenticalAggregation` ensures all nodes agree on identical price data before proceeding.

```
main.ts — import { HTTPClient, consensusIdenticalAggregation, text } from "@chainlink/cre-sdk"
main.ts — new HTTPClient()
main.ts — httpClient.sendRequest(runtime, (sender) => { ... }, consensusIdenticalAggregation<string>())
```

This prevents any single compromised node from substituting price data — a manipulated price would cause the consensus check to fail.

---

## Step 3 — PnL Computation

Pure computation inside the TEE. No external calls — just math on the data gathered in Steps 1-2.

- `usdToBigInt()` — converts USD float prices to 18-decimal BigInt for precision matching with on-chain values
- `computePnlBps()` — calculates profit/loss in basis points, handling both LONG and SHORT directions
- `resolveSignalStatus()` — determines if a signal hit its target (TARGET_HIT), breached stop loss (STOPPED_OUT), or remains active

Only signals that have resolved (status 1 or 2) proceed to settlement. Active signals are left untouched.

---

## Step 4 — Confidential HTTP: AI Market Commentary

The Claude Service API key is stored as a CRE Vault secret. It is injected only inside the AMD SEV-SNP enclave — DON node operators never see it in plaintext.

```
main.ts — import { ConfidentialHTTPClient } from "@chainlink/cre-sdk"
main.ts — runtime.getSecret({ id: "CLAUDE_SERVICE_API_KEY" }).result().value
main.ts — new ConfidentialHTTPClient()
main.ts — confidentialHttp.sendRequest(runtime, { request: { url, method, bodyString, multiHeaders } })
```

The workflow sends a summary of settled signals plus current prices to Claude for a brief market commentary. This step is wrapped in a try/catch — if the AI service is unavailable, settlement proceeds without commentary. The AI call is non-critical; the on-chain write is what matters.

---

## Step 5 — EVM Read: Leaderboard Ranking

Two additional contract reads build the updated leaderboard:

1. **`getAllMasters()`** — fetches all registered master addresses from the BlackCat contract
2. **`getMasterStats(address)`** — for each master, reads their current cumulative PnL

The workflow then projects each master's PnL by adding the pending settlement results, sorts by projected PnL (descending), and produces a ranked address array. This ranking is included in the report payload so the contract can update the leaderboard atomically with the settlement.

```
main.ts — evmClient.callContract(runtime, { call: encodeCallMsg({ from, to, data: mastersCalldata }) })
main.ts — evmClient.callContract(runtime, { call: encodeCallMsg({ from, to, data: statsCalldata }) })
```

---

## Step 6 — EVM Write: On-Chain Settlement

The settlement payload is ABI-encoded and submitted as a signed CRE report:

```
main.ts — import { prepareReportRequest, TxStatus } from "@chainlink/cre-sdk"
main.ts — encodeAbiParameters(parseAbiParameters("uint256[], int256[], uint8[], address[]"), [...])
main.ts — prepareReportRequest(encodedPayload)
main.ts — runtime.report(reportRequest).result()
main.ts — evmClient.writeReport(runtime, { receiver, report, gasConfig: { gasLimit } })
```

The report contains four arrays:
- `signalIds` — which signals are being settled
- `pnlBpsArr` — the PnL in basis points for each
- `statuses` — 1 (TARGET_HIT) or 2 (STOPPED_OUT)
- `rankedMasters` — the new leaderboard ordering

The `BlackCat` contract's `onReport()` function processes this atomically — settling each signal, updating master stats (wins/losses/cumulative PnL), and writing the new leaderboard ranking.

---

## Contract: BlackCat.sol

**File:** [`contracts/src/BlackCat.sol`](https://github.com/BonneyMantra/alpha-street/blob/main/contracts/src/BlackCat.sol)

The `onReport` function is the CRE receiver entry point:

```solidity
function onReport(bytes calldata, bytes calldata report) external onlyForwarder {
    (uint256[] memory signalIds, int256[] memory pnlBpsArr, uint8[] memory statuses, address[] memory rankedMasters)
        = abi.decode(report, (uint256[], int256[], uint8[], address[]));
    // settle each signal, update stats, write leaderboard
}
```

The `onlyForwarder` modifier ensures only the CRE Keystone Forwarder (or the contract owner for testing) can call `onReport`. No external actor can forge a settlement.

---

## Secrets Management

**File:** [`workflows/secrets.yaml`](https://github.com/BonneyMantra/alpha-street/blob/main/workflows/secrets.yaml)

One secret is used:
- `CLAUDE_SERVICE_API_KEY` — injected into the TEE for the Confidential HTTP call in Step 4

The secret is referenced via `runtime.getSecret({ id: "CLAUDE_SERVICE_API_KEY" })` and only decrypted inside the enclave.

---

## Configuration

| File | Purpose |
|------|---------|
| [`workflows/project.yaml`](https://github.com/BonneyMantra/alpha-street/blob/main/workflows/project.yaml) | CRE project config — workflow registration, Fuji RPC |
| [`workflows/verify-signals/workflow.yaml`](https://github.com/BonneyMantra/alpha-street/blob/main/workflows/verify-signals/workflow.yaml) | Workflow metadata — name, artifact paths, secrets reference |
| [`workflows/verify-signals/config.staging.json`](https://github.com/BonneyMantra/alpha-street/blob/main/workflows/verify-signals/config.staging.json) | Runtime config — `receiverAddress`, `gasLimit` |

---

## Deployed Contracts (Avalanche Fuji)

| Contract | Address |
|----------|---------|
| TestUSDC | `0x7f9B9D8DbDe8a5495374228a4D92284A2043981d` |
| BlackCat | `0x4b532156D13F8A8C56cef272Ce6Ad20c4E8C7995` |

---

## CRE Capabilities Summary

| Capability | Where | What it does |
|------------|-------|-------------|
| EVM Read (`callContract`) | Steps 1, 5 | Read active signals, master stats, master list |
| HTTP Client + consensus | Step 2 | Fetch CoinGecko prices with multi-node agreement |
| Confidential HTTP | Step 4 | Call Claude API with secret sealed in TEE |
| Vault Secrets | Step 4 | API key never exposed outside enclave |
| EVM Write (`writeReport`) | Step 6 | Submit signed settlement report on-chain |
| Report Signing | Step 6 | `prepareReportRequest` + `runtime.report` |

---

*Built for Chainlink Convergence Hackathon — CRE & AI track + DeFi track.*
