export const applyFiltering = <T>(
  data: T[],
  filters: Record<string, string>
): T[] => {
  let result = [...data];

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

  return result;
};
