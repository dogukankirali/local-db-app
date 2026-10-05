const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/CollapsibleTableV2/Components/CustomTableRowV2.tsx', 'utf8');

const oldGrid = `display: "grid",
                        gridTemplateColumns: {
                          xs: "repeat(3, 1fr)", // Mobil grǬnǬmde 3 sǬtun
                          sm: "repeat(3, 1fr)", // Tablet grǬnǬmde 3 sǬtun
                          md: "repeat(3, 1fr)", // KǬǬk masaǬstǬ grǬnǬmde 3 sǬtun
                          lg: "repeat(4, 1fr)", // BǬyǬk masaǬstǬ grǬnǬmde 4 sǬtun
                        },
                        gap: { xs: 1, sm: 1, md: 1.5, lg: 2 },
                        width: "100%",
                        justifyContent: "center",
                        alignItems: "center",`;

// We'll just replace everything inside the Box's sx for header.type === "pill"
const regex = /<Box\s*sx=\{\{\s*display:\s*"grid"[\s\S]*?alignItems:\s*"center",\s*\}\}\s*>/m;

const newBox = `<Box
                      sx={{
                        display: "flex",
                        overflowX: "auto",
                        gap: 1,
                        maxWidth: "280px",
                        pb: 1,
                        alignItems: "center",
                        "&::-webkit-scrollbar": { height: "4px" },
                        "&::-webkit-scrollbar-thumb": { backgroundColor: "#555", borderRadius: "4px" },
                      }}
                    >`;

c = c.replace(regex, newBox);
fs.writeFileSync('frontend/src/components/CollapsibleTableV2/Components/CustomTableRowV2.tsx', c);
