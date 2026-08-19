import type { ToolboxConfiguration } from '@atomos-web/prime';
import type { CustomShape } from '../features/settings-page/types/settings-page.types.js';

export const defaultToolboxConfig: ToolboxConfiguration = {
  toolsets: [
    {
      name: 'basic',
      icon: '<rect x="4" y="6" width="16" height="12" rx="2"/>',
      tools: [
        {
          id: '1',
          name: 'Box',
          shape: 'box',
          baseColor: '#1c3557',
          icon: '<rect x="4" y="6" width="16" height="12" rx="2"/>',
          description: 'Standard Box',
          properties: []
        },
        {
          id: '2',
          name: 'Diamond',
          shape: 'diamond',
          baseColor: '#252060',
          icon: '<polygon points="12 2 22 12 12 22 2 12"/>',
          description: 'Decision Node',
          properties: []
        }
      ]
    },
    {
      name: 'shapes',
      icon: '<circle cx="12" cy="12" r="10"/>',
      tools: [
        {
          id: '3',
          name: 'Cylinder',
          shape: 'cylinder',
          baseColor: '#103b35',
          icon: '<ellipse cx="12" cy="7" rx="8" ry="3"/><path d="M4 7v10c0 1.66 3.58 3 8 3s8-1.34 8-3V7"/>',
          description: 'Database or Storage',
          properties: []
        },
        {
          id: '4',
          name: 'Actor',
          shape: 'actor',
          baseColor: '#331a5c',
          icon: '<circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
          description: 'User or System',
          properties: []
        },
        {
          id: '5',
          name: 'Note',
          shape: 'note',
          baseColor: '#3d2a0a',
          icon: '<path d="M4 4h16v12H8l-4 4V4z"/>',
          description: 'Text Annotation',
          properties: []
        }
      ]
    },
    {
      name: 'containers',
      icon: '<rect x="3" y="3" width="18" height="18" rx="3" stroke-width="2" stroke-dasharray="3 3"/>',
      tools: [
        {
          id: 'zone-vpc',
          name: 'VPC Zone',
          shape: 'zone' as any,
          baseColor: 'rgba(59, 130, 246, 0.1)',
          icon: '<rect x="3" y="3" width="18" height="18" rx="3" stroke-width="2" stroke-dasharray="3 3"/>',
          description: 'VPC / Cloud Boundary Container',
          properties: []
        },
        {
          id: 'sticky-note',
          name: 'Sticky Note',
          shape: 'sticky-note' as any,
          baseColor: '#fef08a',
          icon: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/>',
          description: 'Architecture Sticky Note & ADR',
          properties: []
        }
      ]
    }
  ]
};

export const defaultShapes: CustomShape[] = [
  { id: 'rectangle', name: 'Rectangle', svg: '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" /></svg>' },
  { id: 'circle', name: 'Circle', svg: '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><ellipse cx="50" cy="50" rx="50" ry="50" /></svg>' },
  { id: 'diamond', name: 'Diamond', svg: '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="50,0 100,50 50,100 0,50" /></svg>' },
  { id: 'oval', name: 'Oval', svg: '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><ellipse cx="50" cy="50" rx="50" ry="30" /></svg>' },
  { id: 'parallelogram', name: 'Parallelogram', svg: '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="20,0 100,0 80,100 0,100" /></svg>' },
  { id: 'chevron', name: 'Chevron', svg: '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="0,0 80,0 100,50 80,100 0,100 20,50" /></svg>' },
  { id: 'trapeze', name: 'Trapeze', svg: '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="20,0 80,0 100,100 0,100" /></svg>' }
];
