import React, { useState } from "react";
import api from "api/axios";
import useToast from "hooks/useToast";
import { useTournament } from "context/TournamentContext";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
  DialogContentText,
  Typography,
  Select,
  MenuItem
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { useTranslation } from "react-i18next";

const DeleteUserFromTournament: React.FC = () => {
  const tournament = useTournament();
  const { t } = useTranslation();
  const [deleteUserDialog, setDeleteUserDialog] = useState(false);
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const showToast = useToast();

  const handleOpenDeleteUserDialog = (): void => {
    setDeleteUserDialog(true);
  };

  const handleCloseDeleteUserDialog = (): void => {
    setDeleteUserDialog(false);
  };

  const handleOpenConfirmDialog = (): void => {
    handleCloseDeleteUserDialog(); // close the previous dialog
    setConfirmDeleteDialog(true);
  };

  const handleCloseConfirmDialog = (): void => {
    setConfirmDeleteDialog(false);
  };

  // Stores the id and full name of chosen player
  const handleUserSelectionChange = (
    event: SelectChangeEvent<string>
  ): void => {
    const selectedUserId = event.target.value;
    const selectedUserName =
      tournament.players.find((player) => player.id === selectedUserId)
        ?.firstName +
      " " +
      tournament.players.find((player) => player.id === selectedUserId)
        ?.lastName;

    setSelectedUserId(selectedUserId);
    setSelectedUserName(selectedUserName ?? ""); // in case of null or undefined, set to ""
  };

  // Takes care of the actual deletion of player
  const apiDeleteUserRequest = async (): Promise<void> => {
    handleCloseConfirmDialog();
    try {
      await api.tournaments.markUserMatchesLost(tournament.id, selectedUserId);

      // Show success toast after the user is successfully withdrawn
      showToast(
        t("messages.withdrawal_success", { name: selectedUserName }),
        "success"
      );
    } catch (error) {
      showToast(error, "error");
    }
  };

  return (
    <div>
      <Button
        color="error"
        variant="outlined"
        onClick={handleOpenDeleteUserDialog}
        sx={{ marginTop: "16px" }}
      >
        {t("buttons.withdraw_user")}
      </Button>

      {/* Dialog that shows player list to choose from */}
      <Dialog open={deleteUserDialog} onClose={handleCloseDeleteUserDialog}>
        <DialogTitle>{t("titles.withdraw_user_from_tournament")}</DialogTitle>
        <DialogContent>
          <Typography> {t("withdrawal_from_tournament.info")} </Typography>
          <Typography style={{ marginTop: 10 }}>
            {t("withdrawal_from_tournament.withdrawing_user")}
          </Typography>
          <Select
            labelId="dropdown-label"
            id="dropdown"
            value={selectedUserId}
            onChange={handleUserSelectionChange}
            label="Select user"
          >
            {tournament.players.map((user, index) => (
              <MenuItem key={index} value={user.id}>
                {user.firstName} {user.lastName}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions style={{ justifyContent: "space-between" }}>
          <Button variant="text" onClick={handleCloseDeleteUserDialog}>
            {t("buttons.cancel_button")}
          </Button>
          <Button variant="contained" onClick={handleOpenConfirmDialog}>
            {t("buttons.withdraw_user")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog that asks confirmation for deletion */}
      <Dialog
        open={confirmDeleteDialog}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {t("titles.confirm_user_withdrawal")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {t("withdrawal_from_tournament.confirmation_msg", {
              name: selectedUserName
            })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseConfirmDialog}
            variant="contained"
            color="error"
          >
            {t("buttons.cancel_button")}
          </Button>
          <Button
            color="success"
            variant="contained"
            onClick={apiDeleteUserRequest}
            autoFocus
          >
            {t("buttons.confirm_button")}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default DeleteUserFromTournament;
