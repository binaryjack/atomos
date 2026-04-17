# Structura Canvas — VS Code Extension Integration Guide

This guide covers everything needed to embed the **Structura Canvas** inside a VS Code extension webview panel, with optional real-time MCP sync.

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | ≥ 18 |
| VS Code Extension API | ≥ 1.80 |
| `@atomos-web/structura` | ≥ 1.1.2 |
| `@atomos-web/structura-mcp` *(optional)* | ≥ 1.1.2 |

---

## Installation

```bash
npm install @atomos-web/structura
# optional — only if you want to drive the canvas from your extension's server
npm install @atomos-web/structura-mcp
```

---

## Project Layout

A typical extension using Structura looks like:

```
my-extension/
├── src/
│   ├── extension.ts       ← activate / deactivate
│   └── canvas-panel.ts    ← webview panel helper
├── node_modules/
│   └── @atomos-web/structura/
│       ├── dist/webview/index.js   ← served into webview
│       └── webview/template.html  ← base HTML template
└── package.json
```

---

## Minimal Setup (standalone canvas, no MCP)

**`src/canvas-panel.ts`**

```ts
import * as vscode from 'vscode'
import * as fs from 'fs'

export function openCanvasPanel(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'structuraCanvas',
    'Structura Canvas',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'node_modules'),
      ],
    }
  )

  panel.webview.html = buildHtml(panel.webview, context.extensionUri)
  return panel
}

function buildHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = getNonce()

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      extensionUri,
      'node_modules', '@atomos-web', 'structura', 'dist', 'webview', 'index.js'
    )
  )

  const templatePath = vscode.Uri.joinPath(
    extensionUri,
    'node_modules', '@atomos-web', 'structura', 'webview', 'template.html'
  )

  return fs.readFileSync(templatePath.fsPath, 'utf8')
    .replaceAll('${webview.cspSource}', webview.cspSource)
    .replaceAll('${nonce}', nonce)
    .replaceAll('${scriptUri}', scriptUri.toString())
}

function getNonce(): string {
  let t = ''
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) t += c[Math.floor(Math.random() * c.length)]
  return t
}
```

**`src/extension.ts`**

```ts
import * as vscode from 'vscode'
import { openCanvasPanel } from './canvas-panel'

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('myExt.openCanvas', () => {
      openCanvasPanel(context)
    })
  )
}
```

---

## With MCP Sync

MCP (Model Context Protocol) sync lets your extension push schema changes to the canvas in real time. The canvas opens an SSE connection to your MCP server and patches its Redux store automatically.

### Architecture

```
Extension Host              Webview (browser context)
─────────────────           ──────────────────────────────
MCP HTTP Server  ←──SSE──── initializeStructuraWebview({ mcpServerUrl })
startMcpServer()            └─ createMcpSync()  (auto-reconnecting SSE)
```

### Extension side

```ts
import * as vscode from 'vscode'
import { startMcpServer } from '@atomos-web/structura-mcp'
import { openCanvasPanel } from './canvas-panel'

let mcpServer: Awaited<ReturnType<typeof startMcpServer>> | null = null

export async function activate(context: vscode.ExtensionContext) {
  // Start the MCP server on a free port in the extension host process
  mcpServer = await startMcpServer({ port: 9743 })

  context.subscriptions.push(
    vscode.commands.registerCommand('myExt.openCanvas', () => {
      openCanvasPanel(context, 'http://localhost:9743')
    }),
    { dispose: () => mcpServer?.stop() }
  )
}

export function deactivate() {
  mcpServer?.stop()
}
```

### Update `buildHtml` to pass the MCP URL and schema ID

`template.html` ships with `${mcpUrl}` and `${schemaId}` injection tokens.  Replace them alongside the other tokens so each webview panel gets its own isolated MCP connection:

