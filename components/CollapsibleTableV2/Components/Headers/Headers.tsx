import React from "react";
import { Box, Typography } from "@mui/material";
import { StyledTeaButton } from "@/components/StyledTeaButton";

interface TableHeadersProps {
  // ... diğer props'lar
  user: any;
}

const TableHeaders = ({
  // ... diğer props'lar
  user,
}: TableHeadersProps) => {
  const isAdmin = user?.isAdmin;

  return (
    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
      <StyledTeaButton
        onClick={() => setCreateModalData({ status: true })}
        disabled={!isAdmin}
        sx={{
          fontFamily: "inherit",
          opacity: !isAdmin ? 0.5 : 1,
          cursor: !isAdmin ? "not-allowed" : "pointer",
        }}
        color="primary"
      >
        <Typography variant="button">Create</Typography>
      </StyledTeaButton>

      <StyledTeaButton
        onClick={handleSyncAll} // veya ilgili fonksiyon
        disabled={!isAdmin}
        sx={{
          fontFamily: "inherit",
          opacity: !isAdmin ? 0.5 : 1,
          cursor: !isAdmin ? "not-allowed" : "pointer",
        }}
        color="secondary"
      >
        <Typography variant="button">Sync All</Typography>
      </StyledTeaButton>

      {/* ... diğer header içeriği ... */}
    </Box>
  );
};

export default TableHeaders;
