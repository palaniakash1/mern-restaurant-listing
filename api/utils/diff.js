const normalize = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
};

export const diffObject = (before = {}, after = {}, fields = []) => {
  const diff = {};

  for (const field of fields) {
    const beforeValue = normalize(before[field]);
    const afterValue = normalize(after[field]);

    if (beforeValue !== afterValue) {
      diff[field] = {
        before: before[field] ?? null,
        after: after[field] ?? null,
      };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
};