```ts
function buildHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  mcpServerUrl?: string,
  schemaId?: string,
): string {
  const nonce = getNonce()

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      extensionUri,
      'node_modules', '@atomos-web', 'structura', 'dist', 'webview', 'index.js'
    )
  )

  const templatePath = vscode.Uri.joinPath(
    extensionUri,
    'node_modules', '@atomos-web', 'structura', 'webview', 'template.html'
  )

  return fs.readFileSync(templatePath.fsPath, 'utf8')
    .replaceAll('${webview.cspSource}', webview.cspSource)
    .replaceAll('${nonce}', nonce)
    .replaceAll('${scriptUri}', scriptUri.toString())
    .replaceAll('${mcpUrl}', mcpServerUrl ?? '')
    .replaceAll('${schemaId}', schemaId ?? '')
}
```

When `mcpServerUrl` is an empty string the webview's `initializeStructuraWebview` treats it as `undefined` and runs in standalone mode — no SSE connection is opened.

---

## Instance Isolation

Each VS Code webview panel runs in its own browser context, so the Redux store, canvas adapter, and SSE connection are fully isolated — no state leaks between panels.

When your extension opens **multiple** panels for different schemas simultaneously, pass a unique `schemaId` to each panel so the MCP server can target the correct schema:

```ts
// Extension Host side — provision a schema through the MCP server, then open a panel for it
const schemaId = await mcpServer.createSchema({ name: 'My Schema' })
openCanvasPanel(context, 'http://localhost:9743', schemaId)

// canvas-panel.ts — propagate the schemaId through buildHtml
export function openCanvasPanel(
  context: vscode.ExtensionContext,
  mcpServerUrl?: string,
  schemaId?: string,
) {
  const panel = vscode.window.createWebviewPanel(...)
  panel.webview.html = buildHtml(panel.webview, context.extensionUri, mcpServerUrl, schemaId)
}
```

The MCP server keeps schema state keyed by `schema_id`.  All entity/link tool calls require an explicit `schema_id` parameter — see the [MCP README](../atomos-structura-mcp/README.md) for the full API.

---

## Multi-Instance Isolation with `instanceId`

**v1.2.0+** — When running multiple Structura panels simultaneously (e.g. side-by-side schema editors), each must have a unique `instanceId` to ensure complete storage and state isolation.

### What gets isolated?

- **localStorage keys** — Prefixed with `${instanceId}:` to prevent collision
- **Design system tokens** — Scoped to the panel's container
- **Redux store** — Per-instance (future: currently uses global with namespaced persistence)
- **Canvas adapters** — Instance-scoped registration

### Automatic vs. explicit

If you **do not** provide `instanceId`, Structura auto-generates one:

```ts
// Auto-generated instanceId (random UUID + timestamp)
const app = await initializeStructuraWebview({
  containerId: 'app',
  mcpServerUrl: 'http://localhost:9743',
})
```

If you **do** want deterministic IDs (e.g. for testing), provide one:

```ts
// Deterministic instanceId
const app1 = await initializeStructuraWebview({
  instanceId: 'schema-editor-1',
  containerId: 'app1',
})

const app2 = await initializeStructuraWebview({
  instanceId: 'schema-editor-2',
  containerId: 'app2',
})
```

### Extension example

```ts
// canvas-panel.ts
function buildHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  mcpServerUrl?: string,
  schemaId?: string,
  instanceId?: string,  // ← Add this parameter
): string {
  const nonce = getNonce()
  const scriptUri = webview.asWebviewUri(...)
  const templatePath = vscode.Uri.joinPath(...)

  return fs.readFileSync(templatePath.fsPath, 'utf8')
    .replaceAll('${webview.cspSource}', webview.cspSource)
    .replaceAll('${nonce}', nonce)
    .replaceAll('${scriptUri}', scriptUri.toString())
    .replaceAll('${mcpUrl}', mcpServerUrl ?? '')
    .replaceAll('${schemaId}', schemaId ?? '')
    .replaceAll('${instanceId}', instanceId ?? '')  // ← Add this line
}

export function openCanvasPanel(
  context: vscode.ExtensionContext,
  mcpServerUrl?: string,
  schemaId?: string,
  instanceId?: string,  // ← Add this parameter
) {
  const panel = vscode.window.createWebviewPanel(...)
  panel.webview.html = buildHtml(panel.webview, context.extensionUri, mcpServerUrl, schemaId, instanceId)
}
```

