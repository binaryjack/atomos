import { readFileSync } from 'fs';
import { auditArchitecture } from '../analysis/architecture-linter.js';
import { findCycles } from '../analysis/cycle-detector.js';
import { computeGraphMetrics } from '../analysis/graph-metrics.js';
import type { Entity } from '../types/entity.types.js';
import type { LinkProps } from '../types/link.types.js';

export interface SdkEnvelope<T = unknown> {
  ok: boolean;
  namespace: string;
  data: T | null;
  error: string | null;
}

export const successEnvelope = <T>(data: T): SdkEnvelope<T> => ({
  ok: true,
  namespace: '@atomos-web/structura',
  data,
  error: null,
});

export const errorEnvelope = (error: string): SdkEnvelope<null> => ({
  ok: false,
  namespace: '@atomos-web/structura',
  data: null,
  error,
});

interface SchemaJson {
  entities?: Entity[];
  links?: LinkProps[];
  nodes?: Entity[];
  edges?: LinkProps[];
}

const loadSchema = (filePath: string): { entities: Entity[]; links: LinkProps[] } => {
  const content = readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content) as SchemaJson;
  return {
    entities: parsed.entities ?? parsed.nodes ?? [],
    links: parsed.links ?? parsed.edges ?? [],
  };
};

export const executeStructuraCli = (args: string[]): SdkEnvelope<unknown> => {
  const isJson = args.includes('--json');
  const cleanArgs = args.filter((a) => a !== '--json');
  const command = cleanArgs[0];
  const targetFile = cleanArgs[1];

  try {
    switch (command) {
      case 'audit': {
        if (!targetFile) return errorEnvelope('Missing file path for audit command');
        const { entities, links } = loadSchema(targetFile);
        return successEnvelope(auditArchitecture(entities, links));
      }
      case 'metrics': {
        if (!targetFile) return errorEnvelope('Missing file path for metrics command');
        const { entities, links } = loadSchema(targetFile);
        return successEnvelope(computeGraphMetrics(entities, links));
      }
      case 'cycles': {
        if (!targetFile) return errorEnvelope('Missing file path for cycles command');
        const { entities, links } = loadSchema(targetFile);
        return successEnvelope(findCycles(entities, links));
      }
      case 'version':
        return successEnvelope({ name: '@atomos-web/structura', version: '5.0.0' });
      case 'help':
      default:
        return successEnvelope({
          usage: 'atomos-structura <command> [file] [--json]',
          commands: ['audit <file>', 'metrics <file>', 'cycles <file>', 'version'],
        });
    }
  } catch (err) {
    return errorEnvelope(err instanceof Error ? err.message : String(err));
  }
};

export const runCli = (): void => {
  const envelope = executeStructuraCli(process.argv.slice(2));
  console.log(JSON.stringify(envelope, null, 2));
  if (!envelope.ok) {
    process.exitCode = 1;
  }
};
