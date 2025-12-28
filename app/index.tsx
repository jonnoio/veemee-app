import { Stack, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { DEV_BYPASS_AUTH } from "@/config/dev";
import { useContextStore } from "@/state/ContextStore";
import { SkinRegistry } from "@/state/skins";
import { ensureDevJwt } from "../lib/devAuth";
import { useAuth } from "../lib/useAuth";

export default function HomeScreen() {
  const skin = SkinRegistry.simple;

  const animation = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const { status } = useAuth();
  const { activeContextId, hydrated } = useContextStore();

  const [serverStatus, setServerStatus] = useState<"checking" | "up" | "down">("checking");
  const [email, setEmail] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  // ✅ DEV MODE: ensure a valid JWT exists (refresh if expired)
  const [devReady, setDevReady] = useState(!DEV_BYPASS_AUTH);
  useEffect(() => {
    if (!DEV_BYPASS_AUTH) return;

    (async () => {
      try {
        await ensureDevJwt();
        setDevReady(true);
      } catch (e: any) {
        console.log("❌ ensureDevJwt failed:", e?.message || e);
        setDevReady(false);
      }
    })();
  }, []);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch("https://veemee.onrender.com/api/ping");
        setServerStatus(res.ok ? "up" : "down");
      } catch {
        setServerStatus("down");
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, { toValue: 1.06, duration: 1400, useNativeDriver: true }),
        Animated.timing(animation, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, [animation]);

  const isAuthed = DEV_BYPASS_AUTH ? devReady : status === "authenticated";

  const handleTap = () => {
    if (!isAuthed) return;
    if (!hydrated) return;

    router.replace(activeContextId ? "/dashboard" : "/contexts");
  };

  const handleSend = async () => {
    if (!email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }

    setSendStatus("sending");
    setError("");

    try {
      const res = await fetch("https://veemee.onrender.com/api/auth/magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": "jonnose_pk_99",
        },
        body: JSON.stringify({ email, platform: "mobile" }),
      });

      const data = await res.json();
      if (res.ok) setSendStatus("sent");
      else {
        setError(data.error || "Failed to send link");
        setSendStatus("idle");
      }
    } catch (err) {
      console.error(err);
      setError("Network error");
      setSendStatus("idle");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: skin.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <TouchableWithoutFeedback onPress={handleTap}>
        <KeyboardAvoidingView
          style={[styles.container, { backgroundColor: skin.background }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Animated.View
            style={[
              styles.circle,
              {
                backgroundColor: skin.surface,
                transform: [{ scale: animation }],
              },
            ]}
          />

          <Text style={[styles.message, { color: skin.text }]}>
            {!hydrated
              ? "Waking up…"
              : isAuthed
              ? activeContextId
                ? "Click to continue"
                : "Choose a context"
              : DEV_BYPASS_AUTH
              ? "Dev auth failed (no JWT). Check ALLOW_DEV_AUTH + API key."
              : "Enter email to continue"}
          </Text>

          {/* Prod auth UI */}
          {!DEV_BYPASS_AUTH && status === "unauthenticated" && (
            <>
              <TextInput
                style={[styles.input, { borderColor: "rgba(255,255,255,0.18)", color: skin.text }]}
                placeholder="Enter your email"
                placeholderTextColor={skin.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <TouchableOpacity
                style={[styles.button, { backgroundColor: skin.accent }]}
                onPress={handleSend}
                disabled={sendStatus === "sending"}
              >
                <Text style={[styles.buttonText, { color: "#0B0C10", fontWeight: "800" }]}>
                  {sendStatus === "sending" ? "Sending…" : "Send Magic Link"}
                </Text>
              </TouchableOpacity>

              {sendStatus === "sent" && <Text style={[styles.success, { color: skin.accent }]}>✅ Magic link sent!</Text>}
              {error !== "" && <Text style={styles.error}>❌ {error}</Text>}
            </>
          )}
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      <View style={[styles.statusContainer, { backgroundColor: "rgba(20,22,29,0.9)" }]}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: serverStatus === "up" ? "green" : serverStatus === "down" ? "red" : "gray" },
          ]}
        />
        <Text style={[styles.statusText, { color: skin.muted }]}>
          Veemee server: {serverStatus === "checking" ? "Checking…" : serverStatus === "up" ? "Up" : "Down"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  circle: { width: 140, height: 140, borderRadius: 70, marginBottom: 30 },
  message: { fontSize: 18, marginBottom: 20 },
  input: { width: "100%", padding: 14, fontSize: 16, borderWidth: 1, borderRadius: 10, marginBottom: 12 },
  button: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 },
  buttonText: { fontSize: 16 },
  success: { marginTop: 20, fontSize: 16 },
  error: { marginTop: 20, color: "red", fontSize: 16 },
  statusContainer: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { fontSize: 14 },
});