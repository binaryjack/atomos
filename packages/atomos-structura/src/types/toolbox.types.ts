export interface ToolboxItem {
  id: string;
  name: string;      
  shape: string;     
  baseColor: string; 
  description?: string; 
  icon: string;      
  action?: string;   
  properties?: any[];
}

export interface Toolset {
  name: string;
  icon: string;
  tools: ToolboxItem[];
}

export interface ToolboxConfiguration {
  toolsets: Toolset[];
}
