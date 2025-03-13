"use client";

import React, { memo, Suspense, lazy } from "react";
import { Box, Modal, Typography, CircularProgress } from "@mui/material";
import { theme } from "@/theme/customTheme";
import { StyledTeaButton } from "../CollapsibleTableV2/Components/StyledComponents";
import Constants from "@/constants/Constants";

const LazyScrollbars = lazy(() => import("react-custom-scrollbars-2"));
const LazyNewInnerList = lazy(
  () => import("../CollapsibleTableV2/Components/Collapse/NewInnerList")
);

const modalStyle = {
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
};

const LoadingFallback = () => (
  <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
    <CircularProgress sx={{ color: theme.primary }} />
  </Box>
);

const UpdateDeleteAnimeModal = memo(function UpdateDeleteAnimeModal(props: {
  modalData: any;
  setModalData: any;
  updateAnime: any;
  deleteAnime: any;
  genres: any;
}) {
  if (!props.modalData.status || !props.genres) return null;

  const list = Constants({ type: "modalList" }).toSpliced(8, 0, {
    key: "Genre",
    value: "Genre",
    icon: <></>,
    type: "multi-select",
    options: props.genres,
  });

  return (
    <Modal
      open={true}
      onClose={() => props.setModalData({ status: false })}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      keepMounted={false}
    >
      <Box sx={modalStyle}>
        <Typography variant="h5" sx={{ color: theme.primary_text, mb: 2 }}>
          {props.modalData?.type === "delete"
            ? `Delete - ${props.modalData?.data.Name}`
            : `Update - ${props.modalData?.data!.Name}`}
        </Typography>

        <Suspense fallback={<LoadingFallback />}>
          <LazyScrollbars
            style={{
              height: "calc(90vh - 200px)",
              width: "100%",
            }}
            autoHide
          >
            <LazyNewInnerList
              data={props.modalData?.data}
              list={list}
              setData={props.setModalData}
              type={props.modalData?.type}
            />
          </LazyScrollbars>
        </Suspense>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            justifyContent: "flex-end",
            mt: 2,
          }}
        >
          <StyledTeaButton
            sx={{ backgroundColor: theme.primary }}
            onClick={
              props.modalData?.type === "delete"
                ? props.deleteAnime
                : props.updateAnime
            }
          >
            <Typography variant="button">
              {props.modalData?.type === "delete" ? "Delete" : "Update"}
            </Typography>
          </StyledTeaButton>
          <StyledTeaButton
            sx={{ backgroundColor: theme.danger }}
            onClick={() => {
              props.setModalData({ status: false });
            }}
          >
            <Typography variant="button">Cancel</Typography>
          </StyledTeaButton>
        </Box>
      </Box>
    </Modal>
  );
});

export default UpdateDeleteAnimeModal;
