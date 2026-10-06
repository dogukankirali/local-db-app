const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/CollapsibleTableV2/Components/CustomTableRowV2.tsx', 'utf8');

// 1. Compact Avatar for Base64 Image
code = code.replace(/style=\{\{ width: 70, borderRadius: 10 \}\}/g, 'style={{ width: 40, height: 40, objectFit: "cover", borderRadius: "8px", boxShadow: "0 2px 5px rgba(0,0,0,0.3)" }}');

// 2. Hide scrollbar for Genres and fix overlap padding
code = code.replace(/"&::-webkit-scrollbar": \{ height: "4px" \},\s*"&::-webkit-scrollbar-thumb": \{ backgroundColor: "#555", borderRadius: "4px" \},/g, '"&::-webkit-scrollbar": { display: "none" }, MsOverflowStyle: "none", scrollbarWidth: "none",');

code = code.replace(/padding: 0, \/\/ İç boşlukları sıfırlayın/g, 'padding: "2px 8px", borderRadius: "16px", flexShrink: 0, whiteSpace: "nowrap", margin: "0",');
code = code.replace(/margin: "0 2px",/g, ''); // remove the extra margin

// 3. Elegant Status
const oldStatus = `} else if (header.type === "status") {
              return (
                <TableCell
                  key={\`cell-\${header.key}-\${index}\`}
                  align="center"
                  style={{
                    color:
                      props.singleData[header.key] === "Finished"
                        ? "#00B0F0"
                        : "#FF0000",
                  }}
                >
                  {props.singleData[header.key]}
                </TableCell>
              );`;
const newStatus = `} else if (header.type === "status") {
              const isFinished = props.singleData[header.key] === "Finished";
              return (
                <TableCell
                  key={\`cell-\${header.key}-\${index}\`}
                  align="center"
                  style={colStyle}
                >
                  <Chip 
                    label={props.singleData[header.key]} 
                    size="small"
                    sx={{ 
                      height: "22px", 
                      fontSize: "0.7rem", 
                      fontWeight: "bold", 
                      backgroundColor: isFinished ? "rgba(0, 176, 240, 0.15)" : "rgba(255, 0, 0, 0.15)",
                      color: isFinished ? "#00B0F0" : "#FF0000",
                      border: \`1px solid \${isFinished ? "#00B0F0" : "#FF0000"}\`
                    }} 
                  />
                </TableCell>
              );`;
code = code.replace(oldStatus, newStatus);

// 4. Elegant TV/Movie
const oldTvMovie = `} else if (header.type === "tv-movie") {
              if (props.singleData[header.key] === true) {
                return (
                  <TableCell
                    key={\`cell-\${header.key}-\${index}\`}
                    align="center"
                    style={{ ...colStyle, color: "green" }}
                  >
                    <LocalMoviesIcon />
                  </TableCell>
                );
              } else {
                return (
                  <TableCell
                    key={\`cell-\${header.key}-\${index}\`}
                    align="center"
                    style={{ ...colStyle, color: "red" }}
                  >
                    <TvIcon />
                  </TableCell>
                );
              }
            }`;
const newTvMovie = `} else if (header.type === "tv-movie") {
              const isMovie = props.singleData[header.key] === true;
              return (
                <TableCell
                  key={\`cell-\${header.key}-\${index}\`}
                  align="center"
                  style={colStyle}
                >
                  <Chip
                    icon={isMovie ? <LocalMoviesIcon style={{fontSize:'14px'}} /> : <TvIcon style={{fontSize:'14px'}} />}
                    label={isMovie ? "Movie" : "TV"}
                    size="small"
                    sx={{
                      height: "22px",
                      fontSize: "0.7rem",
                      fontWeight: "bold",
                      backgroundColor: isMovie ? "rgba(76, 175, 80, 0.15)" : "rgba(244, 67, 54, 0.15)",
                      color: isMovie ? "#4CAF50" : "#F44336",
                    }}
                  />
                </TableCell>
              );
            }`;
code = code.replace(oldTvMovie, newTvMovie);

fs.writeFileSync('frontend/src/components/CollapsibleTableV2/Components/CustomTableRowV2.tsx', code);
