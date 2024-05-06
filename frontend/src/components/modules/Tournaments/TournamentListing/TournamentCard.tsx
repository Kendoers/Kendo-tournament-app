import React, { useState } from "react";
import type { Tournament } from "types/models";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import CardActionArea from "@mui/material/CardActionArea";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import CardContent from "@mui/material/CardContent";
import Card from "@mui/material/Card";
import { useAuth } from "context/AuthContext";
import { useTranslation } from "react-i18next";
import api from "api/axios";
import useToast from "hooks/useToast";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from "@mui/material";
import { allMatchesPlayed, findTournamentWinner } from "utils/TournamentUtils";

interface TournamentCardProps {
  tournament: Tournament;
  type: string;
}

const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  type
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const showToast = useToast();
  const { userId } = useAuth();
  const userAlreadySigned = tournament.players.some(
    (player) => player.id === userId
  );
  const tournamentFull = tournament.maxPlayers <= tournament.players.length;
  const isUserTheCreator = tournament.creator.id === userId;
  const tournamentHasNotStarted = new Date() < new Date(tournament.startDate);
  const [openDialog, setOpenDialog] = useState(false);

  const finished = allMatchesPlayed(tournament);

  const handleOpenDialog = (): void => {
    setOpenDialog(true);
  };

  const handleCloseDialog = (): void => {
    setOpenDialog(false);
  };

  const apiDeleteTournamentRequest = async (): Promise<void> => {
    handleCloseDialog();
    try {
      await api.tournaments.delete(tournament.id);
      navigate(0);
    } catch (error) {
      showToast(error, "error");
    }
  };

  const deleteConfirmationDialog = (): JSX.Element => (
    <Dialog
      open={openDialog}
      onClose={handleCloseDialog}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        {t("titles.confirm_tournament_deletion")}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {t("upcoming_tournament_view.delete_tournament")}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog} variant="contained" color="error">
          {t("buttons.cancel_button")}
        </Button>
        <Button
          color="success"
          variant="contained"
          onClick={apiDeleteTournamentRequest}
          autoFocus
        >
          {t("buttons.confirm_button")}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Card component="main" sx={{ position: "relative" }}>
      <CardActionArea
        onClick={() => {
          if (type === "past") {
            navigate(`past-tournament/${tournament.id}`);
          } else {
            navigate(tournament.id);
          }
        }}
      >
        <CardHeader
          title={tournament.name}
          titleTypographyProps={{ fontWeight: "500" }}
        />
        <CardContent sx={{ marginBottom: "64px" }}>
          {tournamentFull && type === "upcoming" && (
            <Typography variant="subtitle1" marginBottom="32px">
              {t("upcoming_tournament_view.tournament_full")}
            </Typography>
          )}
          {finished && (
            <Typography color="text.secondary">
              <strong>
                {t("frontpage_labels.winner")}:{" "}
                {findTournamentWinner(tournament)}
              </strong>
            </Typography>
          )}
          {(type === "ongoing" || type === "upcoming") && (
            <Typography color="text.secondary">
              {t("frontpage_labels.start_date")}:{" "}
              {new Date(tournament.startDate).toLocaleDateString("fi")}
            </Typography>
          )}
          {(type === "ongoing" || type === "upcoming") && (
            <Typography color="text.secondary">
              {t("frontpage_labels.end_date")}:{" "}
              {new Date(tournament.endDate).toLocaleDateString("fi")}
            </Typography>
          )}
          {type === "past" && (
            <Typography color="text.secondary">
              {`${tournament.location}, 
              ${new Date(tournament.startDate).toLocaleDateString("fi")} -
              ${new Date(tournament.endDate).toLocaleDateString("fi")}`}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
      {type === "upcoming" && (
        <>
          <br></br>
          <Button
            color="primary"
            variant="contained"
            disabled={userAlreadySigned || tournamentFull}
            onClick={() => {
              navigate(`${tournament.id}/sign-up`);
            }}
            sx={{ position: "absolute", bottom: 10, right: 10 }}
          >
            {t("buttons.sign_up_button")}
          </Button>
          {userAlreadySigned && tournamentHasNotStarted && (
            <Button
              color="secondary"
              variant="contained"
              onClick={() => {
                navigate(`${tournament.id}/cancel-sign-up`);
              }}
              sx={{ position: "absolute", bottom: 10, right: 10 }}
            >
              {t("buttons.cancel_sign_up")}
            </Button>
          )}
          {isUserTheCreator && tournamentHasNotStarted && (
            <Button
              color="error"
              variant="outlined"
              onClick={handleOpenDialog}
              sx={{ position: "absolute", bottom: 10, left: 10 }}
            >
              {t("buttons.delete")}
            </Button>
          )}
          {isUserTheCreator && tournamentHasNotStarted && (
            <Button
              color="error"
              variant="outlined"
              onClick={() => {
                navigate(`edit-tournament-info/${tournament.id}`);
              }}
              sx={{ position: "absolute", bottom: 60, right: 10 }}
            >
              {t("buttons.edit_button")}
            </Button>
          )}
        </>
      )}
      {deleteConfirmationDialog()}
    </Card>
  );
};

export default TournamentCard;
