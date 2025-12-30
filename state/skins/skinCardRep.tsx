// state/skins/skinCardRep.tsx
import type { Skin } from "@/state/skins";
import { CardRep as BloomCard } from "@/state/skins/skinBloom";
import { CardRep as BoxesCard } from "@/state/skins/skinBoxes";
import React from "react";

export type CardArgs = { name: string; skin: Skin; open: boolean };

export function ContextCardRep(props: CardArgs) {
  if (props.skin.cardRep === "bloom") return <BloomCard {...props} />;
  // default
  return <BoxesCard {...props} />;
}