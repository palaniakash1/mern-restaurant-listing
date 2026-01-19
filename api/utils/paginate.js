export const paginate = ({ page = 1, limit = 10, total }) => {
  page = Number(Math.max(parseInt(page), 1));
  limit = Number(Math.max(parseInt(limit), 50));

  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    skip: (page - 1) * limit,
  };
};
