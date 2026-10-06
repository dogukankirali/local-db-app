import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { palette } from "../../../../theme/customTheme";
import { HandleStateChange } from "./TableFilters";

type ChipFilterProps = {
  elKey: string;
  value: string[];
  options: { value: string; label: string }[];
  handleStateChange: HandleStateChange;
  // true: aynı anda tek seçenek (tekrar tıklayınca kaldırılır)
  exclusive?: boolean;
};

// Az seçenekli alanlar için açılır menü yerine tek tıkla seçilen chip'ler
export default function ChipFilter({ elKey, value, options, handleStateChange, exclusive }: ChipFilterProps) {
  const toggle = (v: string) => {
    const selected = value.includes(v);
    const next = exclusive ? (selected ? [] : [v]) : selected ? value.filter((x) => x !== v) : [...value, v];
    handleStateChange({ key: elKey, value: next });
  };

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
      {options.map((opt) => {
        const active = value.includes(opt.value);
        return (
          <Box
            key={opt.value}
            component="button"
            type="button"
            aria-pressed={active}
            onClick={() => toggle(opt.value)}
            sx={{
              height: 32,
              px: 1.5,
              borderRadius: "8px",
              border: `1px solid ${active ? alpha(palette.primary, 0.6) : alpha("#FFFFFF", 0.08)}`,
              backgroundColor: active ? alpha(palette.primary, 0.18) : alpha("#FFFFFF", 0.03),
              color: active ? palette.text : palette.textMuted,
              fontFamily: "inherit",
              fontSize: "0.8rem",
              fontWeight: active ? 600 : 500,
              cursor: "pointer",
              transition: "all .15s ease",
              "&:hover": { borderColor: alpha(palette.primary, 0.4), color: palette.text },
            }}
          >
            {opt.label}
          </Box>
        );
      })}
    </Box>
  );
}
