import { createThirdwebClient, defineChain } from "thirdweb";
import { createWallet, inAppWallet } from "thirdweb/wallets";

export const chain = defineChain(43113); // Avalanche Fuji

export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "placeholder",
});

export const wallets = [
  createWallet("io.metamask"),
  inAppWallet({ auth: { options: ["email", "google"] } }),
];
