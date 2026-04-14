# @atomos-web/structura-core

Pure TypeScript types, schemas, and factories for the Atomos Structura schema designer.  
Zero DOM dependencies — safe to use in Node.js, browser, and edge runtimes.

## Install

```bash
pnpm add @atomos-web/structura-core
# or
npm i @atomos-web/structura-core
```

## What's inside

| Export | Description |
|---|---|
| `Entity` | Core entity type (id, name, properties, shape, position, …) |
| `LinkProps` | Directed relationship between two entities |
| `Property` | Typed field on an entity (name, dataType, nullable, …) |
| `WorkspaceConfig` | Session-level policy flags (see below) |
| `SettingsProps` | Visual/theme settings shape |
| `EdgeProps`, `AnchorProps` | Edge and connector geometry |
| `createEntity(opts)` | Factory — creates a correctly shaped `Entity` |
| `createProperty(opts)` | Factory — creates a correctly shaped `Property` |
| `DATA_TYPES`, `COMPONENT_TYPES` | Enum-like const objects for property metadata |
| `entitySchema`, `linkSchema`, … | [Zod](https://zod.dev)-compatible validation schemas |

## WorkspaceConfig

```ts
import type { WorkspaceConfig } from '@atomos-web/structura-core';

const config: WorkspaceConfig = {
  /** Suppress all settings UI panels. Headless instances ignore settings-toggled actions. */
  headless: true,

  /** When false, each builder instance / MCP session is locked to a single schema. */
  allow_multiple_schemas: false,
};
```

## Factories

```ts
import { createEntity, createProperty, DATA_TYPES } from '@atomos-web/structura-core';

const user = createEntity({
  name: 'User',
  properties: [
    createProperty({ name: 'id',    dataType: DATA_TYPES.UUID,    nullable: false }),
    createProperty({ name: 'email', dataType: DATA_TYPES.VARCHAR, nullable: false }),
  ],
});
```

## Validation schemas

The package ships lightweight runtime validation schemas (`entitySchema`, `linkSchema`, `settingsSchema`, etc.) built with [@binaryjack/formular.dev](https://github.com/binaryjack/formular.dev).

```ts
import { entitySchema } from '@atomos-web/structura-core';

const result = entitySchema.safeParse(rawInput);
if (!result.success) console.error(result.error);
```

## License

MIT
