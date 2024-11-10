import React, { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";
import useToast from "hooks/useToast";
import ShareIcon from "@mui/icons-material/Share";

const CopyToClipboardButton: React.FC = () => {
  const [textToCopy, setTextToCopy] = useState("");
  const { t } = useTranslation();
  const showToast = useToast();

  useEffect(() => {
    setTextToCopy(window.location.href); // Set the current site address as text to copy
  }, []);

  const handleCopyToClipboard = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast(t("messages.copy_success"), "success");
    } catch (error) {
      showToast(t("messages.copy_failure"), "error");
    }
  };

  return (
    <Button
      variant="outlined"
      color="error"
      onClick={handleCopyToClipboard}
      sx={{
        borderRadius: "20px",
        padding: "6px 12px",
        fontSize: "13px"
      }}
    >
      {t("buttons.copy_to_clipboard")}
      <ShareIcon sx={{ fontSize: "13px", marginLeft: "5px" }} />{" "}
    </Button>
  );
};

export default CopyToClipboardButton;
