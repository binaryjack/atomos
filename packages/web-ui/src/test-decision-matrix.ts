import { createDecisionMatrix, DecisionMatrixCriterion, DecisionMatrixOption } from './features/decision-matrix/create-decision-matrix.js';

const app = document.getElementById('app');

const initialCriteria: DecisionMatrixCriterion[] = [
  { id: 'cost', name: 'Cost', weight: 4 },
  { id: 'time', name: 'Time to Market', weight: 5 },
  { id: 'quality', name: 'Quality', weight: 3 },
];

const initialOptions: DecisionMatrixOption[] = [
  { id: 'opt1', name: 'In-house Development', scores: { cost: 4, time: 2, quality: 8 } },
  { id: 'opt2', name: 'Outsource Agency', scores: { cost: 2, time: 7, quality: 6 } },
  { id: 'opt3', name: 'Off-the-shelf Software', scores: { cost: 9, time: 9, quality: 3 } },
];

if (app) {
  const title = document.createElement('h1');
  title.className = 'text-2xl font-bold mb-6 text-purple-400';
  title.textContent = 'Vendor Evaluation Matrix';
  app.appendChild(title);

  const matrix = createDecisionMatrix({
    criteria: initialCriteria,
    options: initialOptions,
    onChange: (c, o) => {
      console.log('Matrix updated!', { criteria: c, options: o });
    }
  });

  app.appendChild(matrix.element);
}
