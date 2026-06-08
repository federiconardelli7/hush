# Hush

> Venmo-style **confidential payments** on Avalanche — amounts stay hidden, the social feed stays intact.

**Live demo (Fuji testnet):** https://hush-rho-two.vercel.app

Hush is a consumer payments app built on Avalanche's **Encrypted ERC (eERC)**. Payment **amounts and balances are encrypted on-chain** and decrypted only on your device, while **who-paid-whom stays public** so a familiar social feed still works. Every payment can carry an **end-to-end encrypted memo** that only the sender and receiver can read.

It's a **web-first** Expo / `react-native-web` single-page app: the eERC SDK generates Groth16 zero-knowledge proofs in the browser with snarkjs/WASM, so confidential transfers happen entirely client-side.

> **Testnet proof-of-concept.** Runs on Avalanche Fuji with throwaway test tokens. Not audited; not for real funds.

## Privacy model

| Field | Visibility |
|-------|-----------|
| Amount & balance | **Hidden** — encrypted on-chain, decrypted client-side |
| Sender & receiver | **Public** — this is what powers the social feed |
| Memo | **End-to-end encrypted** — sender + receiver only |
| Token used | **Not stored off-chain** — resolved on-chain per transaction |

The off-chain database (Supabase) **never stores an amount or a token** — that's enforced at the schema level. The protocol **auditor** (on testnet, the deployer) can decrypt amounts + parties but not memos — surfaced honestly in the in-app Privacy screen.

## Features

- **Email onboarding** — passwordless OTP into a self-custodial embedded wallet (Privy), auto-funded with testnet gas.
- **Add money** — deposit TEST or USDC into your encrypted balance (multi-token).
- **Send** with an encrypted memo and a public feed entry (the amount stays hidden).
- **Request money** — the requested amount is encrypted to both parties; pay-to-fulfill.
- **Cash out / move out** — withdraw to your own wallet, or send to any external address.
- **Activity** — your own amounts decrypted on-device, with receipts and an inline ZK-proof view.
- **Contacts, QR pay/request, notifications, a social feed** (Friends / Public / You scopes).
- **Export your private key** — it's your wallet; leave any time.
- **Responsive** — distinct mobile and desktop layouts from one codebase.

## How it works

```
Client — Expo SPA (react-native-web)
  Privy embedded wallet (email OTP) ──▶ viem clients
     └─ @avalabs/eerc-sdk ──▶ Groth16 proofs (snarkjs/WASM, circuits served from /public)
  Supabase JS (identity · contacts · feed · requests — NO amounts, ever)
  /api faucet + auth (Vercel serverless, Supabase-backed state)
        │                          │                       │
  Avalanche Fuji             Supabase (Postgres)      Faucet (dedicated key:
  eERC converter,            RLS keyed on the          drips gas + mints TEST)
  registrar, verifiers       wallet-signed JWT
```

- **On-chain (encrypted):** amounts, balances, and memos — never leave the chain in plaintext.
- **Off-chain (Supabase):** usernames, the private contact book, and feed metadata (the two parties + an optional public caption) — **never an amount**. Row-level security keys every read on a wallet-signed JWT.

## Run locally

The app and the faucet/auth backend run as two local processes (the faucet drips Fuji gas, mints the TEST token, and mints the wallet-bound Supabase JWT — login + funding need it):

```bash
npm install
npm run faucet            # faucet + Supabase-auth backend on :8788
npx expo start --web      # the app, in a separate terminal
npx expo export -p web    # production build → dist/
```

### Environment (`hush/.env` — see `.env.example`)

**Build-time** (public, inlined into the web bundle by `expo export`):

```
EXPO_PUBLIC_FUJI_RPC=https://api.avax-test.network/ext/bc/C/rpc
EXPO_PUBLIC_PRIVY_APP_ID=
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_FAUCET_URL=http://localhost:8788   # local dev; unset in prod → defaults to same-origin /api
```

**Server-only** (read by the faucet/auth `/api` functions — never shipped to the client):

```
FAUCET_PRIVATE_KEY=           # dedicated throwaway key — drips Fuji gas + mints TEST
EXPO_PUBLIC_ERC20=            # the TEST ERC20 the faucet mints (must match contracts.ts)
SUPABASE_JWT_SECRET=          # Legacy HS256 secret — mints the wallet-bound Supabase JWT
SUPABASE_PROJECT_REF=
SUPABASE_SERVICE_ROLE_KEY=    # faucet/auth state tables (bypasses RLS)
FAUCET_PUBLIC_DOMAIN=         # optional — binds the SIWE message domain (prod hardening)
```

Contract addresses are **hardcoded** in `src/features/eerc/config/contracts.ts` (baked into the bundle at build), not read from env.

## Project structure

```
src/
  app/             expo-router screens (onboarding, signed-in tabs, pushed screens)
  features/
    auth/          Privy provider + headless email-OTP
    wallet/        viem adapter, wagmi config, faucet client
    eerc/          eERC context, token registry, client-side decryption-key session
    supabase/      client + wallet→JWT auth binding
    payments/  requests/  contacts/  profile/  notifications/  qr/   domain logic + repos
  components/      shared rows, cards, the calendar field, skeletons, empty states
  design-system/   tokens, theme, primitives
api/               Vercel serverless faucet + auth functions
server/            framework-agnostic faucet/auth core (shared by local dev + /api)
supabase/migrations/   schema — note there is no amount column, anywhere
public/circuits/   Groth16 .wasm / .zkey artifacts (match the deployed Fuji verifiers)
```

## Tech stack

Expo SDK 56 · React Native 0.85 + `react-native-web` · expo-router · Privy (`@privy-io/react-auth`) · `@avalabs/eerc-sdk` (Groth16 + snarkjs) · wagmi / viem · Supabase · TanStack Query · Zustand · TypeScript.

## Security & privacy

Amounts never touch a server. The eERC decryption key is derived client-side from a wallet signature and cached per-wallet (never uploaded). Authentication is a wallet-signed nonce exchanged for a short-lived Supabase JWT, and row-level security scopes every query to the signing wallet. A consolidated security & privacy model — including the testnet caveats and the production-hardening roadmap — is maintained in the project's living architecture notes.

## License

See [LICENSE](./LICENSE).
