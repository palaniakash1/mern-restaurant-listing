export const diffObject = (before, after, fields) => {
  const diff = {};

  for (const field of fields) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      diff[field] = {
        before: before[field],
        after: after[field],
      };
    }
  }

  return diff;
};
