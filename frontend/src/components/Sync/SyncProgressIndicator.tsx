"use client";

import React, { useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SyncIcon from "@mui/icons-material/Sync";
import { styled, keyframes } from "@mui/material/styles";

// Keyframes animasyonunu tanımla
const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// Styled components
const FloatingContainer = styled(Paper)(({ theme }) => ({
  position: "fixed",
  bottom: 20,
  right: 20,
  padding: theme.spacing(2),
  display: "flex",
  flexDirection: "column",
  width: 300,
  zIndex: 9999,
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
  borderRadius: 8,
  backgroundColor: theme.palette.background.paper,
}));

const ProgressHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(1),
}));

const ProgressInfo = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginBottom: theme.spacing(1),
}));

const ProgressBarContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  height: 8,
  backgroundColor: theme.palette.grey[200],
  borderRadius: 4,
  overflow: "hidden",
  marginBottom: theme.spacing(1),
}));

const ProgressBar = styled(Box)<{ value: number }>(({ theme, value }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  height: "100%",
  width: `${value}%`,
  backgroundColor: theme.palette.primary.main,
  borderRadius: 4,
  transition: "width 0.3s ease-in-out",
}));

// Dönen ikon için styled component
const SpinningIcon = styled(SyncIcon)(({ theme }) => ({
  marginRight: theme.spacing(1),
  animation: `${spin} 2s linear infinite`,
}));

interface SyncProgressIndicatorProps {
  isVisible: boolean;
  progress: number;
  message: string;
  stats: {
    updated: number;
    failed: number;
    totalWork: number;
    completed: number;
  };
  onClose: () => void;
}

const SyncProgressIndicator: React.FC<SyncProgressIndicatorProps> = ({
  isVisible,
  progress,
  message,
  stats,
  onClose,
}) => {
  if (!isVisible) return null;

  return (
    <FloatingContainer>
      <ProgressHeader>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <SpinningIcon />
          <Typography variant="subtitle1" fontWeight="bold">
            Senkronizasyon İlerlemesi
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </ProgressHeader>

      <ProgressInfo>
        <CircularProgress
          variant="determinate"
          value={progress}
          size={24}
          thickness={5}
          sx={{ mr: 1 }}
        />
        <Typography variant="body2">
          {progress.toFixed(1)}% Tamamlandı ({stats.completed}/{stats.totalWork}
          )
        </Typography>
      </ProgressInfo>

      <ProgressBarContainer>
        <ProgressBar value={progress} />
      </ProgressBarContainer>

      <Typography variant="caption" color="textSecondary" sx={{ mb: 1 }}>
        {message}
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="caption" color="success.main">
          {stats.updated} güncellendi
        </Typography>
        <Typography variant="caption" color="error.main">
          {stats.failed} başarısız
        </Typography>
      </Box>
    </FloatingContainer>
  );
};

export default SyncProgressIndicator;
