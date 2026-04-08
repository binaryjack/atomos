import type { ExportPlugin } from '../export-plugin.types.js';

const mermaidCardinality = (isMany: boolean, isOptional = false): string => {
  if (isMany) return isOptional ? 'o{' : '|{';
  return isOptional ? 'o|' : '||';
};

export const mermaidPlugin: ExportPlugin = {
  id: 'mermaid',
  label: 'Mermaid ER Diagram',
  description: 'Mermaid.js erDiagram notation. Paste into any Mermaid renderer (GitHub, Notion, VS Code extension, etc.).',
  fileExtension: 'md',
  mimeType: 'text/plain',
  generate: snapshot => {
    const lines: string[] = ['```mermaid', 'erDiagram'];

    Object.values(snapshot.entities).forEach(entity => {
      lines.push(`  ${entity.name} {`);
      (entity.properties ?? []).forEach(prop => {
        const t = (prop.dataType ?? 'string').replace(/[^a-zA-Z0-9_-]/g, '_');
        lines.push(`    ${t} ${prop.key}`);
      });
      lines.push('  }');
    });

    Object.values(snapshot.links).forEach(link => {
      const left  = snapshot.entities[link.leftEntityId];
      const right = snapshot.entities[link.rightEntityId];
      if (!left || !right) return;

      const isLeftMany  = link.leftCardinality  === '*' || link.leftCardinality  === '1..*';
      const isRightMany = link.rightCardinality === '*' || link.rightCardinality === '1..*';
      const leftOpt  = link.leftCardinality  === '0..1';
      const rightOpt = link.rightCardinality === '0..1';

      const leftSide  = mermaidCardinality(isLeftMany,  leftOpt);
      const rightSide = mermaidCardinality(isRightMany, rightOpt);

      lines.push(`  ${left.name} ${leftSide}--${rightSide} ${right.name} : ""`);
    });

    lines.push('```');
    return lines.join('\n');
  },
};
