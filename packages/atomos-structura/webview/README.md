# `@atomos-web/structura/webview` — VS Code Extension Integration

## Overview

The `/webview` sub-export provides a **zero-config entry point** for embedding the full Structura canvas inside a VS Code extension webview panel.

It handles:
- CSS design-system token injection (`--vbs-*` custom properties)
- Redux store initialisation
- Canvas UI mounting
- Optional bidirectional MCP sync

---

## Quick Start

### 1. Install

```bash
npm install @atomos-web/structura
```

### 2. Extension (TypeScript)

```ts
import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('myExt.openCanvas', () => {
      const panel = vscode.window.createWebviewPanel(
        'structuraCanvas',
        'Structura Canvas',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(context.extensionUri, 'node_modules'),
          ],
        }
      )

      panel.webview.html = buildHtml(panel.webview, context.extensionUri)
    })
  )
}

function buildHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = getNonce()

  // Point the webview at the pre-built ES module
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      extensionUri,
      'node_modules', '@atomos-web', 'structura', 'dist', 'webview', 'index.js'
    )
  )

  // Load the shipped template and substitute placeholders
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
  let text = ''
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) text += chars.charAt(Math.floor(Math.random() * chars.length))
  return text
}
```

---

## API

### `initializeStructuraWebview(config?)`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `containerId` | `string` | `'app'` | ID of the mount point element |
| `mcpServerUrl` | `string` | — | MCP server base URL. Enables bidirectional sync when set. |
| `workspaceConfig` | `WorkspaceConfig` | — | Initial workspace schema / settings forwarded to the Redux store. |

**Returns:** `Promise<WebviewApp>`

```ts
interface WebviewApp {
  element: HTMLElement       // The mounted root canvas element
  disconnect: () => Promise<void>  // Tear down MCP + destroy canvas
}
```

### Standalone (no MCP)

```ts
import { initializeStructuraWebview } from '@atomos-web/structura/webview'

const app = await initializeStructuraWebview({ containerId: 'app' })
```

### With MCP sync

```ts
const app = await initializeStructuraWebview({
  containerId: 'app',
  mcpServerUrl: 'http://localhost:3001',
})

// Cleanup on panel dispose
panel.onDidDispose(() => app.disconnect())
```

---

## MCP Server

If your extension starts an MCP server via `@atomos-web/structura-mcp`, pass its URL to `mcpServerUrl`. The canvas will open an SSE connection and apply real-time schema changes automatically.

```ts
import { startMcpServer } from '@atomos-web/structura-mcp'

const server = await startMcpServer({ port: 9743 })

const app = await initializeStructuraWebview({
  mcpServerUrl: 'http://localhost:9743',
})
```

---

## Content Security Policy

The shipped `template.html` includes a configurable CSP header with `${webview.cspSource}` and `${nonce}` placeholders. When using `buildHtml()` above, both are substituted before the HTML is sent to the webview.

The `connect-src` directive permits connections to `localhost:*` for MCP SSE. Restrict this to the exact MCP server port in production.

---

## Files

| File | Purpose |
|------|---------|
| `dist/webview/index.js` | ES module — import inside the webview `<script type="module">` |
| `dist/webview/index.d.ts` | TypeScript types |
| `webview/template.html` | Drop-in HTML template with CSP and mount point |
