export interface DecisionMatrixCriterion {
  id: string;
  name: string;
  weight: number;
}

export interface DecisionMatrixOption {
  id: string;
  name: string;
  scores: Record<string, number>;
}

export interface DecisionMatrixProps {
  criteria: DecisionMatrixCriterion[];
  options: DecisionMatrixOption[];
  onChange?: (criteria: DecisionMatrixCriterion[], options: DecisionMatrixOption[]) => void;
}
