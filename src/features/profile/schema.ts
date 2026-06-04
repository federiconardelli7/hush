import { z } from "zod";

// @username: 3–20 chars, starts with a letter, lowercase letters/numbers/_.
// Inputs are lowercased before validation (see ProfileSetup + repo).
export const usernameSchema = z
  .string()
  .trim()
  .regex(
    /^[a-z][a-z0-9_]{2,19}$/,
    "3–20 chars, start with a letter; lowercase letters, numbers, underscore.",
  );

export const displayNameSchema = z.string().trim().min(1, "Add your name.").max(50);

export const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Invalid wallet address.");

// Validated shape for an upsert into `profiles`.
export const profileInputSchema = z.object({
  address: addressSchema,
  username: usernameSchema,
  display_name: displayNameSchema,
  avatar_tint: z.string().nullable().optional(),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;

// A row as stored in `profiles`.
export type Profile = {
  address: string;
  username: string;
  display_name: string;
  avatar_tint: string | null;
  created_at: string;
};
