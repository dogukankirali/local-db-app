const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/Modals/CreateAnimeModal.tsx', 'utf8');

// Modernize the modalStyle
code = code.replace(/const modalStyle = \{[\s\S]*?overflow: "hidden",\s*\};/, 
`const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: "800px",
  maxHeight: "90vh",
  bgcolor: "#202022",
  boxShadow: "0 16px 64px rgba(0, 0, 0, 0.8)",
  p: 4,
  borderRadius: "20px",
  outline: "none",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.05)",
  display: "flex",
  flexDirection: "column"
};`);

// Ensure it doesn't return null if !props.createModalData.status
// In the current file:
code = code.replace(/if \(!props\.createModalData\.status\) return null;/g, '');
code = code.replace(/if \(!props\.createModalData\.status \|\| !props\.genres\) return null;/g, '');

// The modal content itself should use standard overflow auto if react-custom-scrollbars is laggy.
// Actually, let's keep LazyScrollbars for now but change the inner padding and styling.
// We can just modernize the inner input styling.
code = code.replace(/& \.MuiOutlinedInput-root/g, '& .MuiOutlinedInput-root, & .MuiFilledInput-root');
code = code.replace(/& \.MuiInputBase-input/g, '& .MuiInputBase-input, & .MuiFilledInput-input');

fs.writeFileSync('frontend/src/components/Modals/CreateAnimeModal.tsx', code);
