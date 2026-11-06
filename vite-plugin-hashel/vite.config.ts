import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: {
      index: "src/index.ts",
      // Book UI served to the browser by the plugin (see BOOK_FILE in src/index.ts).
      "client/book": "src/client/book.ts",
    },
    deps: {
      // Virtual module provided by the plugin at runtime.
      neverBundle: ["hashel:list"],
    },
    dts: {
      generator: "tsc",
    },
    exports: false,
  },
  lint: {
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {},
});
