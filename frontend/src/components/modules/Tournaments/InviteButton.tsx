import React, { useState } from "react";
import {
  Button,
  Modal,
  Box,
  Select,
  MenuItem,
  Typography,
  type SelectChangeEvent
} from "@mui/material";
import { useTranslation } from "react-i18next";
import api from "api/axios";
import { useTournament } from "context/TournamentContext";
import useToast from "hooks/useToast";

const InviteButton: React.FC = () => {
  const { t } = useTranslation();
  const [editMode, setEditMode] = useState<boolean>(false);
  const [clubNames, setClubNames] = useState<string[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const tournament = useTournament();
  const showToast = useToast();

  const handleInviteClick = async (): Promise<void> => {
    setEditMode(true);
    try {
      const clubs: string[] = await api.user.getClubs();
      setClubNames(clubs);
    } catch (error) {
      console.error("Error fetching club names:", error);
    }
  };

  const handleClose = (): void => {
    setEditMode(false);
  };

  const handleClubChange = (event: SelectChangeEvent<string[]>): void => {
    setSelectedClubs(event.target.value as string[]);
  };

  const handleInvite = async (): Promise<void> => {
    try {
      if (selectedClubs.length > 0) {
        await api.user.invitePlayersByClub({
          clubs: clubNames,
          tournamentId: tournament.id
        });
        showToast(t("messages.invite_success"), "success");
      }
      handleClose();
    } catch (error) {
      showToast(t("messages.invite_error"), "error");
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color="error"
        onClick={handleInviteClick}
        sx={{
          borderRadius: "20px",
          padding: "6px 12px",
          fontSize: "15px"
        }}
      >
        {t("buttons.invite_players")}
      </Button>

      {/* Modal for inviting players by clubs */}
      <Modal open={editMode} onClose={handleClose}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            display: "flex",
            flexDirection: "column",
            gap: 2
          }}
        >
          <Typography variant="h6" component="h2">
            {t("invite.select_club")}
          </Typography>

          <Select
            multiple
            value={selectedClubs}
            onChange={handleClubChange}
            displayEmpty
            fullWidth
            renderValue={(selected) =>
              selected.length === 0
                ? t("invite.select_club_placeholder")
                : selected.join(", ")
            }
          >
            <MenuItem value="" disabled>
              {t("invite.select_club_placeholder")}
            </MenuItem>
            {clubNames.map((club) => (
              <MenuItem key={club} value={club}>
                {club}
              </MenuItem>
            ))}
          </Select>

          <Button
            variant="contained"
            color="primary"
            onClick={handleInvite}
            disabled={selectedClubs.length === 0}
          >
            {t("buttons.invite_players")}
          </Button>
        </Box>
      </Modal>
    </>
  );
};

export default InviteButton;
