const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/anime/page.tsx', 'utf8');

const oldTableRender = `<TableTemp
            tableName="anime-table"`;

const newTableRender = `<Box sx={{
              "& .MuiPaper-root": { backgroundColor: "transparent", boxShadow: "none", border: "none" },
              "& .MuiTableHead-root": { 
                 "& .MuiTableCell-root": { backgroundColor: theme.background_light, color: theme.primary, borderBottom: "2px solid #333", fontSize: "0.9rem", fontWeight: "bold" }
              },
              "& .MuiTableBody-root .MuiTableRow-root": {
                 transition: "all 0.25s ease",
                 backgroundColor: theme.table_row_light,
                 marginBottom: "10px",
                 display: "table-row",
                 "&:hover": {
                    transform: "scale(1.01)",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                    zIndex: 10,
                    position: "relative",
                    backgroundColor: "#2c2c30",
                 },
                 "& .MuiTableCell-root": { borderBottom: "1px solid rgba(255,255,255,0.05)" }
              }
            }}>
              <TableTemp
            tableName="anime-table"`;

// also we need to close the Box!
const oldTableClose = `lastFetchParams={lastFetchParams.current}
            />
            )}`;

const newTableClose = `lastFetchParams={lastFetchParams.current}
            />
            </Box>
            )}`;

if (!c.includes('transform: "scale(1.01)"')) {
    c = c.replace(oldTableRender, newTableRender);
    c = c.replace(oldTableClose, newTableClose);
    fs.writeFileSync('frontend/src/app/anime/page.tsx', c);
}
