export const applySorting = <T>(
  data: T[],
  sortColId: string | null,
  sortAsc: boolean
): T[] => {
  if (!sortColId) return [...data];

  return [...data].sort((a, b) => {
    const valA = (a as any)[sortColId];
    const valB = (b as any)[sortColId];

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
};
