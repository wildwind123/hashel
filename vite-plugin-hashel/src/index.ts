import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage } from "node:http";
import type { Plugin, ViteDevServer } from "vite";

export interface HashelOptions {
  /** File extension(s) searched with the pattern `*.el.{ext}` / `*.el.*.{ext}`. Default: `'vue'`. */
  ext?: string | string[];
  /** Custom matcher; overrides `ext`. Receives the path relative to the project root. */
  pattern?: RegExp | ((file: string) => boolean);
  /** HTML file (relative to root) used to render one element. Default: built-in template. */
  indexHtml?: string;
  /** Entry module used by the built-in template. Default: `'/src/hashel.ts'`. */
  entry?: string;
  /** Subdomain that opens the book UI in dev. Default: `'book'`. */
  book?: string;
  /** Directories to scan, relative to root. Default: `['src']`. */
  dirs?: string[];
  /**
   * URL path (and output folder) for the path-based book: `/<path>/` is the book,
   * `/<path>/<hash>/` an element. Used by `vite build` and also available in dev.
   * Default: `'hashel'`.
   */
  path?: string;
  /** Include the book and element pages in `vite build`. Default: `true`. */
  build?: boolean;
}

export interface HashelEntry {
  hash: string;
  /** Path relative to the project root, e.g. `src/components/Button.el.vue`. */
  file: string;
  /** Display name, e.g. `Button` or `Button · primary`. */
  name: string;
}

const ID_MAIN = "hashel";
const ID_LIST = "hashel:list";
const ID_BOOK = "/@hashel/book.js";
const RESOLVED_MAIN = "\0" + ID_MAIN;
const RESOLVED_LIST = "\0" + ID_LIST;
const RESOLVED_BOOK = "\0hashel:book";
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", ".vite"]);

// Compiled book UI, shipped next to this file as dist/client/book.mjs.
const BOOK_FILE = join(dirname(fileURLToPath(import.meta.url)), "client", "book.mjs");

const defaultHtml = (entry: string) => `<!doctype html>
<html lang="">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="${entry}"></script>
  </body>
</html>
`;

const bookHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>hashel</title>
  </head>
  <body>
    <div id="hashel-book"></div>
    <script type="module" src="${ID_BOOK}"></script>
  </body>
