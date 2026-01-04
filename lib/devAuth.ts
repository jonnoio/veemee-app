// lib/devAuth.ts
import { API_KEY, DEV_BYPASS_AUTH, DEV_EMAIL } from "@/config/dev";
import * as SecureStore from "expo-secure-store";

// decode JWT payload (no signature verification, just expiry check)
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);

    const json = globalThis.atob ? globalThis.atob(padded) : Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isExpired(token: string, skewSeconds = 30): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (!exp || typeof exp !== "number") return true;

  const now = Math.floor(Date.now() / 1000);
  return exp <= (now + skewSeconds);
}

export async function ensureDevJwt() {
  if (!DEV_BYPASS_AUTH) return;

  const existing = await SecureStore.getItemAsync("veemee-jwt");
  if (existing && !isExpired(existing)) {
    return; // good token
  }

  // expired/bad token -> clear it
  if (existing) {
    await SecureStore.deleteItemAsync("veemee-jwt");
  }

  const res = await fetch("${API_BASE}/api/auth/dev-jwt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": API_KEY, // match backend exactly
    },
    body: JSON.stringify({ email: DEV_EMAIL }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "dev-jwt failed");

  await SecureStore.setItemAsync("veemee-jwt", data.jwt);
}