// verify-signals workflow
//
// HTTP Trigger -> EVM Read (active signals) -> HTTP (CoinGecko prices)
//              -> Compute PnL -> Confidential HTTP (Claude AI commentary)
//              -> EVM Write (settle signals + update leaderboard)

import {
  HTTPCapability,
  handler,
  type Runtime,
  type HTTPPayload,
  Runner,
  EVMClient,
  ConfidentialHTTPClient,
  HTTPClient,
  TxStatus,
  prepareReportRequest,
  bytesToHex,
  ok,
  text,
  consensusIdenticalAggregation,
  encodeCallMsg,
} from "@chainlink/cre-sdk";
import {
  encodeAbiParameters,
  parseAbiParameters,
  encodeFunctionData,
  decodeFunctionResult,
} from "viem";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

type Config = {
  receiverAddress: string;
  gasLimit: number;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Signal {
  id: bigint;
  master: `0x${string}`;
  direction: number;
  tokenPair: string;
  entryPrice: bigint;
  targetPrice: bigint;
  stopLoss: bigint;
  createdAt: bigint;
  status: number;
  pnlBps: bigint;
}

interface CoinGeckoPrices {
  [coinId: string]: { usd: number };
}

interface SettlementResult {
  signalId: bigint;
  pnlBps: bigint;
  status: number;
  master: `0x${string}`;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAIR_TO_COINGECKO: Record<string, string> = {
  "ETH/USD": "ethereum",
  "BTC/USD": "bitcoin",
  "AVAX/USD": "avalanche-2",
};

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,avalanche-2&vs_currencies=usd";

const CLAUDE_SERVICE_URL =
  "https://innominate-unalleviatingly-yasmin.ngrok-free.dev/chat";

// ---------------------------------------------------------------------------
// ABI fragments (NEVER call these at module level — WASM trap)
// ---------------------------------------------------------------------------

const GET_ACTIVE_SIGNALS_ABI = [
  {
    type: "function" as const,
    name: "getActiveSignals",
    inputs: [],
    outputs: [
      {
        type: "tuple[]" as const,
        name: "",
        components: [
          { type: "uint256" as const, name: "id" },
          { type: "address" as const, name: "master" },
          { type: "uint8" as const, name: "direction" },
          { type: "string" as const, name: "tokenPair" },
          { type: "uint256" as const, name: "entryPrice" },
          { type: "uint256" as const, name: "targetPrice" },
          { type: "uint256" as const, name: "stopLoss" },
          { type: "uint256" as const, name: "createdAt" },
          { type: "uint8" as const, name: "status" },
          { type: "int256" as const, name: "pnlBps" },
        ],
      },
    ],
    stateMutability: "view" as const,
  },
] as const;

const GET_ALL_MASTERS_ABI = [
  {
    type: "function" as const,
    name: "getAllMasters",
    inputs: [],
    outputs: [{ type: "address[]" as const, name: "" }],
    stateMutability: "view" as const,
  },
] as const;

const GET_MASTER_STATS_ABI = [
  {
    type: "function" as const,
    name: "getMasterStats",
    inputs: [{ type: "address" as const, name: "master" }],
    outputs: [
      {
        type: "tuple" as const,
        name: "",
        components: [
          { type: "uint256" as const, name: "totalSignals" },
          { type: "uint256" as const, name: "wins" },
          { type: "uint256" as const, name: "losses" },
          { type: "int256" as const, name: "cumulativePnlBps" },
          { type: "uint256" as const, name: "rank" },
        ],
      },
    ],
    stateMutability: "view" as const,
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function usdToBigInt(usdPrice: number): bigint {
  const scaled = Math.round(usdPrice * 1e8);
  return BigInt(scaled) * 10n ** 10n;
}

function computePnlBps(
  entryPrice: bigint,
  currentPrice: bigint,
  direction: number,
): bigint {
  if (entryPrice === 0n) return 0n;
  let diff = currentPrice - entryPrice;
  if (direction === 1) diff = -diff;
  return (diff * 10000n) / entryPrice;
}

function resolveSignalStatus(
  pnlBps: bigint,
  entryPrice: bigint,
  targetPrice: bigint,
  stopLoss: bigint,
  direction: number,
): number {
  let targetBps: bigint;
  let stopBps: bigint;

  if (direction === 0) {
    targetBps =
      entryPrice > 0n ? ((targetPrice - entryPrice) * 10000n) / entryPrice : 0n;
    stopBps =
      entryPrice > 0n ? ((entryPrice - stopLoss) * 10000n) / entryPrice : 0n;
  } else {
    targetBps =
      entryPrice > 0n ? ((entryPrice - targetPrice) * 10000n) / entryPrice : 0n;
    stopBps =
      entryPrice > 0n ? ((stopLoss - entryPrice) * 10000n) / entryPrice : 0n;
  }

  if (pnlBps >= targetBps && targetBps > 0n) return 1; // TARGET_HIT
  if (pnlBps <= -stopBps && stopBps > 0n) return 2; // STOPPED_OUT
  return 0; // ACTIVE
}

// ---------------------------------------------------------------------------
// HTTP Trigger Handler
// ---------------------------------------------------------------------------

const onHttpTrigger = (
  runtime: Runtime<Config>,
  _payload: HTTPPayload,
): Record<string, never> => {
  const config = runtime.config;

  const claudeApiKey = runtime
    .getSecret({ id: "CLAUDE_SERVICE_API_KEY" })
    .result().value;

  const evmClient = new EVMClient(
    EVMClient.SUPPORTED_CHAIN_SELECTORS["avalanche-testnet-fuji"],
  );

  // ================================================================
  // STEP 1: EVM Read — getActiveSignals() via callContract
  // ================================================================
  runtime.log("Step 1: Reading active signals from BlackCat contract...");

  const calldata = encodeFunctionData({
    abi: GET_ACTIVE_SIGNALS_ABI,
    functionName: "getActiveSignals",
  });

  const signalsReply = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: "0x0000000000000000000000000000000000000000",
        to: config.receiverAddress as `0x${string}`,
        data: calldata,
      }),
    })
    .result();

  const rawSignalsHex = bytesToHex(signalsReply.data) as `0x${string}`;

  const decodedSignals = decodeFunctionResult({
    abi: GET_ACTIVE_SIGNALS_ABI,
    functionName: "getActiveSignals",
    data: rawSignalsHex,
  }) as unknown as Signal[];

  if (!decodedSignals || decodedSignals.length === 0) {
    runtime.log("No active signals found. Exiting early.");
    return {};
  }

  runtime.log(`Found ${decodedSignals.length} active signal(s).`);

  // ================================================================
  // STEP 2: HTTP Client — Fetch CoinGecko prices (consensus)
  // ================================================================
  runtime.log("Step 2: Fetching market prices from CoinGecko...");

  const httpClient = new HTTPClient();
  const doPriceFetch = httpClient.sendRequest(
    runtime,
    (sender) => {
      const resp = sender
        .sendRequest({
          url: `${COINGECKO_URL}&ts=${Date.now()}`,
          method: "GET",
          // @ts-ignore
          headers: { accept: "application/json" },
          cacheSettings: { store: true, maxAge: "30s" },
        })
        .result();
      return text(resp);
    },
    consensusIdenticalAggregation<string>(),
  );

  const priceText = doPriceFetch().result();
  const prices: CoinGeckoPrices = JSON.parse(priceText);

  runtime.log(
    `Prices: ETH=$${prices.ethereum?.usd}, BTC=$${prices.bitcoin?.usd}, AVAX=$${prices["avalanche-2"]?.usd}`,
  );

  // ================================================================
  // STEP 3: Compute PnL for each signal
  // ================================================================
  runtime.log("Step 3: Computing PnL...");

  const settlements: SettlementResult[] = [];

  for (const signal of decodedSignals) {
    const coinGeckoId = PAIR_TO_COINGECKO[signal.tokenPair];
    if (!coinGeckoId || !prices[coinGeckoId]) {
      runtime.log(
        `Skipping signal #${signal.id}: no price for ${signal.tokenPair}`,
      );
      continue;
    }

    const currentPrice = usdToBigInt(prices[coinGeckoId].usd);
    const pnlBps = computePnlBps(
      signal.entryPrice,
      currentPrice,
      signal.direction,
    );
    const status = resolveSignalStatus(
      pnlBps,
      signal.entryPrice,
      signal.targetPrice,
      signal.stopLoss,
      signal.direction,
    );

    const dir = signal.direction === 0 ? "LONG" : "SHORT";
    const label =
      status === 1 ? "TARGET_HIT" : status === 2 ? "STOPPED_OUT" : "ACTIVE";
    runtime.log(
      `Signal #${signal.id} ${signal.tokenPair} ${dir}: ${pnlBps}bps -> ${label}`,
    );

    if (status === 1 || status === 2) {
      settlements.push({
        signalId: signal.id,
        pnlBps,
        status,
        master: signal.master,
      });
    }
  }

  if (settlements.length === 0) {
    runtime.log("No signals to settle. Done.");
    return {};
  }

  runtime.log(`${settlements.length} signal(s) to settle.`);

  // ================================================================
  // STEP 4: Confidential HTTP — Claude AI commentary (non-critical)
  // ================================================================
  runtime.log("Step 4: AI market commentary via Claude Service...");

  try {
    const summary = settlements
      .map(
        (s) =>
          `#${s.signalId}: ${s.status === 1 ? "HIT" : "STOP"} ${s.pnlBps}bps`,
      )
      .join(", ");

    const claudeBody = JSON.stringify({
      model: "sonnet",
      messages: [
        {
          role: "user",
          content: `Brief 2-sentence market commentary for settled signals: ${summary}. ETH=$${prices.ethereum?.usd}, BTC=$${prices.bitcoin?.usd}, AVAX=$${prices["avalanche-2"]?.usd}.`,
        },
      ],
    });

    const confidentialHttp = new ConfidentialHTTPClient();
    const claudeResponse = confidentialHttp
      .sendRequest(runtime, {
        request: {
          url: CLAUDE_SERVICE_URL,
          method: "POST",
          bodyString: claudeBody,
          multiHeaders: {
            "content-type": { values: ["application/json"] },
            "x-api-key": { values: [claudeApiKey] },
          },
        },
      })
      .result();

    if (ok(claudeResponse)) {
      runtime.log(`AI commentary: ${text(claudeResponse)}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    runtime.log(`Claude non-critical error: ${msg}. Continuing.`);
  }

  // ================================================================
  // STEP 5: Build leaderboard + prepare report
  // ================================================================
  runtime.log("Step 5: Building leaderboard...");

  const mastersCalldata = encodeFunctionData({
    abi: GET_ALL_MASTERS_ABI,
    functionName: "getAllMasters",
  });

  const mastersReply = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: "0x0000000000000000000000000000000000000000",
        to: config.receiverAddress as `0x${string}`,
        data: mastersCalldata,
      }),
    })
    .result();

  const mastersHex = bytesToHex(mastersReply.data) as `0x${string}`;
  const allMasters = decodeFunctionResult({
    abi: GET_ALL_MASTERS_ABI,
    functionName: "getAllMasters",
    data: mastersHex,
  }) as unknown as `0x${string}`[];

  const masterPnls: { addr: `0x${string}`; pnl: bigint }[] = [];

  for (const addr of allMasters) {
    const statsCalldata = encodeFunctionData({
      abi: GET_MASTER_STATS_ABI,
      functionName: "getMasterStats",
      args: [addr],
    });

    const statsReply = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({
          from: "0x0000000000000000000000000000000000000000",
          to: config.receiverAddress as `0x${string}`,
          data: statsCalldata,
        }),
      })
      .result();

    const statsHex = bytesToHex(statsReply.data) as `0x${string}`;
    const stats = decodeFunctionResult({
      abi: GET_MASTER_STATS_ABI,
      functionName: "getMasterStats",
      data: statsHex,
    }) as unknown as { cumulativePnlBps: bigint };

    let projected = stats.cumulativePnlBps;
    for (const s of settlements) {
      if (s.master.toLowerCase() === addr.toLowerCase()) {
        projected = projected + s.pnlBps;
      }
    }
    masterPnls.push({ addr, pnl: projected });
  }

  masterPnls.sort((a, b) => (a.pnl > b.pnl ? -1 : a.pnl < b.pnl ? 1 : 0));
  const rankedMasters = masterPnls.map((m) => m.addr);

  runtime.log(
    `Ranking: ${rankedMasters.map((a, i) => `#${i + 1} ${a.slice(0, 10)}`).join(", ")}`,
  );

  // Encode report: (uint256[], int256[], uint8[], address[])
  const encodedPayload = encodeAbiParameters(
    parseAbiParameters(
      "uint256[] signalIds, int256[] pnlBpsArr, uint8[] statuses, address[] rankedMasters",
    ),
    [
      settlements.map((s) => s.signalId),
      settlements.map((s) => s.pnlBps),
      settlements.map((s) => s.status),
      rankedMasters,
    ],
  );

  // ================================================================
  // STEP 6: EVM Write — submit report
  // ================================================================
  runtime.log("Step 6: Writing report on-chain...");

  const reportRequest = prepareReportRequest(encodedPayload);
  const report = runtime.report(reportRequest).result();

  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: config.receiverAddress,
      report: report,
      gasConfig: { gasLimit: String(config.gasLimit) },
    })
    .result();

  if (writeResult.txStatus === TxStatus.SUCCESS) {
    const txHash = writeResult.txHash
      ? bytesToHex(writeResult.txHash)
      : "unknown";
    runtime.log(`Report written. TX: ${txHash}`);
  } else {
    runtime.log(
      `EVM write status: ${writeResult.txStatus}. Check on-chain receipt.`,
    );
  }

  runtime.log(
    `Settled ${settlements.length} signal(s), ${rankedMasters.length} master(s) ranked.`,
  );
  return {};
};

// ---------------------------------------------------------------------------
// Workflow init + entry
// ---------------------------------------------------------------------------

const initWorkflow = (config: Config) => {
  const http = new HTTPCapability();
  return [handler(http.trigger({}), onHttpTrigger)];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