</html>
`;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function hashId(file: string): string {
  // DNS-label safe: lowercase hex, starts with a letter so it never looks like an IP part.
  return "h" + createHash("sha1").update(file).digest("hex").slice(0, 8);
}

function displayName(file: string): string {
  const base = file.split("/").pop() ?? file;
  const m = base.match(/^(.*?)\.el(?:\.(.+))?\.[^.]+$/);
  if (!m) return base;
  return m[2] ? `${m[1]} · ${m[2]}` : (m[1] ?? base);
}

/** First DNS label of the Host header, or undefined for plain hosts like `localhost` or IPs. */
function subdomain(req: IncomingMessage): string | undefined {
  const host = (req.headers.host ?? "").replace(/:\d+$/, "").toLowerCase();
  if (!host || /^[\d.]+$/.test(host) || host.startsWith("[")) return undefined;
  const labels = host.split(".");
  if (labels.length < 2) return undefined;
  return labels[0];
}

/** Tell the runtime which element this page renders. */
function injectHash(html: string, hash: string): string {
  const meta = `<meta name="hashel" content="${hash}" />`;
  return /<\/head>/i.test(html)
    ? html.replace(/<\/head>/i, `  ${meta}\n  </head>`)
    : meta + "\n" + html;
}

export default function hashel(options: HashelOptions = {}): Plugin {
  const exts = [options.ext ?? "vue"].flat();
  const entry = options.entry ?? "/src/hashel.ts";
  const bookLabel = (options.book ?? "book").toLowerCase();
  const dirs = options.dirs ?? ["src"];
  const pagePath = (options.path ?? "hashel").replace(/^\/+|\/+$/g, "");
  const includeInBuild = options.build ?? true;

  const extRe = new RegExp(`\\.el(?:\\.[\\w-]+)?\\.(?:${exts.map(escapeRe).join("|")})$`);
  const matches = (file: string) =>
    options.pattern instanceof RegExp
      ? options.pattern.test(file)
      : typeof options.pattern === "function"
        ? options.pattern(file)
        : extRe.test(file);

  let root = process.cwd();
  let isBuild = false;
  let server: ViteDevServer | undefined;
  const entries = new Map<string, HashelEntry>(); // hash -> entry

  const toRel = (abs: string) => relative(root, abs).split(sep).join("/");
  /** Absolute id of a generated page; its path relative to root becomes the output file. */
  const pageId = (hash?: string) =>
    resolve(root, pagePath, ...(hash ? [hash] : []), "index.html")
      .split(sep)
      .join("/");

  function scan() {
    entries.clear();
    const walk = (dir: string) => {
      if (!existsSync(dir)) return;
      for (const d of readdirSync(dir, { withFileTypes: true })) {
        if (d.isDirectory()) {
          if (!IGNORED_DIRS.has(d.name)) walk(join(dir, d.name));
        } else {
          add(join(dir, d.name));
        }
      }
    };
    for (const d of dirs) walk(resolve(root, d));
  }

  function add(abs: string): boolean {
    const file = toRel(abs);
    if (file.startsWith("..") || !matches(file)) return false;
    const hash = hashId(file);
    entries.set(hash, { hash, file, name: displayName(file) });
    return true;
  }

  function list(): HashelEntry[] {
    return [...entries.values()].sort((a, b) => a.file.localeCompare(b.file));
  }

  /** HTML for the book (no hash) or for one element. */
  function pageHtml(hash?: string): string {
    if (!hash) return bookHtml;
    const html = options.indexHtml
      ? readFileSync(resolve(root, options.indexHtml), "utf-8")
      : defaultHtml(entry);
    return injectHash(html, hash);
  }

  /** Which page a generated id refers to: `null` = book, string = hash, undefined = not ours. */
  function pageFromId(id: string): string | null | undefined {
    if (id === pageId()) return null;
    for (const hash of entries.keys()) if (id === pageId(hash)) return hash;
    return undefined;
  }

  function onFilesChanged() {
    if (!server) return;
    for (const id of [RESOLVED_MAIN, RESOLVED_LIST]) {
      const mod = server.moduleGraph.getModuleById(id);
      if (mod) server.moduleGraph.invalidateModule(mod);
    }
    server.ws.send({ type: "custom", event: "hashel:list", data: list() });
  }

  return {
    name: "hashel",
    enforce: "pre",

    config(userConfig) {
      return {
        server: {
          // Allow `book.127-0-0-1.nip.io`, `<hash>.127-0-0-1.nip.io`, `book.localhost`, ...
          allowedHosts: [".nip.io", ".sslip.io", ".localhost"],
          // `localhost` may bind to IPv6 `::1` only, while `*.127-0-0-1.nip.io` resolves to
          // 127.0.0.1. Listen on IPv4 loopback unless the user chose a host.
          ...(userConfig.server?.host === undefined ? { host: "127.0.0.1" } : {}),
        },
      };
    },

    configResolved(config) {
      root = config.root;
      isBuild = config.command === "build";
      scan();
    },

    // Build: add the book and one HTML page per element as extra inputs.
    options(opts) {
      if (!isBuild || !includeInBuild) return;
      const pages: Record<string, string> = { [`${pagePath}/index`]: pageId() };
      for (const hash of entries.keys()) pages[`${pagePath}/${hash}/index`] = pageId(hash);

      const input = opts.input;
      if (typeof input === "string") opts.input = { index: input, ...pages };
      else if (Array.isArray(input)) opts.input = [...input, ...Object.values(pages)];
      else opts.input = { ...input, ...pages };
      return opts;
    },

    configureServer(srv) {
      server = srv;
      srv.watcher.on("add", (f) => add(f) && onFilesChanged());
      srv.watcher.on("unlink", (f) => {
        const hash = hashId(toRel(f));
        if (entries.delete(hash)) onFilesChanged();
      });

      const pathRe = new RegExp(`^/${escapeRe(pagePath)}(?:/([\\w-]+))?/?(?:index\\.html)?$`);

      srv.middlewares.use(async (req, res, next) => {
        try {
          if (req.method !== "GET") return next();
          const url = (req.url ?? "/").split("?")[0] ?? "/";
          let page: string | null | undefined; // null = book, string = hash

          // Subdomain routing: book.<host>/ and <hash>.<host>/
          const label = subdomain(req);
          if (label && (url === "/" || url === "/index.html")) {
            if (label === bookLabel) page = null;
            else if (entries.has(label)) page = label;
          }
          // Path routing: /hashel/ and /hashel/<hash>/ (same layout as the build output)
          const m = page === undefined ? url.match(pathRe) : null;
          if (m) {
            if (!m[1]) page = null;
            else if (entries.has(m[1])) page = m[1];
          }
          if (page === undefined) return next();

          const html = await srv.transformIndexHtml(
            req.url ?? "/",
            pageHtml(page ?? undefined),
            req.originalUrl,
          );
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache");
          res.end(html);
        } catch (e) {
          next(e);
        }
      });
    },

    resolveId(id) {
      if (id === ID_MAIN) return RESOLVED_MAIN;
      if (id === ID_LIST) return RESOLVED_LIST;
      if (id === ID_BOOK) return RESOLVED_BOOK;
      if (isBuild && pageFromId(id.split(sep).join("/")) !== undefined) return id;
    },

    load(id) {
      if (id === RESOLVED_BOOK) return readFileSync(BOOK_FILE, "utf-8");

      if (isBuild) {
        const page = pageFromId(id);
        if (page !== undefined) return pageHtml(page ?? undefined);
      }

      if (id === RESOLVED_LIST) {
        const map = Object.fromEntries(list().map((e) => [e.hash, ["./" + e.file]]));
        return [
          `export const list = ${JSON.stringify(list())}`,
          `export const hashel = ${JSON.stringify(map)}`,
          `export const bookLabel = ${JSON.stringify(bookLabel)}`,
          `/** URL of the path-based book, e.g. "/hashel/". */`,
          `export const basePath = import.meta.env.BASE_URL + ${JSON.stringify(pagePath + "/")}`,
        ].join("\n");
      }

      if (id === RESOLVED_MAIN) {
        const loaders = list()
          .map((e) => `  ${JSON.stringify(e.hash)}: () => import(${JSON.stringify("/" + e.file)}),`)
          .join("\n");
        return `export { list, hashel } from ${JSON.stringify(ID_LIST)}
import { list } from ${JSON.stringify(ID_LIST)}

const loaders = {
${loaders}
}

const meta = document.querySelector('meta[name="hashel"]')
/** Hash of the element rendered by this page (from <meta name="hashel">, else the subdomain). */
export const hash = (meta && meta.getAttribute('content')) || location.hostname.split('.')[0]
/** Entry describing the opened element, or undefined. */
export const entry = list.find((e) => e.hash === hash)
/** Path of the opened element file. */
export const file = entry && entry.file
const mod = loaders[hash] ? await loaders[hash]() : undefined
/** Default export of the opened element file. */
export const Component = mod && mod.default
/** Full module namespace of the opened element file. */
export const module = mod
`;
      }
    },
  };
}
