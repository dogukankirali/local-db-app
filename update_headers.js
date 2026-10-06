const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/anime/page.tsx', 'utf8');

const oldHead = `"& .MuiTableHead-root": { 
                   "& .MuiTableCell-root": { backgroundColor: theme.background_light, color: theme.primary, borderBottom: "2px solid #333", fontSize: "0.9rem", fontWeight: "bold" }
                },`;

const newHead = `"& .MuiTableHead-root": { 
                   "& .MuiTableCell-root": { backgroundColor: "transparent", color: theme.primary, borderBottom: "2px solid rgba(255,255,255,0.05)", fontSize: "0.85rem", fontWeight: "bold", padding: "8px 12px" }
                },`;

if (code.includes(oldHead)) {
  code = code.replace(oldHead, newHead);
  fs.writeFileSync('frontend/src/app/anime/page.tsx', code);
}
