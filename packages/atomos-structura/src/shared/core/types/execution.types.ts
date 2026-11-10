export type ExecutionStatus = 'idle' | 'running' | 'success' | 'warning' | 'failed';

export interface EntityExecutionState {
  readonly status?: ExecutionStatus;
  readonly progress?: number;
  readonly message?: string;
}

export type LinkAnimationType = 'flow' | 'pulse' | 'dash';

export interface LinkExecutionState {
  readonly active?: boolean;
  readonly animationType?: LinkAnimationType;
  readonly color?: string;
  readonly duration?: string; // e.g. "1.5s"
  readonly speed?: number; // multiplier
}
