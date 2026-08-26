import { describe, expect, it } from 'vitest'
import { autoRouteLinks } from '../src/core/application/dag-service.js'
import { createEntityManager, getEntityManager } from '../src/core/presentation/entity-manager.js'

describe('autoRouteLinks & LinkEndpointsUpdated', () => {
  it('publishes LinkEndpointsUpdated and updates link anchors when entities move', () => {
    const instanceId = 'test-auto-route-instance'
    const em = createEntityManager(instanceId)

    // Create 2 entities side by side
    em.createEntity('e1', 'Entity 1', { x: 0, y: 0 }, { width: 100, height: 100 })
    em.createEntity('e2', 'Entity 2', { x: 300, y: 0 }, { width: 100, height: 100 })

    // Create link from e1 right to e2 left
    em.createLink('l1', 'e1-anchor-right', 'e2-anchor-left', 'e1', 'e2')

    const initialLink = em.getLink('l1')
    expect(initialLink?.sourceAnchorId).toBe('e1-anchor-right')
    expect(initialLink?.targetAnchorId).toBe('e2-anchor-left')

    // Move e2 directly below e1
    em.moveEntity('e2', { x: 0, y: 300 })

    // Auto route links
    autoRouteLinks(em)

    const updatedLink = em.getLink('l1')
    // e1 should now connect from bottom to e2 top
    expect(updatedLink?.sourceAnchorId).toBe('e1-anchor-bottom')
    expect(updatedLink?.targetAnchorId).toBe('e2-anchor-top')
  })
})
