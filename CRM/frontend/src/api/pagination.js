export const emptyPagination = {
  page: 1,
  page_size: 25,
  total: 0,
  total_pages: 1,
};

export const normalizePaginatedResponse = payload => {
  const data = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  const pagination = payload?.pagination || payload?.meta || emptyPagination;
  return {
    data,
    pagination: {
      ...emptyPagination,
      ...pagination,
      page: Number(pagination?.page || emptyPagination.page),
      page_size: Number(pagination?.page_size || pagination?.pageSize || emptyPagination.page_size),
      total: Number(pagination?.total || data.length),
      total_pages: Number(
        pagination?.total_pages ||
          pagination?.totalPages ||
          Math.max(1, Math.ceil((pagination?.total || data.length) / (pagination?.page_size || 25))),
      ),
    },
  };
};
