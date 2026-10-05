const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/AnimeGrid.tsx', 'utf8');

// Add onLoadMore to props
if (!code.includes('onLoadMore: () => void;')) {
  code = code.replace('gridSize: number;\n}', 'gridSize: number;\n  onLoadMore: () => void;\n}');
  code = code.replace('loading, gridSize }: AnimeGridProps)', 'loading, gridSize, onLoadMore }: AnimeGridProps)');
}

// Remove the standard Pagination
const paginationRegex = /\{\/\* Pagination \*\/\}.*?<\/Box>\s*\n\s*\)}/s;
code = code.replace(paginationRegex, '');

// Add onScrollFrame to Scrollbars
// We need to debounce or limit it so it doesn't fire 100 times.
if (!code.includes('onScrollFrame=')) {
  code = code.replace('<Scrollbars autoHide>', 
`<Scrollbars 
        autoHide 
        onScrollFrame={(values) => {
          if (values.top >= 0.99 && !loading) {
            onLoadMore();
          }
        }}
      >`);
}

// Add a loading indicator at the bottom if loading
if (!code.includes('Loading more...')) {
  code = code.replace('</Grid>\n      \n    </Box>', 
`</Grid>
        {loading && data.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3, mb: 3, color: theme.primary }}>
             <Typography>Loading more...</Typography>
          </Box>
        )}
      </Box>`);
}

fs.writeFileSync('frontend/src/components/AnimeGrid.tsx', code);
