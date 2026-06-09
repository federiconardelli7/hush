// Resolves the faucet/auth backend base URL.
//
// Production (any non-localhost host) is always the same-origin Vercel `/api`
// functions. Local dev points at the standalone faucet server (scripts/faucet.ts)
// via EXPO_PUBLIC_FAUCET_URL — but the override is honored ONLY when the page is
// actually served from localhost. EXPO_PUBLIC_* values are inlined into the bundle
// at `expo export` time, so without this host gate a dev URL baked into the build
// would send every deployed client to a developer's machine.
// Native (Android/iOS) has no same-origin "/api" — there's no window.location — so
// the deployed Vercel backend is reached by its absolute URL (a fixed deployment
// constant, like the contract addresses in config/contracts.ts).
const NATIVE_BACKEND_URL = "https://hush-rho-two.vercel.app/api";

export function backendBaseUrl(): string {
  if (typeof window === "undefined") {
    return NATIVE_BACKEND_URL;
  }
  const override = process.env.EXPO_PUBLIC_FAUCET_URL;
  return override && isLocalHost() ? override : "/api";
}

function isLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}
