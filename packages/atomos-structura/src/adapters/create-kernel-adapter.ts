import type { DomainEntity, DomainLink } from '../core/domain/entity-aggregate.js';
import type { EntityManager } from '../core/presentation/entity-manager.js';

import type { Cardinality, RenderType } from '@atomos/structura-core';
import type { SchemaGraphKernel } from '../core/create-schema-graph-kernel.js';

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
            case 'EntityCreated': {
                const ent: DomainEntity = event.entity;
                kernel.addEntity({
                    id: ent.id,
                    code: ent.id,
                    name: ent.name,
                    nodeType: ent.shape || 'default',
                    properties: [...(ent.properties || [])],
                    position: ent.position,
                    dimensions: ent.dimensions,
                    edges: [],
                    createdAt: ent.createdAt,
                    updatedAt: ent.updatedAt
                });
                break;
            }                break;
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
                        leftCardinality: '1' as Cardinality,
                        rightCardinality: '1' as Cardinality,
                        renderType: 'linear' as RenderType
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
       syncingToKernel = true;
       entityManager.getAllEntities().forEach((e: DomainEntity) => {
           kernel.addEntity({
               id: e.id,
               code: e.id,
               name: e.name,
               nodeType: e.shape || 'default',
               properties: [...(e.properties || [])],
               position: e.position,
               dimensions: e.dimensions,
               edges: [],
               createdAt: e.createdAt,
               updatedAt: e.updatedAt
           });
       });
       entityManager.getAllLinks().forEach((l: DomainLink) => {
           kernel.addLink({
               id: l.id,
               leftEntityId: l.sourceEntityId,
               rightEntityId: l.targetEntityId,
               leftAnchorId: l.sourceAnchorId,
               rightAnchorId: l.targetAnchorId,
               leftCardinality: '1' as Cardinality,
               rightCardinality: '1' as Cardinality,
               renderType: 'linear' as RenderType
           });
       });
       syncingToKernel = false;
    }

    return Object.freeze({
        destroy: () => {
            unsubscribeKernel();
            if (unsubscribeUI) unsubscribeUI();
        }
    });
};
