import type { ColumnDef } from './types/modular-table.types.js';

export const renderCellContent = <T>(
  td: HTMLElement,
  col: ColumnDef<T>,
  cellValue: any,
  rowIndex: number,
  row: T,
  isFooter: boolean,
  dataArr: T[],
  rawData: T[],
  onChangeCb?: (data: T[]) => void,
  onRefresh?: () => void
) => {
  if (col.renderCell) {
    td.appendChild(col.renderCell(cellValue, row, rowIndex));
    return;
  }

  if (col.editable) {
    if (col.type === 'boolean') {
      const input = document.createElement('input');
      input.type = 'checkbox';
      // Modern styling
      input.className = 'w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-slate-900 transition-all cursor-pointer';
      input.checked = !!cellValue;
      input.addEventListener('change', (e) => {
        const val = (e.target as HTMLInputElement).checked;
        const newObj = { ...dataArr[rowIndex], [col.id]: val };
        dataArr[rowIndex] = newObj;
        if (onChangeCb) onChangeCb([...dataArr]);
        if (!isFooter) {
          const rawIdx = rawData.indexOf(row);
          if (rawIdx !== -1) rawData[rawIdx] = newObj;
        }
      });
      td.appendChild(input);
    } else if (col.type === 'enum' && col.options) {
      const select = document.createElement('select');
      // Modern styling
      select.className = 'bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-1.5 transition-colors cursor-pointer outline-none hover:border-slate-500';
      col.options.forEach((opt: string) => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === String(cellValue)) option.selected = true;
        select.appendChild(option);
      });
      select.addEventListener('change', (e) => {
        const val = (e.target as HTMLSelectElement).value;
        const newObj = { ...dataArr[rowIndex], [col.id]: val };
        dataArr[rowIndex] = newObj;
        if (onChangeCb) onChangeCb([...dataArr]);
        if (!isFooter) {
          const rawIdx = rawData.indexOf(row);
          if (rawIdx !== -1) rawData[rawIdx] = newObj;
        }
      });
      td.appendChild(select);
    } else {
      const input = document.createElement('input');
      input.type = col.type === 'number' ? 'number' : 'text';
      input.value = cellValue !== undefined ? String(cellValue) : '';
      // Modern styling
      input.className = \`bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-500 focus:outline-none w-full p-1.5 transition-colors text-slate-200 \${isFooter ? 'font-bold' : ''}\`;
      
      input.addEventListener('change', (e) => {
        let val: any = (e.target as HTMLInputElement).value;
        if (col.type === 'number') val = Number(val);
        const newObj = { ...dataArr[rowIndex], [col.id]: val };
        dataArr[rowIndex] = newObj;
        if (onChangeCb) onChangeCb([...dataArr]);
        if (!isFooter) {
          const rawIdx = rawData.indexOf(row);
          if (rawIdx !== -1) rawData[rawIdx] = newObj;
        }
        if (onRefresh) onRefresh();
      });
      td.appendChild(input);
    }
  } else {
    td.textContent = cellValue !== undefined ? String(cellValue) : '-';
  }
};
