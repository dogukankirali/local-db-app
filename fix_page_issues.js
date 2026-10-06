const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/anime/page.tsx', 'utf8');

// 1. Fix viewMode state to use localStorage
if (!c.includes('localStorage.getItem("viewMode")')) {
  c = c.replace('const [viewMode, setViewMode] = useState<"table" | "grid">("grid");',
`const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
  useEffect(() => {
    const saved = localStorage.getItem("viewMode");
    if (saved === "table" || saved === "grid") {
      setViewMode(saved);
    }
  }, []);
  
  const handleViewModeChange = (newView: "table" | "grid") => {
    setViewMode(newView);
    localStorage.setItem("viewMode", newView);
  };`);
  
  // replace the ToggleButtonGroup onChange
  c = c.replace('onChange={(e, newView) => { if (newView) setViewMode(newView); }}', 'onChange={(e, newView) => { if (newView) handleViewModeChange(newView as "table" | "grid"); }}');
}

// 2. Fix Table Style Wrapper
const oldWrapper = `"& .MuiTableBody-root .MuiTableRow-root": {
                   transition: "all 0.25s ease",
                   backgroundColor: theme.table_row_light,
                   display: "table-row",
                   "&:hover": {
                      transform: "scale(1.001)",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                      zIndex: 10,
                      position: "relative",
                      backgroundColor: "#2c2c30",
                   },
                   "& .MuiTableCell-root": { borderBottom: "1px solid rgba(255,255,255,0.05)" }
                }`;

const newWrapper = `"& .MuiTableBody-root .MuiTableRow-root": {
                   transition: "background-color 0.2s ease",
                   backgroundColor: "transparent",
                   display: "table-row",
                   "&:hover": {
                      backgroundColor: "rgba(255,255,255,0.03)",
                   },
                   "& .MuiTableCell-root": { 
                      borderBottom: "1px solid rgba(255,255,255,0.03)", 
                      backgroundColor: "transparent !important", // Fix crazy column colors
                      padding: "8px 12px" // More compact
                   }
                }`;
c = c.replace(oldWrapper, newWrapper);

fs.writeFileSync('frontend/src/app/anime/page.tsx', c);
