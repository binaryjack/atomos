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

### Update `buildHtml` to pass the MCP URL

The `template.html` contains a commented-out `mcpServerUrl` placeholder. Interpolate it before sending the HTML to the webview:

```ts
function buildHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  mcpServerUrl?: string
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

  let html = fs.readFileSync(templatePath.fsPath, 'utf8')
    .replaceAll('${webview.cspSource}', webview.cspSource)
    .replaceAll('${nonce}', nonce)
    .replaceAll('${scriptUri}', scriptUri.toString())

  if (mcpServerUrl) {
    html = html.replace(
      "// mcpServerUrl: 'http://localhost:9743',  // ← uncomment to enable MCP sync",
      `mcpServerUrl: '${mcpServerUrl}',`
    )
  }

  return html
}
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
