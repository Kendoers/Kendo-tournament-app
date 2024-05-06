import React, { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { EditUserRequest } from "types/requests";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import ConfirmUserDeletionModal from "./ConfirmUserDeleteModal";
import routePaths from "routes/route-paths";
import useToast from "hooks/useToast";
import { useAuth } from "context/AuthContext";
import api from "api/axios";
import { useNavigate } from "react-router-dom";

interface EditButtonRowProps {
  editingEnabled: boolean;
  setEditingEnabled: (value: any) => void;
  formContext: UseFormReturn<EditUserRequest>;
}

const EditButtonRow: React.FC<EditButtonRowProps> = ({
  editingEnabled,
  setEditingEnabled,
  formContext
}: EditButtonRowProps) => {
  const { t } = useTranslation();
  const showToast = useToast();
  const navigate = useNavigate();
  const [isConfirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const { userId, logout } = useAuth();

  const handleDeleteUser = async (): Promise<void> => {
    try {
      // This whole component wont be rendered if this is undefined.
      // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
      await api.user.delete(userId!);
      await logout();
      showToast(t("messages.deletion_success"), "success");
      navigate(routePaths.homeRoute, {
        replace: true,
        state: { refresh: true }
      });
    } catch (error) {
      showToast(error, "error");
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="space-evenly"
      flexWrap="wrap"
      gap="10px"
    >
      <ConfirmUserDeletionModal
        isOpen={isConfirmationDialogOpen}
        onClose={() => {
          setConfirmationDialogOpen(false);
        }}
        onConfirm={handleDeleteUser}
      />

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={!editingEnabled || !formContext.formState.isDirty}
        sx={{ mt: 3, mb: 2 }}
      >
        {t("buttons.save_info_button")}
      </Button>
      <Button
        type="button"
        variant="contained"
        color="error"
        size="small"
        sx={{ mt: 3, mb: 2 }}
        onClick={() => {
          setConfirmationDialogOpen(true);
        }}
      >
        {t("buttons.delete_account_button")}
      </Button>
    </Box>
  );
};

export default EditButtonRow;
