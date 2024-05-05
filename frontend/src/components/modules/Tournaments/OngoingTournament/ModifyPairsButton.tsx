import React from "react";
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const ModifyPairsButton: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleClick = async (): Promise<void> => {
    navigate(`${window.location.pathname}/modify-pairs`);
  };

  return (
    <Button variant="outlined" color="error" onClick={handleClick}>
      {t("buttons.modify_pairs")}
    </Button>
  );
};

export default ModifyPairsButton;
