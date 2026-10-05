const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/AnimeGrid.tsx', 'utf8');

if (!code.includes('Scrollbars')) {
  code = code.replace('import { theme } from', 'import { Scrollbars } from "react-custom-scrollbars-2";\nimport { theme } from');
}

if (!code.includes('gridSize: number;')) {
  code = code.replace('loading: boolean;\n}', 'loading: boolean;\n  gridSize: number;\n}');
  code = code.replace('loading }: AnimeGridProps)', 'loading, gridSize }: AnimeGridProps)');
}

code = code.replace('<Grid item xs={12} sm={6} md={4} lg={3} xl={2.4}', '<Grid item xs={12} sm={6} md={12/Math.max(1, gridSize-2)} lg={12/Math.max(1, gridSize-1)} xl={12/gridSize}');

if (!code.includes('<Scrollbars autoHide>')) {
  code = code.replace('<Box sx={{ p: 2 }}>', '<Box sx={{ p: 2, height: "100%", overflow: "hidden" }}>\n      <Scrollbars autoHide>\n        <Box sx={{ p: 1 }}>');
  code = code.replace('</Box>\n  );\n}', '</Box>\n      </Scrollbars>\n    </Box>\n  );\n}');
}

fs.writeFileSync('frontend/src/components/AnimeGrid.tsx', code);
