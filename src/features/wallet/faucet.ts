import { parseEther, type PublicClient } from "viem";

const FAUCET_URL = process.env.EXPO_PUBLIC_FAUCET_URL ?? "http://localhost:8788";
// Top up whenever the wallet is below 0.05 AVAX — matches the faucet server's
// own skip threshold, so anything under 0.05 gets a drip.
const MIN_GAS = parseEther("0.05");

// Drips gas to the embedded wallet via the local faucet if it's low, then waits
// for the balance to reflect it. The faucet holds a dedicated key server-side;
// the client only ever sends an address.
export async function ensureFunded(
  publicClient: PublicClient,
  address: `0x${string}`,
): Promise<void> {
  if ((await publicClient.getBalance({ address })) >= MIN_GAS) {
    return;
  }

  const res = await fetch(`${FAUCET_URL}/drip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Faucet request failed (${res.status}).`);
  }

  // Poll up to ~30s for the drip to land before proceeding.
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if ((await publicClient.getBalance({ address })) >= MIN_GAS) {
      return;
    }
  }
}
