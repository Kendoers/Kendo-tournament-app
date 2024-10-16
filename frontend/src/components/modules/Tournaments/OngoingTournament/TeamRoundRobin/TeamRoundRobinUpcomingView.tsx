import React from "react";
import { useNavigate } from "react-router-dom";
import { useTournament } from "context/TournamentContext";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import { useAuth } from "context/AuthContext";
import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import Paper from "@mui/material/Paper";
import { useTranslation } from "react-i18next";
import { Grid, Link } from "@mui/material";
import CopyToClipboardButton from "../../OngoingTournament/CopyToClipboardButton";

const TeamRoundRobinUpcomingView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const tournament = useTournament();

  const userAlreadySigned = tournament.players.some(
    (player) => player.id === userId
  );
  const maxPlayers = tournament.maxPlayers;
  const signedPlayers = tournament.players.length;
  const tournamentFull = maxPlayers <= signedPlayers;

  const generateTeamTable = (): React.ReactNode => {
    const tableHeaders = [
      t("team_info_labels.team_name"),
      t("team_info_labels.players")
    ];

    return (
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {tableHeaders.map((header) => (
                <TableCell key={header}>{header}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {tournament.teams?.map((team, index) => (
              <TableRow key={index}>
                <TableCell>{team.name}</TableCell>
                <TableCell>
                  {team.players.map((player) => (
                    <div key={player.id}>
                      {player.firstName} {player.lastName}
                    </div>
                  ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Container
      component="main"
      sx={{ display: "flex", flexDirection: "column", gap: "8px" }}
    >
      <Grid container alignItems="center" spacing={4}>
        <Grid item>
          <Typography
            variant="h4"
            className="header"
            fontWeight="bold"
            marginBottom="12px"
          >
            {tournament.name}
          </Typography>
        </Grid>
        <Grid item>
          <CopyToClipboardButton />
        </Grid>
      </Grid>

      {tournamentFull && (
        <Box>
          <Typography variant="h5" className="header" fontWeight="bold">
            {t("upcoming_tournament_view.tournament_full")}
          </Typography>
        </Box>
      )}

      <Box>
        <Typography variant="subtitle1">
          <strong>{t("upcoming_tournament_view.location_header")}:</strong>{" "}
          {tournament.location}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle1">
          <strong>{t("upcoming_tournament_view.date_header")}:</strong>
          {new Date(tournament.startDate).toLocaleString("fi", {
            dateStyle: "short",
            timeStyle: "short"
          })}{" "}
          -{" "}
          {new Date(tournament.endDate).toLocaleString("fi", {
            dateStyle: "short",
            timeStyle: "short"
          })}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle1">
          <strong>{t("upcoming_tournament_view.type_header")}:</strong>{" "}
          {t("types.team_round_robin")}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle1">
          <strong>{t("upcoming_tournament_view.about_header")}:</strong>{" "}
          {tournament.description}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle1">
          <strong>{t("upcoming_tournament_view.max_players")}:</strong>{" "}
          {tournament.players.length}/{tournament.maxPlayers}
        </Typography>
      </Box>

      {tournament.linkToSite !== undefined &&
        tournament.linkToSite.trim() !== "" && (
          <Box>
            <Typography variant="subtitle1">
              <strong>
                {t("upcoming_tournament_view.link_to_site_header")}:
              </strong>{" "}
              <Link href={tournament.linkToSite}>{tournament.linkToSite}</Link>
            </Typography>
          </Box>
        )}

      {tournament.linkToPay !== undefined &&
        tournament.linkToPay.trim() !== "" && (
          <Box>
            <Typography variant="subtitle1">
              <strong>
                {t("upcoming_tournament_view.link_to_payment_header")}:
              </strong>{" "}
              <Link href={tournament.linkToPay}>{tournament.linkToPay}</Link>
            </Typography>
          </Box>
        )}

      {generateTeamTable()}

      {!userAlreadySigned && !tournamentFull && (
        <Box>
          <Typography variant="body1" className="header">
            {t("upcoming_tournament_view.attend_prompt")}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            disabled={userAlreadySigned || tournamentFull}
            onClick={() => {
              navigate("sign-up");
            }}
          >
            {t("buttons.sign_up_button")}
          </Button>
        </Box>
      )}

      {userAlreadySigned && (
        <Box>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              navigate("cancel-sign-up");
            }}
          >
            {t("buttons.cancel_sign_up")}
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default TeamRoundRobinUpcomingView;
