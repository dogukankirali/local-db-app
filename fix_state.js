const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/anime/page.tsx', 'utf8');
c = c.replace('const [dataLoading, setDataLoading] = useState<boolean>(false);', 'const [dataLoading, setDataLoading] = useState<boolean>(false);\n  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");');
fs.writeFileSync('frontend/src/app/anime/page.tsx', c);
