import { list as initialList, bookLabel, basePath } from "hashel:list";

interface Entry {
  hash: string;
  file: string;
  name: string;
}

interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  entries: Entry[];
}

const css = `
:root {
  --bg: #ffffff; --panel: #f6f7f9; --border: #e3e5e8; --text: #1f2328;
  --muted: #6b7280; --accent: #2f6feb; --accent-bg: #e8f0fe; --hover: #eceef1;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f1115; --panel: #161a20; --border: #262b33; --text: #e6e8eb;
    --muted: #8b93a1; --accent: #6ea8ff; --accent-bg: #1b2a44; --hover: #1d222a;
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: var(--bg); color: var(--text);
  font: 14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
#hashel-book { display: grid; grid-template-columns: 280px 1fr; height: 100vh; }
aside { background: var(--panel); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; min-height: 0; }
aside header { padding: 14px 14px 10px; font-weight: 600; letter-spacing: .02em; }
aside header small { color: var(--muted); font-weight: 400; margin-left: 6px; }
aside input { margin: 0 12px 10px; padding: 7px 10px; border: 1px solid var(--border);
  border-radius: 6px; background: var(--bg); color: var(--text); font: inherit; }
nav { overflow: auto; padding: 0 6px 12px; flex: 1; }
details { margin-left: 8px; }
details > summary { list-style: none; cursor: pointer; padding: 4px 8px; border-radius: 5px;
  color: var(--muted); user-select: none; }
details > summary::before { content: '▸'; display: inline-block; width: 14px; transition: transform .1s; }
details[open] > summary::before { transform: rotate(90deg); }
details > summary:hover { background: var(--hover); }
nav a { display: block; padding: 4px 8px 4px 22px; margin-left: 8px; border-radius: 5px;
  color: var(--text); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
nav a:hover { background: var(--hover); }
nav a.active { background: var(--accent-bg); color: var(--accent); font-weight: 500; }
main { display: flex; flex-direction: column; min-width: 0; }
.bar { display: flex; align-items: center; gap: 12px; padding: 8px 14px;
  border-bottom: 1px solid var(--border); min-height: 41px; }
.bar code { color: var(--muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.bar a, .bar button { color: var(--accent); background: none; border: 0; font: inherit; cursor: pointer; text-decoration: none; padding: 0; }
iframe { flex: 1; width: 100%; border: 0; background: #fff; }
.empty { margin: auto; color: var(--muted); text-align: center; padding: 24px; }
`;

const style = document.createElement("style");
style.textContent = css;
document.head.appendChild(style);

const root = document.getElementById("hashel-book")!;
root.innerHTML = `
  <aside>
    <header>hashel <small></small></header>
    <input type="search" placeholder="Filter…" />
    <nav></nav>
  </aside>
  <main>
    <div class="bar"><code></code><button type="button" data-reload hidden>Reload</button><a target="_blank" rel="noopener" hidden>Open ↗</a></div>
    <div class="empty">Select an element on the left.</div>
    <iframe hidden title="Element preview"></iframe>
  </main>
`;

const nav = root.querySelector("nav")!;
const count = root.querySelector("header small")!;
const filter = root.querySelector("input")!;
const pathLabel = root.querySelector(".bar code")!;
const openLink = root.querySelector<HTMLAnchorElement>(".bar a")!;
const reloadBtn = root.querySelector<HTMLButtonElement>("[data-reload]")!;
const empty = root.querySelector<HTMLElement>(".empty")!;
const iframe = root.querySelector("iframe")!;

let entries: Entry[] = initialList;
const openFolders = new Set<string>();
let firstRender = true;

/** Opened as `book.<host>` → subdomain URLs; otherwise (build, `/hashel/`) path URLs. */
const subdomainMode =
  location.hostname.split(".")[0] === bookLabel && location.hostname.includes(".");

