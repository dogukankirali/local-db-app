import { useCallback, useEffect, useState } from "react";

type UsePaginationReturn<T> = {
  data: T[];
  pagination: TEAData.IPagination;
};

export const useFrontendPagination = <T>(
  data: T[],
  params: Partial<Pick<TEATable.FetchDataParams, "count" | "page">>
): UsePaginationReturn<T> => {
  const calculatePagination = useCallback(
    (
      data: T[],
      params: Partial<Pick<TEATable.FetchDataParams, "count" | "page">>
    ): UsePaginationReturn<T> => {
      const { count = 10, page = 1 } = params;
      if (!data)
        return {
          data: [],
          pagination: {
            itemCount: 0,
            currentPage: page,
            totalItemCount: 0,
            itemsPerPage: count,
            totalPageCount: 0,
          },
        };
      const totalItemCount = data.length;
      const totalPageCount = Math.ceil(totalItemCount / count);
      const currentPage = Math.min(page, totalPageCount);
      const paginatedData = data.slice(
        (currentPage - 1) * count,
        (currentPage - 1) * count + count
      );
      return {
        data: paginatedData,
        pagination: {
          itemCount: paginatedData.length,
          currentPage,
          totalItemCount,
          itemsPerPage: count,
          totalPageCount,
        },
      };
    },
    []
  );

  const [state, setState] = useState<UsePaginationReturn<T>>(
    calculatePagination(data, params)
  );

  useEffect(() => {
    setState(calculatePagination(data, params));
  }, [data, params, calculatePagination]);

  return state;
};

export const useTablePagination = <T>(data?: T[]) => {
  const [localData, setLocalData] = useState<T[]>(data ?? ([] as T[]));
  const [pagination, setPagination] = useState<
    Partial<Pick<TEATable.FetchDataParams, "count" | "page">>
  >({
    page: 1,
    count: 10,
  });
  const paginatedData = useFrontendPagination(localData, pagination);

  const getData = useCallback((params: TEATable.FetchDataParams) => {
    setPagination(params);
  }, []);

  const setInitialData = useCallback((data: T[]) => {
    setLocalData(data);
    setPagination({
      page: 1,
      count: 10,
    });
  }, []);

  return {
    data: paginatedData,
    getData,
    setInitialData,
  };
};
