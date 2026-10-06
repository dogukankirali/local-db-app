const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/CollapsibleTableV2/Components/Headers/Headers.tsx', 'utf8');

const regexAdmin = /\/\/ isAdmin kontrolü ekleyelim[\s\S]*?console\.error\("User information could not be parsed:", error\);\n\s*\}\n\s*\}/;

const newAdmin = `// State for isAdmin to avoid hydration issues
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    if (props.user) {
      setIsAdmin(props.user.isAdmin || false);
    } else if (typeof window !== "undefined") {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const userData = JSON.parse(userStr);
          setIsAdmin(userData?.isAdmin || false);
        }
      } catch (error) {
        console.error("User information could not be parsed:", error);
      }
    }
  }, [props.user]);`;

if (code.includes('let isAdmin = false;')) {
  // We need to import useState and useEffect if not present, but they probably are.
  // Actually, Headers.tsx might already use useState. Let's check if we can just inject it.
  code = code.replace(regexAdmin, newAdmin);
  fs.writeFileSync('frontend/src/components/CollapsibleTableV2/Components/Headers/Headers.tsx', code);
}
