import type { ToolboxConfiguration } from '../types/toolbox.types.js';

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
    }
  ]
};
