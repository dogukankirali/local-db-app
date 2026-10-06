const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/CollapsibleTableV2/Components/Headers/Headers.tsx', 'utf8');

code = code.replace(/import \{ useState, useRef \} from "react";/, 'import { useState, useRef, useEffect } from "react";');

fs.writeFileSync('frontend/src/components/CollapsibleTableV2/Components/Headers/Headers.tsx', code);
