import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite-plus";
import { lazyPlugins } from "vite-plus";
import hashel from "vite-plugin-hashel";

// https://vite.dev/config/
// Book: http://book.127-0-0-1.nip.io:5174  (or http://localhost:5174/hashel/)
export default defineConfig({
  plugins: lazyPlugins(() => [svelte(), hashel({ ext: "svelte" })]),
  server: { port: 5174, strictPort: true },
});
