/**
 * Example: Create a complete e-commerce schema using MCP Tools
 * 
 * This demonstrates creating a fully functional schema with entities,
 * relationships, and proper layout - all via headless API calls.
 */

class McpSchemaBuilder {
  constructor(mcpClient) {
    this.mcp = mcpClient;
  }

  async createEcommerceSchema() {
    console.log('🏗️  Creating E-commerce Schema...');

    // 1. Create new schema
    const schemaResult = await this.mcp.call('atomos-structura/create-schema', {
      id: 'ecommerce-v1',
      name: 'E-commerce System Architecture'
    });
    
    await this.mcp.call('atomos-structura/activate-schema', { 
      id: 'ecommerce-v1' 
    });

    // 2. Create core entities
    const entities = await this.createEntities();
    
    // 3. Create relationships
    await this.createRelationships();
    
    // 4. Auto-layout the schema
    await this.layoutSchema();
    
    // 5. Configure menu controls
    await this.configureMenus();

    console.log('✅ E-commerce schema created successfully!');
    
    return {
      schemaId: 'ecommerce-v1',
      entities: entities.length,
      message: 'Full schema ready with auto-layout and relationships'
    };
  }

  async createEntities() {
    const entityDefinitions = [
      {
        id: 'user',
        name: 'User',
        position: { x: 50, y: 100 },
        properties: [
          { key: 'id', value: 'UUID', type: 'text' },
          { key: 'email', value: 'string', type: 'email' },
          { key: 'firstName', value: 'string', type: 'text' },
          { key: 'lastName', value: 'string', type: 'text' },
          { key: 'createdAt', value: 'DateTime', type: 'datetime' }
        ]
      },
      {
        id: 'product',
        name: 'Product',
        position: { x: 300, y: 50 },
        properties: [
          { key: 'id', value: 'UUID', type: 'text' },
          { key: 'name', value: 'string', type: 'text' },
          { key: 'description', value: 'text', type: 'textarea' },
          { key: 'price', value: 'decimal', type: 'number' },
          { key: 'stock', value: 'integer', type: 'number' },
          { key: 'categoryId', value: 'UUID', type: 'text' }
        ]
      },
      {
        id: 'order',
        name: 'Order',
        position: { x: 150, y: 250 },
        properties: [
          { key: 'id', value: 'UUID', type: 'text' },
          { key: 'userId', value: 'UUID', type: 'text' },
          { key: 'status', value: 'enum', type: 'select' },
          { key: 'total', value: 'decimal', type: 'number' },
          { key: 'orderDate', value: 'DateTime', type: 'datetime' }
        ]
      },
      {
        id: 'orderItem',
        name: 'OrderItem',
        position: { x: 400, y: 200 },
        properties: [
          { key: 'id', value: 'UUID', type: 'text' },
          { key: 'orderId', value: 'UUID', type: 'text' },
          { key: 'productId', value: 'UUID', type: 'text' },
          { key: 'quantity', value: 'integer', type: 'number' },
          { key: 'unitPrice', value: 'decimal', type: 'number' }
        ]
      },
      {
        id: 'category',
        name: 'Category',
        position: { x: 550, y: 50 },
        properties: [
          { key: 'id', value: 'UUID', type: 'text' },
          { key: 'name', value: 'string', type: 'text' },
          { key: 'description', value: 'text', type: 'textarea' },
          { key: 'parentId', value: 'UUID?', type: 'text' }
        ]
      }
    ];

    const createdEntities = [];
    for (const entityDef of entityDefinitions) {
      const result = await this.mcp.call('atomos-structura/create-entity', {
        ...entityDef,
        dimensions: { width: 140, height: 100 },
        edges: []
      });
      
      if (result.success) {
        createdEntities.push(entityDef.id);
        console.log(`  ✓ Created entity: ${entityDef.name}`);
      }
    }
    
    return createdEntities;
  }

