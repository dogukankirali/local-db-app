import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Row } from "reactstrap";
import CollapsibleTable from "../../TableTemp";
import { theme } from "../../../../theme/customTheme";
import React from "react";

export default function InnerTable({
  data,
  tableColumns,
  tableName,
  sortHeader,
}: TEATable.ICustomCollapseProps.Table) {

  return (
    <>
      <Box sx={{ margin: 1 }}>
        <Typography
          variant="h6"
          gutterBottom
          component="div"
          style={{ color: theme.input_text }}
        >
          {tableName}
        </Typography>
      </Box>
      <Row className="mt-2 mb-4">
        <CollapsibleTable
          tableName={tableName}
          data={data.innerTableData}
          collapsible={{
            isCollapsible: false,
          }}
          header={tableColumns}
          sortHeader={sortHeader}
          tableRerender={() => {}}
          style={{ border: "1px" }}
          selectionFilters={[]}
        />
      </Row>
    </>
  );
}
