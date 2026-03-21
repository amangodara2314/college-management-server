export function buildPagination(page = 1, limit = 10, totalItems = 0) {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total: totalItems,
    totalPages,
    hasMore: page < totalPages,
    hasPrevPage: page > 1,
  };
}
