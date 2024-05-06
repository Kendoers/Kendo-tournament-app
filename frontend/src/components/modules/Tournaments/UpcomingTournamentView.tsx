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
import type { Category, Tournament, TournamentType } from "types/models";
import { useTranslation } from "react-i18next";
import { Grid, Link } from "@mui/material";
import CopyToClipboardButton from "./OngoingTournament/CopyToClipboardButton";

const generateTable = (tournament: Tournament): React.ReactNode => {
  const { t } = useTranslation();

  const tableHeaders = [
    t("user_info_labels.name"),
    t("user_info_labels.dan_rank"),
    t("user_info_labels.club")
  ] as const;

  return (
    <TableContainer
      component={Paper}
      aria-label={t("signup_labels.player_table")}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            {tableHeaders.map((header) => (
              <TableCell key={header} aria-label={`header-${header}`}>
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {tournament.players.map((player, index) => (
            <TableRow key={player.id} aria-label={`player-${index}`}>
              <TableCell aria-label={`cell-name-${index}`}>
                <Typography>
                  {`${player.firstName} ${player.lastName}`}
                </Typography>
              </TableCell>
              <TableCell aria-label={`cell-rank-${index}`}>
                <Typography>{player.danRank ?? "-"}</Typography>
              </TableCell>
              <TableCell aria-label={`cell-club-${index}`}>
                <Typography>{player.clubName ?? "-"}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const UpcomingTournamentView: React.FC = () => {
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

  const getTypeTranslationKey = (type: TournamentType): string => {
    switch (type) {
      case "Round Robin":
        return "types.round_robin";
      case "Playoff":
        return "types.playoff";
      case "Preliminary Playoff":
        return "types.preliminary_playoff";
      case "Swiss":
        return "types.swiss";
      default:
        return "";
    }
  };

  const getCategoryTranslationKey = (type: Category): string => {
    switch (type) {
      case "championship":
        return "create_tournament_form.championship";
      case "hobby":
        return "create_tournament_form.hobby";
      case "league":
        return "create_tournament_form.league";
      default:
        return "";
    }
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
          <strong>{t("upcoming_tournament_view.date_header")}:</strong>{" "}
          {new Date(tournament.startDate).toLocaleString("fi", {
            // dont show seconds
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
          {t(getTypeTranslationKey(tournament.type))}
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
          <strong>{t("upcoming_tournament_view.category_header")}:</strong>{" "}
          {t(getCategoryTranslationKey(tournament.category))}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle1">
          <strong>{t("upcoming_tournament_view.max_players")}:</strong>{" "}
          {tournament.players.length}
          {"/"}
          {tournament.maxPlayers}
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

      <br />

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
          <br />
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
          <br />
        </Box>
      )}

      {/* There are players in the tournament, generate table if user is logged in */}
      {tournament.players.length > 0 && userId !== undefined && (
        <React.Fragment>
          <Typography variant="body1" className="header" fontWeight="bold">
            {t("upcoming_tournament_view.others_signed_up_header")}:
          </Typography>
          {generateTable(tournament)}
        </React.Fragment>
      )}

      {/* There are players in the tournament, but user is not logged in */}
      {tournament.players.length > 0 && userId === undefined && (
        <Typography variant="body1" className="header" fontWeight="bold">
          {t("upcoming_tournament_view.attendee_list")}
        </Typography>
      )}

      {/* No players in the tournament */}
      {tournament.players.length === 0 && (
        <Typography variant="body1" className="header" fontWeight="bold">
          {t("upcoming_tournament_view.no_players_signed_up")}
        </Typography>
      )}
    </Container>
  );
};

export default UpcomingTournamentView;
