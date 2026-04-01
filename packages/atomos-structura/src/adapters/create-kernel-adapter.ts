import type { SchemaGraphKernel } from '../core/create-schema-graph-kernel.js';
import type { EntityManager } from '@atomos/prime';

/**
 * Creates a two-way synchronization bridge between the headless SchemaGraphKernel
 * and the Atomos Prime existing CQRS/UI EntityManager.
 *
 * This ensures that atomos-structura remains the brain (business logic/schema rules),
 * while your exact existing \`canvas.html\` components (driven by EntityManager) drive UI.
 */
export const createKernelAdapter = (kernel: SchemaGraphKernel, entityManager: EntityManager) => {
    let syncingToUI = false;
    let syncingToKernel = false;

    // 1. Kernel (AST) -> UI (EntityManager)
    const unsubscribeKernel = kernel.subscribe(() => {
        if (syncingToKernel) return; // Prevent infinite event loops
        syncingToUI = true;

        const { entities, links } = kernel.getSnapshot();

        // 1A. Sync Entities
        for (const [id, entity] of Object.entries(entities)) {
            const existingUI = entityManager.getEntity(id);

            if (!existingUI) {
                // If it exists in Kernel but not UI, create it
                entityManager.createEntity(
                    id,
                    entity.name,
                    entity.position,
                    entity.dimensions || { width: 250, height: 150 },
                    // optional metadata for shapes
                );
                
                // Set properties initially
                if (entity.properties && entity.properties.length > 0) {
                   entityManager.updateEntityProperties(id, entity.properties);
                }
            } else {
                // Diff properties
                const xDiff = existingUI.position.x !== entity.position.x;
                const yDiff = existingUI.position.y !== entity.position.y;
                
                if (xDiff || yDiff) {
                    entityManager.moveEntity(id, entity.position);
                }

                if (existingUI.name !== entity.name) {
                    entityManager.updateEntityName(id, entity.name);
                }
            }
        }

        // 1B. Sync Links
        for (const [id, link] of Object.entries(links)) {
            const existingUI = entityManager.getLink(id);
            if (!existingUI) {
                entityManager.createLink(
                    id,
                    link.leftAnchorId || "right-1", // defaulting
                    link.rightAnchorId || "left-1", // defaulting
                    link.leftEntityId,
                    link.rightEntityId
                );
            }
        }

        // 1C. Garbage Collection (Deletions)
        const uiEntities = entityManager.getAllEntities();
        for (const uiEnt of uiEntities) {
            if (!entities[uiEnt.id]) entityManager.removeEntity(uiEnt.id);
        }

        const uiLinks = entityManager.getAllLinks();
        for (const uiLink of uiLinks) {
            if (!links[uiLink.id]) entityManager.removeLink(uiLink.id);
        }

        syncingToUI = false;
    });

    // 2. UI (EntityManager) -> Kernel (AST)
    const unsubscribeUI = entityManager.onApplicationEvent?.((event: any) => {
        if (syncingToUI) return; 
        syncingToKernel = true;

        switch (event.type) {
            case 'EntityCreated':
                kernel.addEntity({
                    ...event.entity,
                    nodeType: event.entity.metadata?.shape || 'default',
                    properties: event.entity.properties || []
                });
                break;
            case 'EntityMoved':
                const movedEnt = entityManager.getEntity(event.entityId);
                if (movedEnt) {
                    kernel.updateEntity(event.entityId, { position: movedEnt.position });
                }
                break;
            case 'EntityRemoved':
                kernel.removeEntity(event.entityId);
                break;
            case 'LinkCreated':
                const sourceId = event.link.sourceEntityId;
                const targetId = event.link.targetEntityId;

                // Validate the connection through our new AST rules
                if (kernel.canConnect(sourceId, targetId)) {
                    kernel.addLink({
                        id: event.link.id,
                        leftEntityId: sourceId,
                        rightEntityId: targetId,
                        leftAnchorId: event.link.sourceAnchorId,
                        rightAnchorId: event.link.targetAnchorId,
                        leftCardinality: '1',
                        rightCardinality: '1',
                        renderType: 'linear'
                    });
                } else {
                    console.warn(`Kernel Rejected Link: ${sourceId} -> ${targetId}`);
                    // The rule validation failed! Revert the UI line immediately.
                    
                    // We temporally unlock syncingToUI so the revert reaches the canvas 
                    syncingToKernel = false; 
                    entityManager.removeLink(event.link.id);
                    syncingToKernel = true;
                }
                break;
            case 'LinkRemoved':
                kernel.removeLink(event.linkId);
                break;
            case 'EntityPropertiesUpdated':
                const propEnt = entityManager.getEntity(event.entityId);
                if (propEnt) {
                    kernel.updateEntity(event.entityId, { properties: [...propEnt.properties] as any });
                }
                break;
            case 'EntityNameUpdated':
                const nameEnt = entityManager.getEntity(event.entityId);
                if (nameEnt) {
                    kernel.updateEntity(event.entityId, { name: nameEnt.name });
                }
                break;
        }

        syncingToKernel = false;
    });

    // Populate UI visually on bootstrap if Kernel has pre-existing seed data
    const initialConfig = kernel.getSnapshot();
    if (Object.keys(initialConfig.entities).length > 0 || Object.keys(initialConfig.links).length > 0) {
        // Trigger a fake sync
        kernel.updateEntity('__boot__', {}); 
    } 
    // And populate Kernel if UI has pre-existing cache
    else if (entityManager.getAllEntities().length > 0) {
       entityManager.getAllEntities().forEach(e => {
           kernel.addEntity({ ...e, nodeType: (e as any).metadata?.shape || 'default', properties: e.properties || [] } as any)
       });
       entityManager.getAllLinks().forEach(l => {
           kernel.addLink({ 
               id: l.id, 
               leftEntityId: l.sourceEntityId, 
               rightEntityId: l.targetEntityId, 
               leftAnchorId: l.sourceAnchorId, 
               rightAnchorId: l.targetAnchorId, 
               leftCardinality: 'one', 
               rightCardinality: 'one', 
               renderType: 'solid' 
           } as any);
       });
    }

    return Object.freeze({
        destroy: () => {
            unsubscribeKernel();
            if (unsubscribeUI) unsubscribeUI();
        }
    });
};
