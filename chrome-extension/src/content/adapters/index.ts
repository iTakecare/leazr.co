/**
 * Registry des adapters. L'ordre importe : le premier qui match gagne.
 * Les adapters sont tous activés pour la recherche multi-source.
 */
import type { SiteAdapter } from "../../lib/types";
import { coolblueAdapter } from "./coolblue";
import { mediamarktOutletAdapter, mediamarktMainAdapter } from "./mediamarkt";
import { appleRefurbishedAdapter } from "./apple-refurbished";
import { gomiboAdapter } from "./gomibo";
import { chappAdapter } from "./chapp";
import { amazonAdapter } from "./amazon";

export const adapters: SiteAdapter[] = [
  coolblueAdapter,
  mediamarktOutletAdapter,
  mediamarktMainAdapter,
  gomiboAdapter,
  chappAdapter,
  appleRefurbishedAdapter,
  amazonAdapter,
];

export function findAdapter(url: URL): SiteAdapter | null {
  return adapters.find((a) => a.matches(url)) ?? null;
}
