const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/anime/page.tsx', 'utf8');
c = c.replace(/useTableFilters\([\s\S]*?Constants\(\{ type: "tableFilters", additionalData: \{ genres, series \} \}\)!,[\s\S]*?\(\) => \{[\s\S]*?if \(lastFetchParams\.current\) \{[\s\S]*?const updatedParams = \{[\s\S]*?\.\.\.lastFetchParams\.current,[\s\S]*?page: 1,[\s\S]*?\};[\s\S]*?getData\(updatedParams\);[\s\S]*?\}[\s\S]*?\}[\s\S]*?\);/m, 'useTableFilters(Constants({ type: "tableFilters", additionalData: { genres, series } })!, () => {});');
fs.writeFileSync('frontend/src/app/anime/page.tsx', c);
