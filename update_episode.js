const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/CollapsibleTableV2/Components/CustomTableRowV2.tsx', 'utf8');

// Refactor episode type rendering
const oldEpisodeRegex = /\} else if \(header\.type === "episode"\) \{[\s\S]*?\}\s*\} else if \(header\.type === "pill"\)/;

const newEpisode = `} else if (header.type === "episode") {
              const watched = parseInt(props.singleData[header.key]) || 0;
              const total = parseInt(props.singleData["TotalNumberOfEpisodes"]) || 0;
              const isFinished = total > 0 && watched === total;
              const progress = total > 0 ? (watched / total) * 100 : 0;
              const isPlanToWatch = props.singleData["PlanToWatch"] === true;
              
              return (
                <TableCell
                  key={\`cell-\${header.key}-\${index}\`}
                  align="center"
                  style={colStyle}
                >
                  {isPlanToWatch && watched === 0 ? (
                    <Chip size="small" label="Plan To Watch" sx={{ backgroundColor: "rgba(255, 215, 0, 0.2)", color: "#FFD700", fontWeight: "bold", fontSize: "0.7rem", height: "22px" }} />
                  ) : isFinished ? (
                    <Chip size="small" label="Completed" sx={{ backgroundColor: "rgba(0, 255, 0, 0.15)", color: "#4CAF50", fontWeight: "bold", fontSize: "0.7rem", height: "22px" }} />
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, minWidth: "60px" }}>
                       <Typography sx={{ fontSize: "0.75rem", fontWeight: "bold", color: theme.primary_text }}>
                         {watched} {total > 0 ? \`/ \${total}\` : ""}
                       </Typography>
                       {total > 0 && (
                         <Box sx={{ width: "100%", height: "4px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                           <Box sx={{ width: \`\${progress}%\`, height: "100%", backgroundColor: epSetter(progress) }} />
                         </Box>
                       )}
                    </Box>
                  )}
                </TableCell>
              );
            } else if (header.type === "pill")`;

code = code.replace(oldEpisodeRegex, newEpisode);
fs.writeFileSync('frontend/src/components/CollapsibleTableV2/Components/CustomTableRowV2.tsx', code);
