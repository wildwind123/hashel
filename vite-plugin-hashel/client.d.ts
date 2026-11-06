// Types for the virtual modules provided by the hashel Vite plugin.
// Add `/// <reference types="vite-plugin-hashel/client" />` to env.d.ts (or vite-env.d.ts).

interface HashelEntry {
  hash: string;
  file: string;
  name: string;
}

declare module "hashel" {
  /** Default export of the element file opened on this host. */
  export const Component: any;
  /** Full module namespace of the opened element file. */
  export const module: Record<string, any> | undefined;
  /** Hash of the opened element (first subdomain label). */
  export const hash: string;
  export const file: string | undefined;
  export const entry: HashelEntry | undefined;
  export const list: HashelEntry[];
  export const hashel: Record<string, string[]>;
}

declare module "hashel:list" {
  export const list: HashelEntry[];
  export const hashel: Record<string, string[]>;
  export const bookLabel: string;
  export const basePath: string;
}
