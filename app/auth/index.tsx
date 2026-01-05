import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { API_BASE } from "@/config/api";

export default function AuthIndex() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const send = async () => {
    const e = email.trim().toLowerCase();
    if (!e) return;

    setBusy(true);
    setMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/magic-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // If @require_api_key expects this, add it:
          // "X-API-KEY": process.env.EXPO_PUBLIC_VEEMEE_API_KEY!,
        },
        body: JSON.stringify({ email: e, platform: "mobile" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setMsg("Sent. Open the email on this device and tap the link.");
    } catch (err: any) {
      setMsg(err?.message || "Could not send link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Sign in</Text>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholderTextColor="#888"
      />

      <Pressable style={styles.btn} onPress={send} disabled={busy}>
        {busy ? <ActivityIndicator /> : <Text style={styles.btnText}>Send magic link</Text>}
      </Pressable>

      {!!msg && <Text style={styles.msg}>{msg}</Text>}

      <Pressable onPress={() => router.replace("/" as any)} style={{ marginTop: 18 }}>
        <Text style={{ opacity: 0.7 }}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 20,
    paddingTop: 72,
    backgroundColor: "#fff",       // 👈 key fix
  },
  h1: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111",                 // 👈 make it visible
  },
  input: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 12,
    color: "#111",                 // 👈 typed text visible
  },
  btn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  btnText: { fontWeight: "900", color: "#111" }, // 👈 visible
  msg: { marginTop: 14, opacity: 0.8, color: "#111" }, // 👈 visible
});