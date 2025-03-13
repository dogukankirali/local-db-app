declare namespace TEATable {
  type ColumnTypes =
    | "string"
    | "number"
    | "timestamp"
    | "boolean"
    | "tv-movie"
    | "selection"
    | "button"
    | "uptime"
    | "blank"
    | "function"
    | "base64"
    | "link"
    | "pill"
    | "score"
    | "episode"
    | "status"
    | "node";
  type InnerTypes =
    | "table"
    | "tableList"
    | "tableListWithIcons"
    | "list"
    | "listWithIcons";
  export interface IColumnItem {
    key:
      | string
      | ((id: string, i: number, data?: any) => JSX.Element)
      | React.FC<{ data: any }>;
    value: string;
    type: ColumnTypes;
    width?: string;
    ref?: any;
  }

  export interface IAnime {
    ID: number;
    Name: string;
    AnimeStatus: string;
    WatchStatus: string;
    TotalNumberOfEpisodes: string;
    IsMovie: boolean;
    Genre: string[];
    Score: string;
    MALScore: number;
    Notes: string;
    AnimeLink: string;
    MALAnimeLink: string;
    Cover: string;
    SeriesID?: number;
  }

  export interface IAnimeDetail {
    ID: number;
    Name: string;
    AnimeStatus: string;
    WatchStatus: string;
    TotalNumberOfEpisodes: string;
    IsMovie: boolean;
    Genre: string;
    Score: string;
    MALScore: number;
    Notes: string;
    AnimeLink: string;
    MALAnimeLink: string;
    Cover: string;
    SeriesID?: number;
  }

  export interface IColumnItems extends Array<IColumnItem> {}

  type NumberFilterType = {
    key: string;
    value: number | null;
    operand: ">" | "<" | "=";
  };

  type StringFilterType = {
    key: string;
    value: string | string[];
    operand?: never;
  };

  type IFilterType = StringFilterType | NumberFilterType;

  interface IFilterTypes extends Array<IFilterType> {}

  export interface ITableProps {
    tableName?: string;
    header: IColumnItems;
    data: any | undefined; // * type yazılacak
    collapsible: {
      isCollapsible: boolean;
      inner?: {
        type?: InnerTypes;
        table?: any; // * type yazılacak
        tableColumns?: any; // * type yazılacak
        sortHeader?: SetStateAction<any[]>;
        tableName?: string;
        list?: any;
        listWithIcons?: any; // * type yazılacak
        tableList?: any; // * type yazılacak
        tableListWithIcons?: any; // * type yazılacak
      };
    };
    sortHeader?: SetStateAction<IColumnItems>;
    style?: CSSProperties;
    selectionFilters?: {
      key: string;
      selections: ISelectDataProvider | string;
      itemKey: string;
    }[];
    tableRerender: (
      orderParam: Order,
      orderByParam: string,
      filterArray: IFilterTypes,
      rowsPerPage: string | number,
      page: number
    ) => void;
    updateInnerCard?: OnInnerUpdate;
  }

  type OptimisticUpdate<T = any> = (data: T) => void;

  type ITableCollapse<T = any> = {
    isCollapsible: boolean;
    size?: import("@mui/material").Breakpoint | "fullscreen";
    inner?: {
      type?: InnerTypes;
      table?: any; // * type yazılacak
      tableColumns?: any; // * type yazılacak
      sortHeader?: SetStateAction<any[]>;
      tableName?: string;
      list?: any;
      listWithIcons?: any; // * type yazılacak
      tableList?: any; // * type yazılacak
      tableListWithIcons?: any; // * type yazılacak,
      listType?: string;
    };
    innerComponent?:
      | React.FC<{ data: T; update: OptimisticUpdate }>
      | React.FC<{ data: T; update?: OptimisticUpdate }>;
  };

  type DownloadFileType = "csv" | "pdf" | "xlsx";

  type UseTableSettings = (opts?: { extend?: boolean }) => {
    rowsPerPage: number;
    setRowsPerPage: React.Dispatch<React.SetStateAction<number>>;
    anchorElSettings: HTMLButtonElement | null;
    setAnchorElSettings: React.Dispatch<
      React.SetStateAction<HTMLButtonElement | null>
    >;
    handleClickSettings: (event: React.MouseEvent<HTMLButtonElement>) => void;
    extendTable?: boolean;
    setExtendTable?: React.Dispatch<React.SetStateAction<boolean>>;
  };

  type TableSettingsProps = Omit<
    ReturnType<UseTableSettings>,
    "handleClickSettings"
  > & {
    headerOpts: IColumnItems;
    headers: IColumnItems;
    setHeaders: React.Dispatch<React.SetStateAction<IColumnItems>>;
  };

  type TableFilterProps = {
    //TODO move table filters type to here
  };

  type FetchDataParams = {
    order?: Order;
    orderBy?: string;
    abortController?: AbortController;
    filters?: IFilterType[];
    count: number;
    page: number;
  };

  type FetchData = (params: FetchDataParams) => void;

  export type IColumnItemsGeneric<T> = {
    key:
      | (keyof T extends string ? keyof T : never)
      | ((e: string, i: number, data?: T) => JSX.Element);
    value: string;
    type: ColumnTypes;
    width?: string;
    ref?: any;
  }[];

  type OnInnerUpdate = (
    key: string,
    value: string | number | boolean,
    type: string | null
  ) => Promise<boolean | null>;

  export interface INewTableProps<T> {
    tableName: string;
    data: TEAData.WPagination<T> | undefined;
    setData?: React.Dispatch<React.SetStateAction<TEAData.WPagination<T>>>;
    header: IColumnItems;
    sortHeader?: React.Dispatch<React.SetStateAction<TEATable.IColumnItems>>;
    collapsible: ITableCollapse<T>;
    style?: any;
    selectionFilters?: IFilterType[];
    setSelectionFilters?: any;
    tableRerender: FetchData;
    loading?: boolean;
    rowsPerPage?: number;
    updateInnerCard?: OnInnerUpdate;
    isInnerTable?: boolean;
    extendedTable?: boolean;
    extraDependecies?: any[];
    dimensions?: {
      width: number;
      height: number;
    };
  }

  export type TableLocalProps<T> = Omit<
    TEATable.INewTableProps<T>,
    "data" | "setData" | "tableRerender"
  > & {
    data: T[];
  };

  export type TableHeaderProps = {
    headers: IColumnItems;
    isCollapsible?: boolean;
    setHeaders?: React.Dispatch<React.SetStateAction<IColumnItems>>;
    order: Order;
    orderBy: string;
    setOrder: React.Dispatch<React.SetStateAction<Order>>;
    setOrderBy: React.Dispatch<React.SetStateAction<string>>;
    tableName: string;
  };

  type Order = "asc" | "desc" | undefined;

  interface IInnerCardItem {
    key: string;
    value: string;
    icon: any;
    type: string;
  }

  interface InnerCardUpdateItem {
    key: string;
    value: string;
  }

  interface IInnerCardItems extends Array<IInnerCardItem> {}

  interface ITable {
    data: any[];
    pagination: IPagination;
  }

  interface IListItem {
    key: any;
    value: any;
    icon?: JSX.Element;
    type?: string;
  }
  interface IList extends Array<IListItem> {}

  interface ICustomTableRowProps {
    singleData: any;
    headers: IColumnItems;
    collapsible: ITableCollapse;
    index?: number;
    updateInnerCard: (
      key: string,
      value: string,
      type: string | null
    ) => Promise<boolean | null>;
  }

  interface ICustomTableRowPropsV2<T = any> {
    singleData: T;
    headers: IColumnItems;
    collapsible: ITableCollapse<T>;
    index?: number;
    updateData: OptimisticUpdate<T>;
    updateInnerCard?: OnInnerUpdate;
    filterState?: any;
    setFilterState?: any;
  }

  namespace ICustomCollapseProps {
    interface Table {
      data: any;
      tableName: string;
      tableColumns: any;
      sortHeader?: SetStateAction<any[]>;
    }

    interface List {
      data: any;
      list: any;
      onUpdate?: any; //OnInnerUpdate;
      dataState?: IAnimeDetail;
      setDataState?: any;
      wIcons?: boolean;
    }

    interface NewList {
      data: IAnimeDetail;
      list: any;
      setData?: any;
      wIcons?: boolean;
      type: string;
    }

    interface Inner {
      type: InnerTypes;
      data: any;
      onUpdate?: OnInnerUpdate;
      list?: any;
      tableName?: string;
      tableColumns?: any;
      sortHeader?: SetStateAction<any[]>;
      listType?: string;
    }

    interface TableList {
      data: any;
      onUpdate: OnInnerUpdate;
      list: any;
      tableName: string;
      tableColumns: any;
      sortHeader?: SetStateAction<any[]>;
    }

    interface TableListWIcons {
      data: any;
      onUpdate: OnInnerUpdate;
      list: any;
      tableName: string;
      tableColumns: any;
      sortHeader?: SetStateAction<any[]>;
    }
  }
}
