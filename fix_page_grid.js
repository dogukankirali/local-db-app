const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/anime/page.tsx', 'utf8');

if (!c.includes('const [gridSize, setGridSize] = useState<number>(5);')) {
    c = c.replace('const [viewMode, setViewMode] = useState<"table" | "grid">("grid");', 
`const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
  const [gridSize, setGridSize] = useState<number>(5);
  
  useEffect(() => {
    if (viewMode === "grid" && tableData.data.length === 0) {
      getData(lastFetchParams.current || { page: 1, count: 10, filters: [], order: "asc", orderBy: "Name" });
    }
  }, [viewMode]);
`);
}

if (!c.includes('<Slider')) {
    c = c.replace('import ViewModuleIcon from "@mui/icons-material/ViewModule";', 
`import ViewModuleIcon from "@mui/icons-material/ViewModule";
import { Slider, Typography as MuiTypography } from "@mui/material";`);
}

const sliderJsx = `
              {viewMode === 'grid' && (
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 3, width: '150px' }}>
                  <MuiTypography variant="caption" sx={{ color: theme.secondary_text, mr: 2, whiteSpace: 'nowrap' }}>
                    Sütun: {gridSize}
                  </MuiTypography>
                  <Slider
                    value={gridSize}
                    min={2}
                    max={8}
                    step={1}
                    onChange={(e, val) => setGridSize(val as number)}
                    size="small"
                  />
                </Box>
              )}
`;

if (!c.includes('Sütun: {gridSize}')) {
    c = c.replace('<ToggleButtonGroup', sliderJsx + '\n              <ToggleButtonGroup');
}

if (!c.includes('gridSize={gridSize}')) {
    c = c.replace('loading={dataLoading}', 'loading={dataLoading}\n                gridSize={gridSize}');
}

fs.writeFileSync('frontend/src/app/anime/page.tsx', c);
