// Resolves the faucet/auth backend base URL.
//
// Production (any non-localhost host) is always the same-origin Vercel `/api`
// functions. Local dev points at the standalone faucet server (scripts/faucet.ts)
// via EXPO_PUBLIC_FAUCET_URL — but the override is honored ONLY when the page is
// actually served from localhost. EXPO_PUBLIC_* values are inlined into the bundle
// at `expo export` time, so without this host gate a dev URL baked into the build
// would send every deployed client to a developer's machine.
export function backendBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_FAUCET_URL;
  return override && isLocalHost() ? override : "/api";
}

function isLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}
