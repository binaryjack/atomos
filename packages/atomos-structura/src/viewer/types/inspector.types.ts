export type EntityInspectorStatus = 'not_started' | 'in_progress' | 'success' | 'error' | 'pending';

export type TaskIntention = 'CreateFile' | 'ModifyFile' | 'DeleteFile';

export interface LoraSpecializationData {
  /** Safetensors adapter name (e.g. "csharp_wpf_mvvm_v1.safetensors") */
  adapterName: string;
  /** Specialty domain (e.g. "C# .NET 9 WPF MVVM & XAML") */
  specialtyDomain?: string;
  /** True => Green badge "VRAM Resident", False => Cyan badge "JIT Auto-Trained" */
  isVramResident: boolean;
  /** Rank dimension (e.g. 16) */
  rank?: number;
  /** Alpha scaling parameter (e.g. 32) */
  alpha?: number;
  /** Swap latency in microseconds */
  swapLatencyUs?: number;
}

export interface TaskDescriptionData {
  /** Detailed description of the task being performed by the agent */
  description: string;
  /** File path targeted by this entity operation */
  filePath?: string;
  /** Intent of operation */
  intention?: TaskIntention;
  /** Hints or prompt instructions */
  hints?: string;
}

export interface VirtualRamStagedFile {
  /** Relative path of the staged file (e.g. "src/ViewModels/MainViewModel.cs") */
  relativePath: string;
  /** Size in bytes */
  sizeBytes: number;
  /** Full content of the staged file */
  content: string;
  /** Language identifier (e.g. "csharp", "typescript", "json", "xml") */
  language?: string;
}

export interface StructuraEntityInspectorData {
  /** Target Entity ID */
  entityId: string;
  /** Display Title of the entity */
  title: string;
  /** Role description (e.g. "Architect Specialist", "Compiler Engine") */
  role?: string;
  /** Execution status */
  status: EntityInspectorStatus;
  /** Duration of execution in milliseconds */
  executionDurationMs?: number;

  /** LoRA adapter & agent specialization details */
  lora?: LoraSpecializationData;

  /** Task description & file operation intention */
  task?: TaskDescriptionData;

  /** Staged files residing in Virtual RAM */
  stagedFiles?: VirtualRamStagedFile[];

  /** Real-time thinking / reasoning log stream */
  thinkingLog?: string;

  /** Error message if status is 'error' */
  error?: string;
}
