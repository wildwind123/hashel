import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite-plus";
import { lazyPlugins } from "vite-plus";
import hashel from "vite-plugin-hashel";

// https://vite.dev/config/
// Book: http://book.127-0-0-1.nip.io:5173  (or http://localhost:5173/hashel/)
export default defineConfig({
  plugins: lazyPlugins(() => [vue(), hashel({ ext: "vue" })]),
  server: { port: 5173, strictPort: true },
});
