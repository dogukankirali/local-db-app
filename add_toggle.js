const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/anime/page.tsx', 'utf8');

if (!c.includes('import AnimeGrid')) {
    c = c.replace('import TableTemp from "../../components/CollapsibleTableV2/TableTemp";', 
`import TableTemp from "../../components/CollapsibleTableV2/TableTemp";
import AnimeGrid from "../../components/AnimeGrid";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";`);
}

if (!c.includes('const [viewMode, setViewMode] = useState<"table" | "grid">')) {
    c = c.replace('const [dataLoading, setDataLoading] = useState<boolean>(true);', 
`const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");`);
}

const toggleJsx = `
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, mr: 2 }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, newView) => { if (newView) setViewMode(newView); }}
                aria-label="view toggle"
                size="small"
                sx={{ backgroundColor: theme.table_row_light }}
              >
                <ToggleButton value="table" aria-label="table view">
                  <ViewListIcon sx={{ color: viewMode === 'table' ? theme.primary : theme.secondary_text }} />
                </ToggleButton>
                <ToggleButton value="grid" aria-label="grid view">
                  <ViewModuleIcon sx={{ color: viewMode === 'grid' ? theme.primary : theme.secondary_text }} />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
`;

if (!c.includes('viewMode === "grid"')) {
    c = c.replace('<TableTemp', toggleJsx + '\n            {viewMode === "grid" ? (\n              <AnimeGrid\n                data={tableData.data}\n                pagination={tableData.pagination}\n                loading={dataLoading}\n                onPageChange={(e, p) => {\n                  const params = lastFetchParams.current || { page: 1, count: 10, filters: [], order: "asc", orderBy: "Name" };\n                  getData({ ...params, page: p });\n                }}\n              />\n            ) : (\n              <TableTemp');
    
    // Replace the ending tag of TableTemp
    c = c.replace('dimensions={{\n                height: windowSize.height - (windowSize.width < 768 ? 150 : 200),\n                width: windowSize.width,\n              }}\n            />', 
`dimensions={{
                height: windowSize.height - (windowSize.width < 768 ? 150 : 200),
                width: windowSize.width,
              }}
            />
            )}`);
}

fs.writeFileSync('frontend/src/app/anime/page.tsx', c);
