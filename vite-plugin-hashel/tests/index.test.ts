import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, test } from "vite-plus/test";
import hashel, { hashId } from "../src/index.ts";

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "hashel-"));
  const files = [
    "src/components/Button.el.vue",
    "src/components/Button.el.primary.vue",
    "src/components/Button.vue",
    "src/Other.el.svelte",
    "node_modules/pkg/Ignored.el.vue",
  ];
  for (const f of files) {
    mkdirSync(join(root, f, ".."), { recursive: true });
    writeFileSync(join(root, f), "");
  }
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

/** Run the plugin hooks the way Vite would, without a server. */
async function loadList(options: Parameters<typeof hashel>[0] = {}) {
  const plugin = hashel(options) as any;
  plugin.configResolved({ root, command: "serve" });
  const id = plugin.resolveId("hashel:list");
  return plugin.load(id) as string;
}

test("hashId is stable and DNS-label safe", () => {
  const h = hashId("src/components/Button.el.vue");
  expect(h).toBe(hashId("src/components/Button.el.vue"));
  expect(h).toMatch(/^h[0-9a-f]{8}$/);
  expect(h).not.toBe(hashId("src/components/Button.el.primary.vue"));
});

test("finds *.el.{ext} and *.el.*.{ext} files only", async () => {
  const code = await loadList({ ext: "vue" });
  expect(code).toContain('"file":"src/components/Button.el.vue","name":"Button"');
  expect(code).toContain('"file":"src/components/Button.el.primary.vue","name":"Button · primary"');
  expect(code).not.toContain("Button.vue");
  expect(code).not.toContain("Other.el.svelte");
  expect(code).not.toContain("Ignored");
});

test("ext is configurable", async () => {
  const code = await loadList({ ext: ["svelte"] });
  expect(code).toContain("src/Other.el.svelte");
  expect(code).not.toContain("Button");
});

test("allows nip.io hosts and listens on IPv4 loopback in dev", () => {
  const plugin = hashel() as any;
  const server = plugin.config({}).server;
  expect(server.allowedHosts).toContain(".nip.io");
  expect(server.host).toBe("127.0.0.1");
  expect(plugin.config({ server: { host: true } }).server.host).toBeUndefined();
});
