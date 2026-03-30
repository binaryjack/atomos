const fs = require('fs');
const file = 'packages/web-ui/src/core/infrastructure/entity-repository.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
/return \{\s*id: link.id,\s*sourceAnchorId: link.leftAnchorId \|\| 'center',\s*targetAnchorId: link.rightAnchorId \|\| 'center',\s*sourceEntityId: link.leftEntityId,\s*targetEntityId: link.rightEntityId,\s*createdAt: Date.now\(\),\s*updatedAt: Date.now\(\)\s*\};/g,
\eturn {
      id: link.id,
      sourceAnchorId: link.leftAnchorId || 'center',
      targetAnchorId: link.rightAnchorId || 'center',
      sourceEntityId: link.leftEntityId,
      targetEntityId: link.rightEntityId,
      sourceCardinality: link.leftCardinality,
      targetCardinality: link.rightCardinality,
      sourceProperty: link.leftProperty,
      targetProperty: link.rightProperty,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };\
);

content = content.replace(
/store\.dispatch\(\{\s*type: 'link-created',\s*schema_id: SCHEMA_ID,\s*link_id: link\.id,\s*from_id: link\.sourceEntityId,\s*to_id: link\.targetEntityId,\s*from_anchor: link\.sourceAnchorId,\s*to_anchor: link\.targetAnchorId\s*\}\);/,
\const state = store.get_state();
    const schema = state.schemas[SCHEMA_ID];
    const exists = schema?.links.some((l: any) => l.id === link.id);
    if (!exists) {
      store.dispatch({
        type: 'link-created',
        schema_id: SCHEMA_ID,
        link_id: link.id,
        from_id: link.sourceEntityId,
        to_id: link.targetEntityId,
        from_anchor: link.sourceAnchorId,
        to_anchor: link.targetAnchorId,
        leftCardinality: link.sourceCardinality,
        rightCardinality: link.targetCardinality,
        leftProperty: link.sourceProperty,
        rightProperty: link.targetProperty
      });
    } else {
      store.dispatch({
        type: 'link-updated',
        schema_id: SCHEMA_ID,
        link: {
          id: link.id,
          leftEntityId: link.sourceEntityId,
          rightEntityId: link.targetEntityId,
          leftAnchorId: link.sourceAnchorId,
          rightAnchorId: link.targetAnchorId,
          leftCardinality: link.sourceCardinality as any,
          rightCardinality: link.targetCardinality as any,
          leftProperty: link.sourceProperty,
          rightProperty: link.targetProperty,
          renderType: 'linear'
        } as any
      });
    }\
);

fs.writeFileSync(file, content, 'utf8');
