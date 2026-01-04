// lib/ensureDevJwt.ts
import { API_KEY, DEV_BYPASS_AUTH, DEV_EMAIL } from "@/config/dev";
import * as SecureStore from "expo-secure-store";

export async function ensureDevJwt() {
  if (!DEV_BYPASS_AUTH) return;

  const existing = await SecureStore.getItemAsync("veemee-jwt");
  if (existing) return;

  console.log("🧪 DEV: minting JWT");

  const res = await fetch(
    "${API_BASE}/api/auth/dev-jwt",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY,
      },
      body: JSON.stringify({ email: DEV_EMAIL }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "dev-jwt failed");
  }

  await SecureStore.setItemAsync("veemee-jwt", data.jwt);
  console.log("✅ DEV JWT stored");
}