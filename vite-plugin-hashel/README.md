# vite-plugin-hashel

A lightweight Storybook alternative for Vite. Every file matching `*.el.{ext}` or
`*.el.*.{ext}` gets a stable hash, its own page, and an entry in a book UI.

## Install

```bash
pnpm add -D vite-plugin-hashel
```

## Usage

```ts
// vite.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import hashel from "vite-plugin-hashel";

export default defineConfig({
  plugins: [vue(), hashel({ ext: "vue" })],
});
```

Create the entry that renders one element (default `/src/hashel.ts`):

```ts
// src/hashel.ts
import { createApp } from "vue";
import { Component } from "hashel";

createApp(Component).mount("#app");
```

Add the types for the `hashel` virtual module:

```ts
// src/vite-env.d.ts
/// <reference types="vite-plugin-hashel/client" />
```

Then open:

- `http://book.127-0-0-1.nip.io:5173`: the book (element tree on the left, preview iframe on the right)
- `http://<hash>.127-0-0-1.nip.io:5173`: a single element
- `http://localhost:5173/hashel/`: the same book with path-based URLs (also produced by `vite build`)

If `server.host` is not set, the plugin makes the dev server listen on `127.0.0.1`, because
`*.127-0-0-1.nip.io` resolves to IPv4 while `localhost` may bind to IPv6 only.

## Options

| Option      | Default            | Description                                             |
| ----------- | ------------------ | ------------------------------------------------------- |
| `ext`       | `'vue'`            | Extension(s) matched by `*.el.{ext}` / `*.el.*.{ext}`   |
| `pattern`   |                    | RegExp or function overriding `ext`                     |
| `indexHtml` | built-in template  | HTML file (relative to root) used to render one element |
| `entry`     | `'/src/hashel.ts'` | Entry module used by the built-in template              |
| `book`      | `'book'`           | Subdomain that opens the book                           |
| `dirs`      | `['src']`          | Directories to scan                                     |
| `path`      | `'hashel'`         | URL path / output folder of the path-based book         |
| `build`     | `true`             | Include the book and element pages in `vite build`      |

## License

MIT
