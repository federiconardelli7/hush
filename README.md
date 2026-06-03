# Hush

Venmo-style **confidential payments** on Avalanche's Encrypted ERC (eERC), Fuji testnet. Amounts and balances are hidden on-chain; sender/receiver stay public (so a social feed works); every payment can carry an **end-to-end encrypted memo** readable only by the two parties.

Built with **Expo** (React Native) and shipped **web-first** (`react-native-web`) — the eERC SDK proves transfers client-side with snarkjs/WASM, which the browser runs natively.

## Run

```bash
npm install
npx expo start --web      # dev
npx expo export -p web    # production build → dist/
```

## Env (`.env.local`)

```
EXPO_PUBLIC_FUJI_RPC=https://api.avax-test.network/ext/bc/C/rpc
EXPO_PUBLIC_PRIVY_APP_ID=
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## Stack

- **Chain** — eERC converter on Fuji (`src/features/eerc/config/contracts.ts`) via `@avalabs/eerc-sdk`.
- **Wallet** — Privy embedded wallet (`@privy-io/react-auth`).
- **Social** — Supabase (contacts, feed, likes/comments — amounts are never stored off-chain).
- **Routing / UI** — expo-router (`src/app`), design system in `src/design-system`.

The Groth16 circuit artifacts in `public/circuits/` match the deployed Fuji verifiers and are fetched client-side at proof time.
