import React from "react";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";

import routePaths from "routes/route-paths";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { UseFormReturn } from "react-hook-form";
import type { EditUserRequest } from "types/requests";

interface ProfileHeaderProps {
  editingEnabled: boolean;
  setEditingEnabled: (value: any) => void;
  formContext: UseFormReturn<EditUserRequest>;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  editingEnabled,
  setEditingEnabled,
  formContext
}: ProfileHeaderProps) => {
  const { t } = useTranslation();

  return (
    <Box
      display="flex"
      flexWrap="wrap"
      justifyContent="space-between"
      gap={2}
      marginBottom={1}
    >
      <Box display="flex" flexDirection="column">
        <Typography component="h1" variant="h5" fontWeight="bold">
          {t("user_info_labels.profile_info")}
        </Typography>

        <Typography variant="body2">
          <Link component={RouterLink} to={routePaths.passwordReset}>
            {t("user_info_labels.change_password")}
          </Link>
        </Typography>
      </Box>

      {!editingEnabled ? (
        <Button
          type="button"
          variant="outlined"
          color="primary"
          sx={{ mt: 3, mb: 2 }}
          onClick={() => {
            setEditingEnabled(true);
          }}
        >
          {t("buttons.edit_info_button")}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outlined"
          color="primary"
          onClick={() => {
            setEditingEnabled(() => {
              formContext.reset();
              return false;
            });
          }}
          sx={{ mt: 3, mb: 2 }}
        >
          {t("buttons.cancel_button")}
        </Button>
      )}
    </Box>
  );
};

export default ProfileHeader;
