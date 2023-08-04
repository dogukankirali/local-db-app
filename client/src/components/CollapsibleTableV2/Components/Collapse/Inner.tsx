import { Box, Divider } from "@mui/material";
import React from "react";
import InnerList from "./NewInnerList";
import InnerTable from "./InnerTable";
import { InnerMap } from "./Common";

export default function Inner({
  type,
  data,
  list,
  onUpdate,
  tableColumns,
  sortHeader,
  tableName,
  listType
}: TEATable.ICustomCollapseProps.Inner) {
  const show = InnerMap[type];
  
  return (
    <Box>
      {show.list && (
        <InnerList
          data={data}
          list={list}
          type={listType!}
          onUpdate={onUpdate}
          wIcons={show.list.icon}
          setDataState={() => {}}
        />
      )}
      {show.table && tableColumns && (
        <>
          <Divider />
          <InnerTable
            data={data}
            tableColumns={tableColumns}
            tableName={tableName ?? "innerTable"}
            sortHeader={sortHeader}
          />
        </>
      )}
    </Box>
  );
}
