export interface IPagination<T> {
  currentPage: number;
  totalPages: number;
  nextPage: number;
  prevPage: number;
  perPage: number;
  total: number;
  data: T[];
}

export interface PaginationParams {
  page: string;
  perPage: string;
}
