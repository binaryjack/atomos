import type { ModularTableProps, ModularTableResult, ColumnDef } from './types/modular-table.types.js';

export const createModularTable = function<T = any>(props: ModularTableProps<T>): ModularTableResult<T> {
  const cleanupFunctions: Array<() => void> = [];
  let currentColumns = [...props.columns];
  let rawData = [...props.data];
  let currentData = [...props.data];
  let currentFooterData = props.footerData ? [...props.footerData] : [];
  
  // Sorting State
  let sortColId: string | null = null;
  let sortAsc: boolean = true;

  // Filtering State
  const filters: Record<string, string> = {};

  const container = document.createElement('div');
  container.className = `w-full overflow-auto rounded-md border border-slate-700 bg-slate-900 ${props.className || ''}`;

  const table = document.createElement('table');
  table.className = 'w-full text-sm text-left text-slate-300';

  const thead = document.createElement('thead');
  thead.className = 'text-xs uppercase bg-slate-800 text-slate-400';
  if (props.fixedHeader) {
    thead.classList.add('sticky', 'top-0', 'z-10');
  }

  const renderHeader = () => {
    thead.innerHTML = '';
    
    // Main Headers
    const headerRow = document.createElement('tr');
    currentColumns.forEach(col => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.className = 'px-6 py-3 font-medium cursor-default align-top';
      if (col.width) th.style.width = col.width;

      const content = document.createElement('div');
      content.className = 'flex items-center gap-2 justify-between';
      
      const titleSpan = document.createElement('span');
      titleSpan.textContent = col.header;
      content.appendChild(titleSpan);

      if (col.sortable) {
        th.classList.add('hover:bg-slate-700', 'transition-colors', 'cursor-pointer');
        const sortIcon = document.createElement('span');
        sortIcon.className = 'text-slate-500 text-xs flex-shrink-0';
        
        if (sortColId === col.id) {
          sortIcon.textContent = sortAsc ? '▲' : '▼';
          sortIcon.classList.add('text-purple-400');
        } else {
          sortIcon.textContent = '↕';
        }
        content.appendChild(sortIcon);

        th.onclick = () => {
          if (sortColId === col.id) {
            if (sortAsc) sortAsc = false;
            else { sortColId = null; sortAsc = true; }
          } else {
            sortColId = col.id;
            sortAsc = true;
          }
          applyFiltersAndSort();
        };
      }

      th.appendChild(content);
      
      // Filter row
      if (col.filterable) {
        const filterWrap = document.createElement('div');
        filterWrap.className = 'mt-2';
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = 'Filter...';
        filterInput.className = 'w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs px-2 py-1 rounded focus:ring-1 focus:ring-purple-500 focus:outline-none focus:border-purple-500 transition-colors placeholder-slate-600';
        filterInput.value = filters[col.id] || '';
        
        filterInput.onclick = (e) => e.stopPropagation();
        filterInput.oninput = (e) => {
          const val = (e.target as HTMLInputElement).value;
          filters[col.id] = val;
          applyFiltersAndSort();
        };
        
        filterWrap.appendChild(filterInput);
        th.appendChild(filterWrap);
      }

      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
  };

  const applyFiltersAndSort = () => {
    let result = [...rawData];

    // Applies filters
    Object.keys(filters).forEach(key => {
      const q = (filters[key] || '').toLowerCase().trim();
      if (q) {
        result = result.filter(row => {
          const val = (row as any)[key];
          if (val === undefined || val === null) return false;
          return String(val).toLowerCase().includes(q);
        });
      }
    });

    // Applies sorting
    if (sortColId) {
      result.sort((a, b) => {
         const valA = (a as any)[sortColId!];
         const valB = (b as any)[sortColId!];
         
         if (valA === valB) return 0;
         if (valA === undefined || valA === null) return 1;
         if (valB === undefined || valB === null) return -1;
         
         if (typeof valA === 'number' && typeof valB === 'number') {
           return sortAsc ? valA - valB : valB - valA;
         }
         return sortAsc 
           ? String(valA).localeCompare(String(valB)) 
           : String(valB).localeCompare(String(valA));
      });
    }

    currentData = result;
    renderHeader();
    renderRows();
  };

  // Body
  const tbody = document.createElement('tbody');

  // Shared cell render
  const renderCellContent = (td: HTMLElement, col: any, cellValue: any, rowIndex: number, row: any, isFooter: boolean, dataArr: any[], onChangeCb?: Function) => {
    if (col.renderCell) {
      td.appendChild(col.renderCell(cellValue, row, rowIndex));
      return;
    }

    if (col.editable) {
      if (col.type === 'boolean') {
         const input = document.createElement('input');
         input.type = 'checkbox';
         input.className = 'rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500';
         input.checked = !!cellValue;
         input.addEventListener('change', (e) => {
           const val = (e.target as HTMLInputElement).checked;
           dataArr[rowIndex] = { ...dataArr[rowIndex], [col.id]: val };
           if (onChangeCb) onChangeCb([...dataArr]);
           if(!isFooter) { rawData = [...dataArr]; } // Fix rawData sync
         });
         td.appendChild(input);
      } else if (col.type === 'enum' && col.options) {
         const select = document.createElement('select');
         select.className = 'bg-slate-800 border border-slate-600 text-slate-300 text-sm rounded focus:ring-purple-500 focus:border-purple-500 block w-full p-1';
         col.options.forEach((opt: string) => {
           const option = document.createElement('option');
           option.value = opt;
           option.textContent = opt;
           if (opt === String(cellValue)) option.selected = true;
           select.appendChild(option);
         });
         select.addEventListener('change', (e) => {
           const val = (e.target as HTMLSelectElement).value;
           dataArr[rowIndex] = { ...dataArr[rowIndex], [col.id]: val };
           if (onChangeCb) onChangeCb([...dataArr]);
           if(!isFooter) { rawData = [...dataArr]; }
         });
         td.appendChild(select);
      } else {
         const input = document.createElement('input');
         input.type = col.type === 'number' ? 'number' : 'text';
         input.value = cellValue !== undefined ? String(cellValue) : '';
         input.className = `bg-transparent border-b border-transparent hover:border-slate-600 focus:border-purple-500 focus:outline-none w-full p-1 transition-colors ${isFooter ? 'font-bold' : ''}`;
         
         input.addEventListener('change', (e) => {
           let val: any = (e.target as HTMLInputElement).value;
           if (col.type === 'number') val = Number(val);
           dataArr[rowIndex] = { ...dataArr[rowIndex], [col.id]: val };
           if (onChangeCb) onChangeCb([...dataArr]);
           if(!isFooter) { rawData = [...dataArr]; }
           applyFiltersAndSort(); // refresh to ensure data stays valid
         });
         td.appendChild(input);
      }
    } else {
       td.textContent = cellValue !== undefined ? String(cellValue) : '-';
    }
  };

  const renderRows = () => {
    tbody.innerHTML = '';

    if (currentData.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = currentColumns.length;
      emptyCell.className = 'px-6 py-8 text-center text-slate-500 italic';
      emptyCell.textContent = 'No data available';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    } else {
      currentData.forEach((row, viewIndex) => {
        const tr = document.createElement('tr');
        tr.className = 'bg-slate-900 border-b border-slate-800 hover:bg-slate-800/50 transition-colors';
        
        // Find original index for data mapping
        const rowIndex = rawData.indexOf(row);
        
        if (props.onRowClick) {
          tr.classList.add('cursor-pointer');
          tr.addEventListener('click', () => props.onRowClick!(row, rowIndex));
        }

        currentColumns.forEach(col => {
          const td = document.createElement('td');
          td.className = 'px-6 py-3 whitespace-nowrap';
          const cellValue = (row as any)[col.id];
          renderCellContent(td, col, cellValue, rowIndex, row, false, rawData, props.onDataChange);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    // Render fixed footers
    if (currentFooterData && currentFooterData.length > 0) {
      currentFooterData.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        tr.className = 'bg-slate-800 border-t-2 border-slate-700 font-semibold';
        
        currentColumns.forEach(col => {
          const td = document.createElement('td');
          td.className = 'px-6 py-3 whitespace-nowrap';
          const cellValue = (row as any)[col.id];
          renderCellContent(td, col, cellValue, rowIndex, row, true, currentFooterData, props.onFooterDataChange);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }
  };

  applyFiltersAndSort();
  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);

  return {
    element: container,
    updateData: (newData: T[]) => {
      rawData = [...newData];
      applyFiltersAndSort();
    },
    updateColumns: (newColumns: ColumnDef<T>[]) => {
      currentColumns = [...newColumns];
      renderHeader();
      renderRows();
    },
    updateFooterData: (newFooterData: T[]) => {
      currentFooterData = [...newFooterData];
      renderRows();
    },
    cleanup: {
      destroy: () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
      }
    }
  };
};
