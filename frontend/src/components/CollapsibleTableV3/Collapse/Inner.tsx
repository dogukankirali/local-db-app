import { Box, Divider } from "@mui/material";
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
  listType,
}: TEATable.ICustomCollapseProps.Inner) {
  const show = InnerMap[type];

  return (
    <Box>
      {show.list && (
        <InnerList
          data={data}
          list={list}
          type={listType!}
          wIcons={show.list.icon}
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
