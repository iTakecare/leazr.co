/**
 * Registry des adapters. L'ordre importe : le premier qui match gagne.
 * À enrichir progressivement (Mediamarkt, Amazon, Apple, Backmarket, etc.).
 */
import type { SiteAdapter } from "../../lib/types";
import { coolblueAdapter } from "./coolblue";

export const adapters: SiteAdapter[] = [
  coolblueAdapter,
  // mediamarktAdapter,
  // amazonAdapter,
  // appleRefurbishedAdapter,
  // backmarketAdapter,
  // gomiboAdapter,
  // chappAdapter,
  // gamersOutletAdapter,
  // dipliAdapter,
  // lcdPhoneAdapter,
];

export function findAdapter(url: URL): SiteAdapter | null {
  return adapters.find((a) => a.matches(url)) ?? null;
}
