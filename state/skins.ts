import { Easing } from "react-native";
import type { SkinId } from "./ContextStore";

export type MotionPreset = {
  bloomDurationMs: number;
  bloomOpacity: number;
  bloomScaleFrom: number;
  bloomScaleTo: number;
  easing: (value: number) => number;
};

export type BackgroundStyle = "solid" | "grid" | "waves";

export type Skin = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;

  motion: MotionPreset;
  backgroundStyle: BackgroundStyle;
};

export const SkinRegistry: Record<SkinId, Skin> = {
  // 1) SIMPLE: neutral, calm
  simple: {
    background: "#0B0C10",
    surface: "#14161D",
    text: "#F2F4F8",
    muted: "#A7B0C0",
    accent: "#7AA2FF",

    motion: {
      bloomDurationMs: 220,
      bloomOpacity: 0.14,
      bloomScaleFrom: 0.985,
      bloomScaleTo: 1.07,
      easing: Easing.out(Easing.cubic),
    },

    backgroundStyle: "solid",
  },

  // 2) GEO: crisp, structured
  geo: {
    background: "#070A12",
    surface: "#10162A",
    text: "#EAF0FF",
    muted: "rgba(234,240,255,0.62)",
    accent: "#6CF0C2",

    motion: {
      bloomDurationMs: 160,
      bloomOpacity: 0.12,
      bloomScaleFrom: 0.995,
      bloomScaleTo: 1.045,
      easing: Easing.out(Easing.quad),
    },

    backgroundStyle: "grid",
  },

  // 3) TIDE: slower, softer “sea air”
  tide: {
    background: "#060C0F",
    surface: "#0D1A20",
    text: "#EAF6FF",
    muted: "rgba(234,246,255,0.62)",
    accent: "#FFB86B",

    motion: {
      bloomDurationMs: 320,
      bloomOpacity: 0.1,
      bloomScaleFrom: 0.99,
      bloomScaleTo: 1.06,
      easing: Easing.out(Easing.exp),
    },

    backgroundStyle: "waves",
  },
};