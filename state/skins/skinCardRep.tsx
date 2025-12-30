// state/skins/skinCardRep.tsx
import type { Skin } from "@/state/skins";

import * as Bloom from "@/state/skins/skinBloom";
import * as Boxes from "@/state/skins/skinBoxes";

type Args = {
  skin: Skin;
  name: string;
};

/**
 * CLOSED state renderer
 */
export function showClosedContext({ skin, name }: Args) {
  switch (skin.cardRep) {
    case "boxes":
      return Boxes.showClosedContext(
        { name },
        pickSkinView(skin)
      );

    case "bloom":
      return Bloom.showClosedContext(
        { name },
        pickSkinView(skin)
      );

    default: {
      const _exhaustive: never = skin.cardRep;
      return null;
    }
  }
}

/**
 * OPEN state renderer
 */
export function showOpenContext({ skin, name }: Args) {
  switch (skin.cardRep) {
    case "boxes":
      return Boxes.showOpenContext(
        { name },
        pickSkinView(skin)
      );

    case "bloom":
      return Bloom.showOpenContext(
        { name },
        pickSkinView(skin)
      );

    default: {
      const _exhaustive: never = skin.cardRep;
      return null;
    }
  }
}

/**
 * Narrow skin slice exposed to card reps
 */
function pickSkinView(skin: Skin) {
  return {
    text: skin.text,
    accent: skin.accent,
  };
}