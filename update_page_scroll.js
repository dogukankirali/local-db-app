const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/anime/page.tsx', 'utf8');

if (!code.includes('const isAppending = useRef<boolean>(false);')) {
  code = code.replace('const lastFetchParams = useRef<TEATable.FetchDataParams | undefined>(', 
`const isAppending = useRef<boolean>(false);
  const lastFetchParams = useRef<TEATable.FetchDataParams | undefined>(`);
}

// Modify getData to handle appending
const originalSetData = `if (!aborted) {
        setTableData(res);
      }`;
      
const newSetData = `if (!aborted) {
        if (isAppending.current) {
          setTableData((prev: any) => ({
            ...res,
            data: [...(prev?.data || []), ...(res?.data || [])]
          }));
          isAppending.current = false;
        } else {
          setTableData(res);
        }
      }`;

if (code.includes(originalSetData)) {
  code = code.replace(originalSetData, newSetData);
}

// Ensure onLoadMore is passed to AnimeGrid
if (!code.includes('onLoadMore={')) {
  // Find where AnimeGrid is rendered and add onLoadMore
  code = code.replace(/onPageChange=\{\(e, p\) => \{[\s\S]*?\}\}/m, 
`onPageChange={() => {}}
                onLoadMore={() => {
                  if (tableData?.pagination && !dataLoading) {
                    const nextPage = tableData.pagination.currentPage + 1;
                    if (nextPage <= tableData.pagination.totalPageCount) {
                      isAppending.current = true;
                      const params = lastFetchParams.current || { page: 1, count: 20, filters: [], order: "asc", orderBy: "Name" };
                      getData({ ...params, page: nextPage });
                    }
                  }
                }}`);
}

// Change initial fetch count from 10 to 24 for Grid
if (code.includes('count: 10')) {
  // It's safer to just let the user change table counts if needed, but for the initial grid fetch:
  code = code.replace(/getData\(\{ page: 1, count: 10, filters/g, 'getData({ page: 1, count: 20, filters');
}

fs.writeFileSync('frontend/src/app/anime/page.tsx', code);
