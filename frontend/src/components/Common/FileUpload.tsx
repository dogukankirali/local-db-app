import React, { useState } from "react";
import axios from "axios";
import { AnimeService } from "../../Services/AnimeServices";
import {
  StyledFormInput,
  StyledTeaButton,
} from "../CollapsibleTableV2/Components/StyledComponents";
import { Box, Typography } from "@mui/material";
import { toast } from "sonner";
import { theme } from "../../theme/customTheme";

export default function FileUpload(props: { setFile: any }) {
  const [file, setFile] = useState(null);

  const onFileChange = (e: any) => {
    props.setFile(e.target.files[0]);
    setFile(e.target.files[0]);
  };

  const onSubmit = async (e: any) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("file", file as any);

    try {
      AnimeService.createAniemWithFile(formData);
      toast.success("Anime(s) uploaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload anime(s)!");
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: theme.foreground_alt,
        borderRadius: "15px",
        p: 2,
        borderColor: theme.input_border,
        border: "solid",
        borderWidth: "1px",
      }}
    >
      <form onSubmit={onSubmit}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontFamily: "inherit",
              fontWeight: "bold",
              color: theme.primary_text,
            }}
          >
            Create Anime with CSV File
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            mt: 1,
          }}
        >
          <StyledFormInput type="file" onChange={onFileChange} />
        </Box>
      </form>
    </Box>
  );
}
