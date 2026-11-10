import type { DomainEntity, DomainLink } from '../core/domain/entity-aggregate.js'
import type { EntityManager } from '../core/presentation/entity-manager.js'

import type { Cardinality, RenderType } from '@atomos-web/structura-core'
import type { SchemaGraphKernel } from '../core/create-schema-graph-kernel.js'

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

    // Kernel→UI sync is intentionally disabled: Redux is the source of truth.
    // Enabling it causes cross-schema entity/link contamination because the kernel
    // is schema-agnostic and its garbage-collection writes from one schema into another.
    const unsubscribeKernel = () => {};

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

                // Only add to kernel when both endpoints are explicitly tracked.
                // Skipping unknown entities avoids deleting Redux data for links
                // that belong to schemas not currently synced to the kernel.
                const { entities: kernelEntities } = kernel.getSnapshot();
                if (kernelEntities[sourceId] && kernelEntities[targetId]) {
                    if (kernel.canConnect(sourceId, targetId)) {
                        kernel.addLink({
                            id: event.link.id,
                            leftEntityId: sourceId,
                            rightEntityId: targetId,
                            leftAnchorId: event.link.sourceAnchorId,
                            rightAnchorId: event.link.targetAnchorId,
                            leftCardinality: event.link.sourceCardinality as Cardinality || '1',
                            rightCardinality: event.link.targetCardinality as Cardinality || '1',
                            renderType: event.link.renderType as RenderType || 'bezier'
                        });
                    } else {
                        console.warn(`Kernel Rejected Link: ${sourceId} -> ${targetId}`);
                    }
                }
                break;
            case 'LinkRemoved':
                kernel.removeLink(event.linkId);
                break;
            case 'LinkPropertiesUpdated':
                const linkToUpdate = entityManager.getLink(event.linkId);
                if (linkToUpdate) {
                    kernel.updateLink(event.linkId, {
                        leftCardinality: linkToUpdate.sourceCardinality as Cardinality,
                        rightCardinality: linkToUpdate.targetCardinality as Cardinality,
                        renderType: linkToUpdate.renderType as RenderType
                    });
                }
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
