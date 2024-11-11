import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

const NewTournamentButton: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Button
      type="button"
      variant="contained"
      color="primary"
      onClick={() => {
        navigate("/tournaments/new-tournament");
      }}
      sx={{
        fontSize: "14px",
        position: "fixed",
        zIndex: 999,
        bottom: "30px",
        right: "20px",
        color: "white",
        backgroundColor: "#db4744",
        borderRadius: "20px",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        textTransform: "none",
        boxShadow: "0px 3px 8px rgba(0, 0, 0, 0.2)",
        transition: "background-color 0.3s, box-shadow 0.3s",
        "&:hover": {
          backgroundColor: "#c74341",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.25)"
        }
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: "20px",
          lineHeight: "1",
          transform: "translateY(-5%)"
        }}
      >
        +
      </Typography>
      <Typography component="span" sx={{ fontSize: "14px" }}>
        {t("frontpage_labels.create_tournament")}
      </Typography>
    </Button>
  );
};

export default NewTournamentButton;
