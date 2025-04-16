"use client";

import React, { memo, Suspense, lazy } from "react";
import { Box, Modal, Typography, CircularProgress } from "@mui/material";
import { theme } from "../../theme/customTheme";
import { StyledTeaButton } from "../CollapsibleTableV2/Components/StyledComponents";
import Constants from "../../constants/Constants";
import { useSearchParams } from "next/navigation";

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
  boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.35)",
  p: 4,
  borderRadius: 2,
  outline: "none",
  overflow: "hidden",
  border: `1px solid ${theme.input_border}`,
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
  const searchParams = useSearchParams();
  const fromWatchList = searchParams.get("fromWatchList") === "true";

  React.useEffect(() => {
    if (props.modalData && props.modalData.data) {
      console.log("Modal data:", props.modalData.data);
      console.log("WatchStatus value:", props.modalData.data.WatchStatus);
      console.log("PlanToWatch value:", props.modalData.data.PlanToWatch);
      console.log("Coming from Watch List:", fromWatchList ? "Yes" : "No");
    }
  }, [props.modalData, fromWatchList]);

  const list = Constants({ type: "modalList" }).toSpliced(8, 0, {
    key: "Genre",
    value: "Genre",
    icon: <></>,
    type: "multi-select",
    options: props.genres,
  });

  const handleUpdate = () => {
    console.log("Data to be updated (before):", props.modalData.data);

    // Veriyi klonla
    const updatedData = { ...props.modalData.data };

    // Sadece watchlist'ten geliyorsa değerleri değiştir
    if (fromWatchList) {
      // WatchStatus ve PlanToWatch değerlerini kesinlikle istenen değerlere ayarla
      updatedData.WatchStatus = "-1";
      updatedData.PlanToWatch = false;

      console.log("Watchlist'ten açıldığı için özel değerler ayarlandı:");
      console.log("WatchStatus değeri: -1 olarak ayarlandı");
      console.log("PlanToWatch değeri: false olarak ayarlandı");
    } else {
      console.log("Normal düzenleme. Değerler değiştirilmedi.");
    }

    // Güncellenmiş veriyi modalData'ya geri yaz
    props.setModalData({
      ...props.modalData,
      data: updatedData,
    });

    console.log("Güncellenecek veri (sonra):", updatedData);

    // Kısa bir gecikme ile updateAnime'i çağır
    // Bu, state güncellemesinin tamamlanmasını sağlar
    setTimeout(() => {
      props.updateAnime();
    }, 100);
  };

  return (
    <Modal
      open={true}
      onClose={() => props.setModalData({ status: false })}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      keepMounted={false}
    >
      <Box sx={modalStyle}>
        <Typography
          variant="h5"
          sx={{ color: theme.primary_text, mb: 2, fontWeight: "600" }}
        >
          {props.modalData?.type === "delete"
            ? `Sil - ${props.modalData?.data.Name}`
            : `Güncelle - ${props.modalData?.data!.Name}`}
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
            sx={{
              backgroundColor:
                props.modalData?.type === "delete"
                  ? theme.danger
                  : theme.primary,
              color: "#FFFFFF",
              fontWeight: "500",
            }}
            onClick={
              props.modalData?.type === "delete"
                ? props.deleteAnime
                : handleUpdate
            }
          >
            <Typography variant="button">
              {props.modalData?.type === "delete" ? "Sil" : "Güncelle"}
            </Typography>
          </StyledTeaButton>
          <StyledTeaButton
            sx={{
              backgroundColor: "transparent",
              color: theme.primary_text,
              border: `1px solid ${theme.input_border}`,
            }}
            onClick={() => {
              props.setModalData({ status: false });
            }}
          >
            <Typography variant="button">İptal</Typography>
          </StyledTeaButton>
        </Box>
      </Box>
    </Modal>
  );
});

export default UpdateDeleteAnimeModal;
