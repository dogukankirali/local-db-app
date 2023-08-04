import React, { useEffect } from "react";
import TableTemp from "./TableTemp";
import { useTablePagination } from "./Utils/TableUtils";

export default function TableLocal<T extends {}>({
  data,
  ...props
}: TEATable.TableLocalProps<T>) {
  const {
    data: tableData,
    getData,
    setInitialData,
  } = useTablePagination<T>(data);

  useEffect(() => {
    setInitialData(data);
  }, [data, setInitialData]);

  const tableRerender = (params: TEATable.FetchDataParams) => {
    getData(params);
  };

  return (
    <TableTemp data={tableData} tableRerender={tableRerender} {...props} />
  );
}
