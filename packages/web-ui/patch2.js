const fs = require('fs');
const file = 'packages/web-ui/src/core/create-link-finalizer.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
/const linkId = optionalLinkId \|\| \link-\\\$\{srcAnchorId\}-\\\$\{dstAnchorId\}-\\\$\{Date\.now\(\)\}\;[\s\S]*?strokeColor: '#3b82f6',\s*strokeWidth: 2\s*\}\);/,
\const linkId = optionalLinkId || \\\link-\\\-\\\-\\\\\\;

    const permanentLink = linkManager.createLink({
      id: linkId,
      sourceAnchorId: srcAnchorId,
      targetAnchorId: dstAnchorId,
      sourcePosition: srcPos,
      targetPosition: dstAnchorPos,
      sourceEdge: srcEdge,
      targetEdge: dstEdge,
      strokeColor: '#3b82f6',
      strokeWidth: 2
    });\
);
fs.writeFileSync(file, content, 'utf8');
