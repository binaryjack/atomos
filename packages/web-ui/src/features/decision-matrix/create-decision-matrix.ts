import { createModularTable } from '../modular-table/create-modular-table.js';
import type { ColumnDef } from '../modular-table/types/modular-table.types.js';
import { createButton } from '../button/create-button.js';

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

export function createDecisionMatrix(props: DecisionMatrixProps) {
  const container = document.createElement('div');
  container.className = 'flex flex-col gap-4';
  
  let currentOptions = [...props.options];
  let currentCriteria = [...props.criteria];

  // Header Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'flex items-center gap-4 bg-slate-900 p-2 rounded-md border border-slate-800';

  const addOptionBtn = createButton({
    children: '+ Add Option (Row)',
    variant: 'primary', size: 'sm',
    onClick: () => {
      const newId = `opt_${Date.now()}`;
      currentOptions.push({
        id: newId,
        name: `New Option ${currentOptions.length + 1}`,
        scores: {}
      });
      syncTable();
    }
  });

  const addCriterionBtn = createButton({
    children: '+ Add Criterion (Column)',
    variant: 'secondary', size: 'sm',
    onClick: () => {
      const newId = `crit_${Date.now()}`;
      currentCriteria.push({
        id: newId,
        name: `New Criterion ${currentCriteria.length + 1}`,
        weight: 1
      });
      syncTable();
    }
  });

  toolbar.appendChild(addOptionBtn.element);
  toolbar.appendChild(addCriterionBtn.element);
  container.appendChild(toolbar);

  // Derive Table Data
  const mapData = () => {
    return currentOptions.map(opt => {
      const row: any = { id: opt.id, optionName: opt.name };
      currentCriteria.forEach(c => {
        row[c.id] = opt.scores[c.id] || 0;
      });
      return row;
    });
  };

  // Derive Columns
  const mapColumns = (): ColumnDef[] => {
    const cols: ColumnDef[] = [
      { id: 'optionName', header: 'Option', sortable: true, filterable: true, editable: true, type: 'text' }
    ];
    
    currentCriteria.forEach(c => {
      cols.push({
        id: c.id,
        header: `${c.name} (w: ${c.weight})`,
        sortable: true,
        editable: true,
        type: 'number'
      });
    });
    
    // Total column
    cols.push({
      id: '_total',
      header: 'Score',
      sortable: true,
      editable: false,
      type: 'number',
      renderCell: (val: any, row: any) => {
        const span = document.createElement('span');
        span.className = 'font-bold text-emerald-400';
        const score = currentCriteria.reduce((sum, c) => {
          return sum + ((row[c.id] || 0) * c.weight);
        }, 0);
        span.textContent = score.toString();
        return span;
      }
    });

    return cols;
  };

  // Build Footer
  const mapFooter = () => {
    const footerRow: any = { id: 'footer', optionName: 'Max Possible' };
    let totalMax = 0;
    currentCriteria.forEach(c => {
      const maxScore = 10; // assuming scale 1-10
      footerRow[c.id] = `Max: ${maxScore}`;
      totalMax += maxScore * c.weight;
    });
    footerRow._total = totalMax.toString();
    return [footerRow];
  };

  const notifyChange = () => {
    if (props.onChange) {
      props.onChange(currentCriteria, currentOptions);
    }
  };

  const handleDataChange = (newData: any[]) => {
    currentOptions = newData.map(row => {
      const scores: Record<string, number> = {};
      currentCriteria.forEach(c => {
        scores[c.id] = Number(row[c.id]) || 0;
      });
      return {
        id: row.id,
        name: row.optionName,
        scores
      };
    });
    
    tableInstance.updateData(mapData());
    tableInstance.updateFooterData(mapFooter());
    notifyChange();
  };

  let tableInstance = createModularTable({
    columns: mapColumns(),
    data: mapData(),
    footerData: mapFooter(),
    onDataChange: handleDataChange,
    fixedHeader: true
  });

  const syncTable = () => {
    tableInstance.updateColumns(mapColumns());
    tableInstance.updateData(mapData());
    tableInstance.updateFooterData(mapFooter());
    notifyChange();
  };

  container.appendChild(tableInstance.element);
  
  return {
    element: container,
    tableInstance,
    updateState: (newCriteria: DecisionMatrixCriterion[], newOptions: DecisionMatrixOption[]) => {
      currentCriteria = [...newCriteria];
      currentOptions = [...newOptions];
      syncTable();
    }
  };
}
