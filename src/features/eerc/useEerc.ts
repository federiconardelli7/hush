import { useContext } from "react";
import { EercContext, type EercContextValue } from "@/features/eerc/EercProvider";

// Single consumer hook for the eERC layer: status, registration + key state,
// the decrypted balance, and the register / unlock actions. Throws if used
// outside the provider so a misplaced screen fails loudly in development.
export function useEerc(): EercContextValue {
  const ctx = useContext(EercContext);
  if (!ctx) {
    throw new Error("useEerc must be used within an EercProvider");
  }
  return ctx;
}
