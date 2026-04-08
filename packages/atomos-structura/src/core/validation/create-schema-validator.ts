import type { ReduxStore } from '../../types/redux-state.types.js';

export interface ValidationWarning {
  readonly entityId?: string;
  readonly linkId?: string;
  readonly rule: string;
  readonly message: string;
}

export interface SchemaValidator {
  readonly subscribe: (cb: (warnings: ValidationWarning[]) => void) => () => void;
  readonly cleanup: () => void;
}

export const createSchemaValidator = (store: ReduxStore): SchemaValidator => {
  const listeners = new Set<(warnings: ValidationWarning[]) => void>();
  let current: ValidationWarning[] = [];

  const runRules = (): ValidationWarning[] => {
    try {
      const st = store.get_state();
      const schema = st.schemas[st.active_schema_id];
      if (!schema) return [];

      const warnings: ValidationWarning[] = [];

      // Rule 1: entity missing an 'id' property (key or label match)
      // Properties field is nullable in older persisted data — guard with ?? []
      schema.entities.forEach(e => {
        const props = e.properties ?? [];
        if (!props.some(p => p.key === 'id' || (p.label ?? '').toLowerCase().trim() === 'id')) {
          warnings.push({ entityId: e.id, rule: 'missing-id', message: `"${e.name}" has no id property` });
        }
      });

      // Rule 2: duplicate entity names (case-insensitive)
      const names = new Map<string, string>();
      schema.entities.forEach(e => {
        const key = (e.name ?? '').toLowerCase();
        if (names.has(key)) {
          warnings.push({ entityId: e.id, rule: 'duplicate-name', message: `Duplicate entity name "${e.name}"` });
        } else {
          names.set(key, e.id);
        }
      });

      // Rule 3: duplicate property keys within a single entity
      schema.entities.forEach(e => {
        const keys = new Set<string>();
        (e.properties ?? []).forEach(p => {
          if (keys.has(p.key)) {
            warnings.push({ entityId: e.id, rule: 'duplicate-prop', message: `"${e.name}" has duplicate property "${p.key}"` });
          } else {
            keys.add(p.key);
          }
        });
      });

      // Rule 4: many-to-many link without a pivot entity
      (schema.links ?? []).forEach(l => {
        const isMany = (c: string) => c === '*' || c === '1..*';
        if (isMany(l.leftCardinality) && isMany(l.rightCardinality)) {
          const left = schema.entities.find(e => e.id === l.leftEntityId);
          const right = schema.entities.find(e => e.id === l.rightEntityId);
          warnings.push({
            linkId: l.id,
            rule: 'many-to-many',
            message: `M:N between "${left?.name ?? l.leftEntityId}" and "${right?.name ?? l.rightEntityId}" — add a pivot entity`,
          });
        }
      });

      return warnings;
    } catch (err) {
      console.error('[Validator] runRules error:', err);
      return current; // return last known good warnings on error, don't wipe them
    }
  };

  const unsub = store.subscribe(() => {
    try {
      const warnings = runRules();
      current = warnings;
      listeners.forEach(cb => { try { cb(warnings); } catch (e) { console.error('[Validator] listener error:', e); } });
    } catch (err) {
      console.error('[Validator] store subscriber error:', err);
    }
  });

  current = runRules();

  const subscribe = (cb: (warnings: ValidationWarning[]) => void): (() => void) => {
    listeners.add(cb);
    cb(current);
    return () => listeners.delete(cb);
  };

  return { subscribe, cleanup: unsub };
};
