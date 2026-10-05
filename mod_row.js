const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/CollapsibleTableV2/Components/CustomTableRowV2.tsx', 'utf8');
c = c.replace(/<TableRow/g, '<TableRow sx={{ transition: "all 0.2s ease", "&:hover": { backgroundColor: "#2d2d30", transform: "scale(1.002)", boxShadow: "0 0 10px rgba(0,0,0,0.2)", zIndex: 1, position: "relative" } }}');
// Let's not break if it already has sx. I will just do a simple replacement for the opening tag where it's exactly <TableRow>
// Actually, it's safer to just replace it manually or use a more precise regex.
