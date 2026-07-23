# Atomos Structura Showcase & Interactive Documentation

Interactive documentation and architecture demonstration platform for Atomos Structura built with Next.js 16 (App Router), Tailwind CSS, and Turbopack.

---

## Technical Overview

The Showcase application provides live interactive demonstrations, code generators, and visual previews for Atomos Structura components and integration patterns.

### Key Interactive Sections

- **Vector Presentation Mode (`/presentation`)**: Live preview of `@atomos-web/renderer-svg` with real-time theme switching (`sovereign-dark`, `clean-paper`, `transparent-vector`) and 4 relationship direction modes.
- **Mermaid.js Adapter (`/mermaid`)**: Interactive DSL parser and AST converter demonstrating bidirectional conversion between Mermaid flowchart syntax and Structura Schema Graphs.
- **Architecture Showcase (`/architectures/*`)**: Real-world architectural reference diagrams (CQRS, Event-Driven, Microservices, Security, MVC, Class Diagrams).
- **Headless MCP Integration (`/customization/headless-mcp-integration`)**: Live demonstration of browser-to-MCP server SSE synchronization.

---

## Local Development

```bash
# From workspace root
pnpm --filter showcase dev

# Or from packages/showcase
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Build & Production Verification

```bash
pnpm --filter showcase build
```

---

## License

Licensed under AGPLv3. See [LICENSE](LICENSE) for details.
