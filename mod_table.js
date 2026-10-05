const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/CollapsibleTableV2/TableTemp.tsx', 'utf8');
c = c.replace('<TableContainer component={Paper}>', '<TableContainer component={Paper} sx={{ boxShadow: "0 4px 20px rgba(0,0,0,0.2)", borderRadius: "16px", overflow: "hidden", border: "none", backgroundColor: theme.table_row_light }}>');
fs.writeFileSync('frontend/src/components/CollapsibleTableV2/TableTemp.tsx', c);
