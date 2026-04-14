import type { Entity, LinkProps, Property } from '@atomos-web/structura-core';

export interface SchemaGraphState {
    readonly entities: Record<string, Entity>;
    readonly links: Record<string, LinkProps>;
}

export type GraphListener = () => void;

export interface ValidationRule {
    sourceType: string;
    targetType: string;
    description?: string;
}

export interface SchemaGraphKernel {
    // State Access (React useSyncExternalStore compatible)
    readonly getSnapshot: () => SchemaGraphState;
    readonly subscribe: (listener: GraphListener) => () => void;
    
    // Mutations
    readonly addEntity: (entity: Entity) => void;
    readonly updateEntity: (id: string, partial: Partial<Entity>) => void;
    readonly removeEntity: (id: string) => void;

    readonly addLink: (link: LinkProps) => void;
    readonly updateLink: (id: string, partial: Partial<LinkProps>) => void;
    readonly removeLink: (id: string) => void;

    // Rules & Topologies
    readonly registerValidationRule: (rule: ValidationRule) => void;
    readonly canConnect: (sourceId: string, targetId: string) => boolean;

    // Traversal & Analytics
    readonly getParents: (entityId: string) => Entity[];
    readonly getChildren: (entityId: string) => Entity[];
    readonly getTopologicalSort: () => string[];
    readonly detectCycles: () => string[][];

    // Schema Synthesis
    readonly extractJsonSchema: (entityId: string) => Record<string, unknown>;
}

export const createSchemaGraphKernel = (initialState?: SchemaGraphState): SchemaGraphKernel => {
    let state: SchemaGraphState = {
        entities: initialState?.entities || {},
        links: initialState?.links || {}
    };

    const listeners: Set<GraphListener> = new Set();
    const validationRules: ValidationRule[] = [];

    const emit = () => {
        listeners.forEach(listener => listener());
    };

    const updateState = (newState: SchemaGraphState) => {
        state = newState;
        emit();
    };

    return Object.freeze({
        getSnapshot: () => state,
        
        subscribe: (listener: GraphListener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },

        addEntity: (entity: Entity) => {
            updateState({
                ...state,
                entities: { ...state.entities, [entity.id]: entity }
            });
        },

        updateEntity: (id: string, partial: Partial<Entity>) => {
            const existing = state.entities[id];
            if (!existing) return;
            
            updateState({
                ...state,
                entities: { ...state.entities, [id]: { ...existing, ...partial } }
            });
        },

        removeEntity: (id: string) => {
            const { [id]: removedEntity, ...remainingEntities } = state.entities;
            
            // Auto-remove linked connections
            const remainingLinks = Object.fromEntries(
                Object.entries(state.links).filter(
                    ([_, link]) => link.leftEntityId !== id && link.rightEntityId !== id
                )
            );

            updateState({
                entities: remainingEntities,
                links: remainingLinks
            });
        },

        addLink: (link: LinkProps) => {
            updateState({
                ...state,
                links: { ...state.links, [link.id]: link }
            });
        },

        updateLink: (id: string, partial: Partial<LinkProps>) => {
            const existing = state.links[id];
            if (!existing) return;

            updateState({
                ...state,
                links: { ...state.links, [id]: { ...existing, ...partial } }
            });
        },

        removeLink: (id: string) => {
            const { [id]: removedLink, ...remainingLinks } = state.links;
            updateState({
                ...state,
                links: remainingLinks
            });
        },

        registerValidationRule: (rule: ValidationRule) => {
            validationRules.push(rule);
        },

        canConnect: (sourceId: string, targetId: string) => {
            const source = state.entities[sourceId];
            const target = state.entities[targetId];
            if (!source || !target) return false;

            // If no specific rules exist, default to allowing connection
            if (validationRules.length === 0) return true;

            const sourceType = source.nodeType || 'default';
            const targetType = target.nodeType || 'default';

            return validationRules.some(rule => 
                rule.sourceType === sourceType && rule.targetType === targetType
            );
        },

        getParents: (entityId: string) => {
            return Object.values(state.links)
                .filter(link => link.rightEntityId === entityId)
                .map(link => state.entities[link.leftEntityId])
                .filter((e): e is Entity => e !== undefined);
        },

        getChildren: (entityId: string) => {
            return Object.values(state.links)
                .filter(link => link.leftEntityId === entityId)
                .map(link => state.entities[link.rightEntityId])
                .filter((e): e is Entity => e !== undefined);
        },

        getTopologicalSort: () => {
            const sorted: string[] = [];
            const visited = new Set<string>();
            const visiting = new Set<string>();
            const nodes = Object.keys(state.entities);

            let hasCycle = false;

            const visit = (nodeId: string) => {
                if (hasCycle) return;
                if (visited.has(nodeId)) return;
                if (visiting.has(nodeId)) {
                    hasCycle = true;
                    return;
                }

                visiting.add(nodeId);

                // Visit all children
                const outLinks = Object.values(state.links)
                    .filter(link => link.leftEntityId === nodeId)
                    .map(link => link.rightEntityId);

                for (const childId of outLinks) {
                    visit(childId);
                }

                visiting.delete(nodeId);
                visited.add(nodeId);
                sorted.unshift(nodeId); // push to front since we're visiting post-order
            };

            for (const nodeId of nodes) {
                if (!visited.has(nodeId)) {
                    visit(nodeId);
                }
            }

            if (hasCycle) {
                console.warn('Graph contains a cycle; topological sort may be invalid.');
            }

            return sorted;
        },

        detectCycles: () => {
            const cycles: string[][] = [];
            const nodes = Object.keys(state.entities);
            const visited = new Set<string>();
            const visitingMap = new Map<string, string[]>();

            const visit = (nodeId: string, path: string[]) => {
                if (visited.has(nodeId)) return;
                
                const currentPath = [...path, nodeId];
                if (visitingMap.has(nodeId)) {
                    // Cycle detected!
                    const cycleStart = path.indexOf(nodeId);
                    if (cycleStart !== -1) {
                        cycles.push(currentPath.slice(cycleStart));
                    }
                    return;
                }

                visitingMap.set(nodeId, currentPath);

                const outLinks = Object.values(state.links)
                    .filter(link => link.leftEntityId === nodeId)
                    .map(link => link.rightEntityId);

                for (const childId of outLinks) {
                    visit(childId, currentPath);
                }

                visitingMap.delete(nodeId);
                visited.add(nodeId);
            };

            for (const nodeId of nodes) {
                if (!visited.has(nodeId)) {
                    visit(nodeId, []);
                }
            }

            return cycles;
        },

        extractJsonSchema: (entityId: string) => {
            const entity = state.entities[entityId];
            if (!entity) return {};

            const properties: Record<string, unknown> = {};
            const required: string[] = [];

            entity.properties.forEach((prop: Property) => {
                const propType = prop.dataType === 'number' ? 'number' 
                    : prop.dataType === 'boolean' ? 'boolean' 
                    : 'string';

                properties[prop.key] = { type: propType, title: prop.label };
                
                if (prop.validation?.required) {
                   required.push(prop.key);
                }
            });

            return {
                type: 'object',
                title: entity.name,
                properties,
                ...(required.length > 0 ? { required } : {})
            };
        }
    });
};
