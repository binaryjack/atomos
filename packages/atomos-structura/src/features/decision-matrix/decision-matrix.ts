import type { DecisionMatrixCriterion, DecisionMatrixOption } from './decision-matrix.types.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
    }
    .toolbar {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid var(--border-color, #ccc);
      padding: 0.5rem;
      text-align: left;
    }
    .score {
      font-weight: bold;
    }
  </style>
  <div class="toolbar">
    <button id="add-option">Add Option</button>
    <button id="add-criterion">Add Criterion</button>
  </div>
  <table>
    <thead></thead>
    <tbody></tbody>
    <tfoot></tfoot>
  </table>
`;

export class DecisionMatrix extends HTMLElement {
  #criteria: DecisionMatrixCriterion[] = [];
  #options: DecisionMatrixOption[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  get criteria(): DecisionMatrixCriterion[] {
    return this.#criteria;
  }

  set criteria(val: DecisionMatrixCriterion[]) {
    this.#criteria = val;
    this.render();
  }

  get options(): DecisionMatrixOption[] {
    return this.#options;
  }

  set options(val: DecisionMatrixOption[]) {
    this.#options = val;
    this.render();
  }

  connectedCallback() {
    this.shadowRoot!.getElementById('add-option')?.addEventListener('click', this.onAddOption);
    this.shadowRoot!.getElementById('add-criterion')?.addEventListener('click', this.onAddCriterion);
    this.render();
  }

  disconnectedCallback() {
    this.shadowRoot!.getElementById('add-option')?.removeEventListener('click', this.onAddOption);
    this.shadowRoot!.getElementById('add-criterion')?.removeEventListener('click', this.onAddCriterion);
  }

  private onAddOption = () => {
    const newId = `opt_${Date.now()}`;
    this.#options.push({
      id: newId,
      name: `New Option ${this.#options.length + 1}`,
      scores: {}
    });
    this.notify();
    this.render();
  };

  private onAddCriterion = () => {
    const newId = `crit_${Date.now()}`;
    this.#criteria.push({
      id: newId,
      name: `New Criterion ${this.#criteria.length + 1}`,
      weight: 1
    });
    this.notify();
    this.render();
  };

  private notify() {
    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        criteria: this.#criteria,
        options: this.#options
      }
    }));
  }

  private render() {
    const thead = this.shadowRoot!.querySelector('thead')!;
    const tbody = this.shadowRoot!.querySelector('tbody')!;
    const tfoot = this.shadowRoot!.querySelector('tfoot')!;

    thead.innerHTML = '';
    tbody.innerHTML = '';
    tfoot.innerHTML = '';

    const trHead = document.createElement('tr');
    trHead.innerHTML = '<th>Option</th>';
    this.#criteria.forEach(c => {
      const th = document.createElement('th');
      th.textContent = `${c.name} (w: ${c.weight})`;
      trHead.appendChild(th);
    });
    const thScore = document.createElement('th');
    thScore.textContent = 'Score';
    trHead.appendChild(thScore);
    thead.appendChild(trHead);

    this.#options.forEach(opt => {
      const tr = document.createElement('tr');
      const tdName = document.createElement('td');
      tdName.textContent = opt.name;
      tr.appendChild(tdName);
      
      let sum = 0;
      this.#criteria.forEach(c => {
        const score = opt.scores[c.id] || 0;
        sum += score * c.weight;
        const tdScore = document.createElement('td');
        tdScore.textContent = score.toString();
        tr.appendChild(tdScore);
      });
      const tdSum = document.createElement('td');
      tdSum.className = 'score';
      tdSum.textContent = sum.toString();
      tr.appendChild(tdSum);
      tbody.appendChild(tr);
    });
  }
}

if (!customElements.get('atp-decision-matrix')) {
  customElements.define('atp-decision-matrix', DecisionMatrix);
}
