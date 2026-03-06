import { HTTPCapability, handler, type Runtime, type HTTPPayload, Runner, EVMClient, HTTPClient, bytesToHex, text, consensusIdenticalAggregation, encodeCallMsg } from "@chainlink/cre-sdk";
import { encodeFunctionData, decodeFunctionResult } from "viem";

type Config = { receiverAddress: string; gasLimit: number };

const COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,avalanche-2&vs_currencies=usd";

const GET_ACTIVE_SIGNALS_ABI = [{ type: "function" as const, name: "getActiveSignals", inputs: [], outputs: [{ type: "tuple[]" as const, name: "", components: [{ type: "uint256" as const, name: "id" }, { type: "address" as const, name: "master" }, { type: "uint8" as const, name: "direction" }, { type: "string" as const, name: "tokenPair" }, { type: "uint256" as const, name: "entryPrice" }, { type: "uint256" as const, name: "targetPrice" }, { type: "uint256" as const, name: "stopLoss" }, { type: "uint256" as const, name: "createdAt" }, { type: "uint8" as const, name: "status" }, { type: "int256" as const, name: "pnlBps" }] }], stateMutability: "view" as const }] as const;

const onHttpTrigger = (runtime: Runtime<Config>, _payload: HTTPPayload): Record<string, never> => {
  const evmClient = new EVMClient(EVMClient.SUPPORTED_CHAIN_SELECTORS["avalanche-testnet-fuji"]);
  runtime.log("Step 1: Reading active signals...");
  const calldata = encodeFunctionData({ abi: GET_ACTIVE_SIGNALS_ABI, functionName: "getActiveSignals" });
  const reply = evmClient.callContract(runtime, { call: encodeCallMsg({ from: "0x0000000000000000000000000000000000000000", to: runtime.config.receiverAddress as `0x${string}`, data: calldata }) }).result();
  runtime.log(`Got ${bytesToHex(reply.data).length} bytes`);
  runtime.log("Step 2: Fetching prices...");
  const httpClient = new HTTPClient();
  const fetch = httpClient.sendRequest(runtime, (s) => { const r = s.sendRequest({ url: COINGECKO_URL, method: "GET", headers: { accept: "application/json" } as any }).result(); return text(r); }, consensusIdenticalAggregation<string>());
  runtime.log(`Prices: ${fetch().result().substring(0, 60)}`);
  return {};
};

const initWorkflow = (config: Config) => { const http = new HTTPCapability(); return [handler(http.trigger({}), onHttpTrigger)]; };
export async function main() { const runner = await Runner.newRunner<Config>(); await runner.run(initWorkflow); }
