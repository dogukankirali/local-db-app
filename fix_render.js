const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/anime/page.tsx', 'utf8');

const regex = /\{viewMode === "grid" \? \([\s\S]*?<\/Box>\s*<\/Box>\s*<UpdateDeleteAnimeModal/m;

const replacement = `{viewMode === "grid" ? (
              <AnimeGrid
                data={tableData.data}
                pagination={tableData.pagination}
                loading={dataLoading}
                gridSize={gridSize}
                onPageChange={(e, p) => {
                  const params = lastFetchParams.current || { page: 1, count: 10, filters: [], order: "asc", orderBy: "Name" };
                  getData({ ...params, page: p });
                }}
              />
            ) : (
              <Box sx={{
                width: "100%",
                height: "100%",
                "& .MuiPaper-root": { backgroundColor: "transparent", boxShadow: "none", border: "none" },
                "& .MuiTableHead-root": { 
                   "& .MuiTableCell-root": { backgroundColor: theme.background_light, color: theme.primary, borderBottom: "2px solid #333", fontSize: "0.9rem", fontWeight: "bold" }
                },
                "& .MuiTableBody-root .MuiTableRow-root": {
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
                }
              }}>
                <TableTemp
                  tableName="anime-table"
                  data={tableData}
                  setData={setTableData}
                  header={outerColumns}
                  sortHeader={setOuterColumns}
                  collapsible={{
                    isCollapsible: true,
                    size: "xl",
                    inner: {
                      type: "list",
                      list: innerColumns,
                      listType: "detail",
                    },
                  }}
                  tableRerender={tableRerender}
                  style={{
                    height: windowSize.height - (windowSize.width < 768 ? 150 : 200),
                    width: "100%",
                    maxWidth: "100vw",
                  }}
                  selectionFilters={filterState}
                  setSelectionFilters={tableFilterProps.setFilterState}
                  loading={dataLoading}
                  dimensions={{
                    height: windowSize.height - (windowSize.width < 768 ? 150 : 200),
                    width: windowSize.width - (windowSize.width < 768 ? 20 : 150),
                  }}
                  lastFetchParams={lastFetchParams.current}
                />
              </Box>
            )}
        </Box>
      </Box>
      <UpdateDeleteAnimeModal`;

c = c.replace(regex, replacement);
fs.writeFileSync('frontend/src/app/anime/page.tsx', c);