/** `book.127-0-0-1.nip.io:5173` -> `<hash>.127-0-0-1.nip.io:5173`, or `/hashel/<hash>/` */
function elementUrl(hash: string): string {
  if (!subdomainMode) return `${basePath}${hash}/`;
  const [, ...rest] = location.hostname.split(".");
  const port = location.port ? ":" + location.port : "";
  return `${location.protocol}//${hash}.${rest.join(".")}${port}/`;
}

function buildTree(items: Entry[]): TreeNode {
  const tree: TreeNode = { name: "", children: new Map(), entries: [] };
  for (const e of items) {
    const parts = e.file.split("/").slice(0, -1);
    let node = tree;
    for (const p of parts) {
      let child = node.children.get(p);
      if (!child) node.children.set(p, (child = { name: p, children: new Map(), entries: [] }));
      node = child;
    }
    node.entries.push(e);
  }
  // Collapse single-child folder chains without entries: src/components -> "src/components"
  const collapse = (n: TreeNode): TreeNode => {
    // Copy: the loop deletes and re-adds keys, which a live Map iterator would revisit.
    // oxlint-disable-next-line unicorn/no-useless-spread
    for (const [k, c] of [...n.children]) {
      let cur = c;
      while (cur.entries.length === 0 && cur.children.size === 1) {
        const [only] = cur.children.values();
        cur = { ...only!, name: `${cur.name}/${only!.name}` };
      }
      n.children.delete(k);
      n.children.set(cur.name, collapse(cur));
    }
    return n;
  };
  return collapse(tree);
}

function renderNode(node: TreeNode, path: string, query: string): string {
  let html = "";
  for (const child of [...node.children.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path ? `${path}/${child.name}` : child.name;
    if (firstRender) openFolders.add(p);
    const open = query || openFolders.has(p) ? " open" : "";
    html += `<details${open} data-path="${p}"><summary>${child.name}</summary>${renderNode(child, p, query)}</details>`;
  }
  for (const e of node.entries.sort((a, b) => a.name.localeCompare(b.name))) {
    html += `<a href="#${e.hash}" data-hash="${e.hash}" title="${e.file}">${e.name}</a>`;
  }
  return html;
}

function renderNav() {
  const q = filter.value.trim().toLowerCase();
  const visible = q ? entries.filter((e) => e.file.toLowerCase().includes(q)) : entries;
  count.textContent = String(entries.length);
  nav.innerHTML = visible.length
    ? renderNode(buildTree(visible), "", q)
    : `<div class="empty">No <code>*.el.*</code> files found.</div>`;
  firstRender = false;
  markActive();
}

function markActive() {
  const current = location.hash.slice(1);
  nav
    .querySelectorAll("a")
    .forEach((a) => a.classList.toggle("active", a.dataset.hash === current));
}

function select() {
  const hash = location.hash.slice(1);
  const entry = entries.find((e) => e.hash === hash);
  markActive();
  if (!entry) {
    iframe.hidden = true;
    iframe.removeAttribute("src");
    empty.hidden = false;
    openLink.hidden = reloadBtn.hidden = true;
    pathLabel.textContent = "";
    return;
  }
  const url = elementUrl(entry.hash);
  if (iframe.getAttribute("src") !== url) iframe.src = url;
  iframe.hidden = false;
  empty.hidden = true;
  openLink.href = url;
  openLink.hidden = reloadBtn.hidden = false;
  pathLabel.textContent = entry.file;
  document.title = `${entry.name} · ${bookLabel}`;
}

nav.addEventListener(
  "toggle",
  (e) => {
    const d = e.target as HTMLDetailsElement;
    if (filter.value) return;
    if (d.open) openFolders.add(d.dataset.path!);
    else openFolders.delete(d.dataset.path!);
  },
  true,
);
filter.addEventListener("input", renderNav);
reloadBtn.addEventListener("click", () => iframe.contentWindow?.location.reload());
window.addEventListener("hashchange", select);

renderNav();
select();

if (import.meta.hot) {
  import.meta.hot.on("hashel:list", (data: Entry[]) => {
    entries = data;
    renderNav();
    select();
  });
}
