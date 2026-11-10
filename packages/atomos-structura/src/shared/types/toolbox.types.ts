import type { Property } from '@atomos-web/structura-core';

export interface ToolboxItem {
  id: string;
  name: string;      
  shape: string;     
  baseColor: string; 
  description?: string; 
  icon: string;      
  action?: string;   
  properties?: Property[];
}

export interface Toolset {
  name: string;
  icon: string;
  tools: ToolboxItem[];
}

export interface ToolboxConfiguration {
  toolsets: Toolset[];
}