### Template injection

Update your `template.html` to pass `instanceId`:

```html
<script nonce="${nonce}">
  StructuraWebview.initializeStructuraWebview({
    containerId: 'app',
    mcpServerUrl: '${mcpUrl}',
    schemaId: '${schemaId}',
    instanceId: '${instanceId}',  // ← Add this
  }).catch(err => console.error('[Structura] init failed', err))
</script>
```

When `instanceId` is omitted from the config, it is auto-generated. You only need to provide it if you want deterministic IDs or testing predictability.

---

## Single-bundle IIFE (recommended for VSIX packaging)

By default the webview entry point is an ES module (`dist/webview/index.js`) which requires `<script type="module">`.  For VS Code extensions packaged as VSIX files — where the webview's script path must match a single `localResourceRoots` URI — a self-contained **IIFE** bundle is more reliable.

Build the IIFE bundle:

```bash
# inside packages/atomos-structura
pnpm run build:webview-iife
# output → dist/webview/index.iife.js
```

Use it in your extension:

```ts
const scriptUri = webview.asWebviewUri(
  vscode.Uri.joinPath(
    extensionUri,
    'node_modules', '@atomos-web', 'structura',
    'dist', 'webview', 'index.iife.js'   // ← IIFE bundle, no dynamic imports
  )
)
```

The IIFE exposes `window.StructuraWebview`.  Replace the `<script type="module">` in `template.html` with a plain `<script>`:

```html
<script nonce="${nonce}" src="${scriptUri}"></script>
<script nonce="${nonce}">
  StructuraWebview.initializeStructuraWebview({
    containerId: 'app',
    mcpServerUrl: '${mcpUrl}',
    schemaId: '${schemaId}',
  }).catch(err => console.error('[Structura] init failed', err))
</script>
```

---

## Disposing correctly

Always call `disconnect()` when a panel is closed to avoid SSE connection leaks:

```ts
// webview side — modify the inline script in template.html
initializeStructuraWebview({ mcpServerUrl: '...' })
  .then(app => {
    // VS Code webview messaging — relay dispose signal if needed
    window.addEventListener('unload', () => app.disconnect())
  })
```

---

## Content Security Policy notes

The shipped `template.html` uses this CSP:

```
default-src 'none';
style-src   ${webview.cspSource} 'unsafe-inline';
script-src  ${webview.cspSource} 'nonce-${nonce}';
connect-src http://localhost:* ws://localhost:*;
```

- `'unsafe-inline'` on `style-src` is required for Structura's runtime-injected CSS custom properties.
- `connect-src localhost:*` allows SSE connections to any local port. Narrow this to the exact MCP port in production (`http://localhost:9743`).

---

## Bundling the webview JS into your extension

If you bundle your extension (esbuild, webpack, etc.) you have two options:

### Option A — ship `node_modules` (simplest)

Add `node_modules/@atomos-web/structura/dist/webview` to your `.vscodeignore` exclusions so it **is** included in the VSIX.

### Option B — copy during build

```jsonc
// package.json scripts
{
  "scripts": {
    "build": "tsc && node scripts/copy-webview.mjs"
  }
}
```

```js
// scripts/copy-webview.mjs
import { cpSync } from 'fs'
cpSync(
  'node_modules/@atomos-web/structura/dist/webview',
  'out/webview',
  { recursive: true }
)
```

Then update `localResourceRoots` and `scriptUri` to point at `out/webview/index.js`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Blank/invisible canvas | Design system tokens not injected | `initializeStructuraWebview` handles this automatically; make sure the script loaded without errors (`F12` → Console) |
| `Failed to resolve module specifier` | Wrong `scriptUri` | Log `scriptUri.toString()` and verify the file path |
| SSE connection refused | MCP server not started | Call `startMcpServer()` before `openCanvasPanel()`, check the port |
| `Container element #app not found` | HTML loaded before DOM ready | The `template.html` `<script type="module">` runs after DOM parse; verify `<div id="app">` exists |
| CSP error in console | Missing `connect-src` for MCP URL | Update the CSP `connect-src` directive in `buildHtml` |
