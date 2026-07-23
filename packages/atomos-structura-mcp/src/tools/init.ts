import { registerEntityTools } from './handlers/entity-tools.js';
import { registerSchemaTools } from './handlers/schema-tools.js';
import { registerSessionTools } from './handlers/session-tools.js';
import { registerTelemetryTools } from './handlers/telemetry-tools.js';
import { registerViewportTools } from './handlers/viewport-tools.js';

let initialized = false;

export function initializeToolRegistry(): void {
  if (initialized) return;
  initialized = true;

  registerEntityTools();
  registerSchemaTools();
  registerViewportTools();
  registerTelemetryTools();
  registerSessionTools();
}
