declare namespace TEAData {
    export type WPagination<T> = {
      cID?: string;
      platform?: string;
      data: T[];
      pagination: IPagination;
    };
    type IPagination = {
      currentPage: number;
      totalPageCount: number;
      itemCount: number;
      totalItemCount: number;
      itemsPerPage: number;
    };
    type PaginationDataParams = {
      page: number;
      count: number;
    };
    type TableDataParamsWOrder = PaginationDataParams & {
      order?: "asc" | "desc" | undefined;
      orderBy?: string;
    };
    type DataFilterType = {
      key: string;
      value: string | string[];
    };
    type FilterBody = {
      filterArray: DataFilterType[];
    };
  
    type ValidFilterTypes = string | string[] | number | number[] | boolean;
    type DataFilterGeneric<T extends string, K extends ValidFilterTypes> = {
      key: T;
      value: K;
    };
  
    type GenericFilterBuilder<T extends string, K extends ValidFilterTypes> = [
      T,
      K
    ];
  
    type FilterBodyGeneric<
      GenericArr extends GenericFilterBuilder<string, ValidFilterTypes>[]
    > = {
      filterArray: {
        [P in keyof GenericArr]?: DataFilterGeneric<
          GenericArr[P][0],
          GenericArr[P][1]
        >;
      };
    };
    // Usage: FilterBodyGeneric<[["name", string], ["value", number], ["cIDs",string[]]]>
  
    type DataStatus = "empty" | "loading" | "error" | "done";
  
    type AsyncData<T> =
      | {
          status: "empty" | "loading" | "error";
          data?: never;
        }
      | {
          status: "done";
          data: T;
        };
  
    type AsyncDataGeneric<T extends Record<string, unknown>> =
      | ({
          status: "empty" | "loading" | "error";
        } & {
          [P in keyof T]?: never;
        })
      | ({
          status: "done";
        } & T);
  }