  async createRelationships() {
    const relationships = [
      {
        id: 'user-orders',
        name: 'User → Orders',
        leftEntityId: 'user',
        rightEntityId: 'order',
        leftCardinality: '1',
        rightCardinality: '*',
        renderType: 'bezier',
        leftAnchorId: 'right',
        rightAnchorId: 'left'
      },
      {
        id: 'order-items',
        name: 'Order → Items',
        leftEntityId: 'order', 
        rightEntityId: 'orderItem',
        leftCardinality: '1',
        rightCardinality: '*',
        renderType: 'bezier',
        leftAnchorId: 'right',
        rightAnchorId: 'left'
      },
      {
        id: 'product-orderitems',
        name: 'Product → OrderItems',
        leftEntityId: 'product',
        rightEntityId: 'orderItem', 
        leftCardinality: '1',
        rightCardinality: '*',
        renderType: 'bezier',
        leftAnchorId: 'bottom',
        rightAnchorId: 'top'
      },
      {
        id: 'category-products',
        name: 'Category → Products',
        leftEntityId: 'category',
        rightEntityId: 'product',
        leftCardinality: '1', 
        rightCardinality: '*',
        renderType: 'bezier',
        leftAnchorId: 'left',
        rightAnchorId: 'right'
      },
      {
        id: 'category-subcategories',
        name: 'Category → Subcategories', 
        leftEntityId: 'category',
        rightEntityId: 'category',
        leftCardinality: '1',
        rightCardinality: '*',
        renderType: 'bezier',
        leftAnchorId: 'bottom',
        rightAnchorId: 'top'
      }
    ];

    for (const rel of relationships) {
      await this.mcp.call('atomos-structura/create-link', rel);
      console.log(`  ✓ Created relationship: ${rel.name}`);
    }
  }

  async layoutSchema() {
    console.log('🎨 Auto-layouting schema...');
    
    // Center all entities on screen
    await this.mcp.call('atomos-structura/viewport/center', {
      width: 1200,
      height: 800
    });
    
    // Fit everything to screen with padding
    await this.mcp.call('atomos-structura/viewport/fit-to-screen', {
      width: 1200,
      height: 800, 
      padding: 100
    });
    
    console.log('  ✓ Schema layout optimized');
  }

  async configureMenus() {
    console.log('⚙️  Configuring menu controls...');
    
    // Enable all menu options for full control
    await this.mcp.call('atomos-structura/sync-state', {
      entities: [], // Don't override entities
      links: [],   // Don't override links
      menu_config: {
        zoom: { available: true, value: 1.0 },
        zoom_in: { available: true },
        zoom_out: { available: true },
        center_on_screen: { available: true },
        fit_to_screen: { available: true },
        auto_layout: { available: true },
        optimize_connections: { available: true },
        export: { available: true },
        import: { available: true },
        save_workspace: { available: true },
        load_workspace: { available: true },
        export_svg: { available: true }
      }
    });
    
    console.log('  ✓ Menu controls configured');
  }

  // Helper: Save complete workspace
  async saveWorkspace() {
    const result = await this.mcp.call('atomos-structura/get-workspace', {});
    return result.workspace;
  }

  // Helper: Get schema statistics  
  async getSchemaStats() {
    const schema = await this.mcp.call('atomos-structura/get-schema', {});
    const viewport = await this.mcp.call('atomos-structura/viewport/get', {});
    
    return {
      entities: schema.schema.entities.length,
      relationships: schema.schema.links.length,
      viewport: viewport.viewport,
      timestamp: new Date().toISOString()
    };
  }
}

// Usage Example
export default McpSchemaBuilder;

// Example instantiation:
/* 
const builder = new McpSchemaBuilder(mcpClient);
const result = await builder.createEcommerceSchema();
console.log('Schema created:', result);

// Get final stats
const stats = await builder.getSchemaStats();
console.log('Final schema:', stats);
*/