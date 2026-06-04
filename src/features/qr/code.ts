// Hush QR payload = the raw lowercased wallet address. There is no deep-link scheme
// (deep-linking isn't wired — see ARCHITECTURE), so the in-app scanner reads the
// address directly. Keeping encode + decode here keeps the two sides in sync.

// The value shown in "My QR code".
export function buildMyCode(address: string): string {
  return address.toLowerCase();
}

// Pull a wallet address out of a scanned or pasted string and lowercase it. Tolerates
// a bare address or one embedded in a longer string (e.g. a future URL); the negative
// lookahead stops it grabbing the first 40 hex chars of a longer hash. Returns null
// when there's no address to act on.
export function parseScannedCode(raw: string): string | null {
  const match = raw.trim().match(/0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/);
  return match ? match[0].toLowerCase() : null;
}
