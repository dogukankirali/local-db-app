import {
  Box,
  Dialog,
  DialogActions,
  DialogTitle,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { theme } from "../../theme/customTheme";
import Scrollbars from "react-custom-scrollbars-2";
import { StyledTeaButton } from "../CollapsibleTableV2/Components/StyledComponents";
import InnerList from "../CollapsibleTableV2/Components/Collapse/NewInnerList";
import Constants from "../../constants/Constants";
import { useState } from "react";
import FileUpload from "../Common/FileUpload";

type Props = {
  createModalData: any;
  setCreateModalData: any;
  genres: any;
  handleCreate: any;
};

export default function CreateAnimeModal({
  createModalData,
  setCreateModalData,
  genres,
  handleCreate,
}: Props) {
  const [value, setValue] = useState(0);
  const [file, setFile] = useState(null);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Dialog
      open={createModalData.status}
      onClose={() => setCreateModalData({ status: !createModalData.status })}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      fullWidth
      maxWidth="xl"
      PaperProps={{ sx: { backgroundColor: theme.background } }}
    >
      <DialogTitle
        id="alert-dialog-title"
        sx={{
          color: theme.primary_text,
        }}
      >
        <Typography variant="h5">Create Anime</Typography>
      </DialogTitle>
      <Tabs
        value={value}
        onChange={handleChange}
        aria-label="basic tabs example"
        centered
        textColor="inherit"
        variant="fullWidth"
        sx={{
          backgroundColor: theme.background,
          mb: 4,
          "& .MuiTabs-indicator": {
            backgroundColor: theme.primary,
          },
          "& .MuiTab-root": {
            color: theme.primary_text,
            "&.Mui-selected": {
              color: theme.primary,
            },
          },
        }}
      >
        <Tab label="Create Anime with Form" />
        <Tab label="Create Anime with CSV" />
      </Tabs>

      {value === 0 && (
        <>
          <Scrollbars
            style={{
              height: 900,
              overflow: "hidden",
              width: "100%",
            }}
          >
            {genres && (
              <InnerList
                data={createModalData.data}
                list={Constants({ type: "modalList" }).toSpliced(8, 0, {
                  key: "Genre",
                  value: "Genre",
                  icon: <></>,
                  type: "multi-select",
                  options: genres!,
                })}
                setData={setCreateModalData}
                type={"create"}
              />
            )}
          </Scrollbars>
        </>
      )}
      {value === 1 && (
        <Box sx={{ p: 2 }}>{<FileUpload setFile={setFile} />}</Box>
      )}

      <DialogActions>
        {value === 0 && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <StyledTeaButton onClick={handleCreate}>
              <Typography variant="button">Create</Typography>
            </StyledTeaButton>
            <StyledTeaButton
              onClick={() => {
                setCreateModalData({ status: false });
              }}
            >
              <Typography variant="button">Cancel</Typography>
            </StyledTeaButton>
          </Box>
        )}
        {value === 1 && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <StyledTeaButton type="submit" disabled={file === null} key={file}>
              <Typography variant="button">Dosya Yükle</Typography>
            </StyledTeaButton>
            <StyledTeaButton
              onClick={() => {
                setCreateModalData({ status: false });
                setValue(0);
                setFile(null);
              }}
            >
              <Typography variant="button">Cancel</Typography>
            </StyledTeaButton>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
}
