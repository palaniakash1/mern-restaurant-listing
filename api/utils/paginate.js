export const paginate = ({ page = 1, limit = 10, total }) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);

  const safeLimit = Math.min(
    Math.max(parseInt(limit, 10) || 10, 1),
    50, // hard cap to protect DB
  );

  const totalPages = Math.ceil(total / safeLimit);

  return {
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
    skip: (safePage - 1) * safeLimit,
  };
};
