const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/Modals/CreateAnimeModal.tsx', 'utf8');

c = c.replace('if (!props.createModalData.status || !props.genres) return null;', 'if (!props.createModalData.status) return null;');

const oldModalStyle = `const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "80%",
  maxHeight: "90vh",
  bgcolor: theme.background,
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  outline: "none",
  overflow: "hidden",
};`;

const newModalStyle = `const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: "700px",
  maxHeight: "90vh",
  bgcolor: theme.background_light || "#252526",
  boxShadow: "0 12px 48px rgba(0, 0, 0, 0.6)",
  p: 4,
  borderRadius: "24px",
  outline: "none",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.05)",
};`;

c = c.replace(oldModalStyle, newModalStyle);
fs.writeFileSync('frontend/src/components/Modals/CreateAnimeModal.tsx', c);
