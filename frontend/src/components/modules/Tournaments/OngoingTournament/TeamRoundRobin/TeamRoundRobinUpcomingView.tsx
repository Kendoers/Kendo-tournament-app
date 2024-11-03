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
import api from "api/axios";
import useToast from "hooks/useToast";

const TeamRoundRobinUpcomingView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const tournament = useTournament();
  const showToast = useToast();

  const userTeam = tournament.teams?.find((team) =>
    team.players.some((player) => player.id === userId)
  );

  const maxTeamsReached =
    (tournament.teams?.length ?? 0) >= (tournament.numberOfTeams ?? Infinity);

  const isUserTheCreator = tournament.creator.id === userId;
  const maxPlayers = tournament.maxPlayers;
  const signedPlayers = tournament.players.length;
  const tournamentFull = maxPlayers <= signedPlayers;

  const handleJoinTeam = async (teamId: string): Promise<void> => {
    if (
      tournament?.id === undefined ||
      tournament.id === "" ||
      teamId === undefined ||
      teamId === "" ||
      userId === undefined ||
      userId === ""
    ) {
      showToast(t("messages.invalid_team_join_data"), "error");
      return;
    }

    try {
      await api.tournaments.joinTeam(tournament.id, teamId, userId);
      showToast(t("messages.team_join_success"), "success");
      window.location.reload();
    } catch (error) {
      showToast(t("messages.team_join_error"), "error");
    }
  };

  const handleLeaveTeam = async (teamId: string): Promise<void> => {
    if (
      tournament?.id === undefined ||
      tournament.id === "" ||
      teamId === undefined ||
      teamId === "" ||
      userId === undefined ||
      userId === ""
    ) {
      showToast(t("messages.invalid_team_leave_data"), "error");
      return;
    }

    try {
      await api.tournaments.leaveTeam(tournament.id, teamId, userId);
      showToast(t("messages.team_leave_success"), "success");
      window.location.reload();
    } catch (error) {
      showToast(t("messages.team_leave_error"), "error");
    }
  };

  const handleKickPlayer = async (
    teamId: string,
    playerId: string
  ): Promise<void> => {
    try {
      await api.tournaments.kickPlayerFromTeam(tournament.id, teamId, playerId);
      showToast(t("messages.player_kicked_success"), "success");
      window.location.reload();
    } catch (error) {
      showToast(t("messages.player_kick_error"), "error");
    }
  };

  const handleDeleteTeam = async (teamId: string): Promise<void> => {
    try {
      await api.tournaments.removeTeamFromTournament(tournament.id, teamId);
      showToast(t("messages.team_deleted_success"), "success");
      window.location.reload();
    } catch (error) {
      showToast(error, "error");
    }
  };

  const generateTeamTable = (): React.ReactNode => {
    const tableHeaders = [
      t("team_info_labels.team_name_label"),
      t("team_info_labels.players_label"),
      t("team_info_labels.actions_label")
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
            {tournament.teams?.map((team, index) => {
              const maxPlayersReached =
                (team.players.length ?? 0) >=
                (tournament.playersPerTeam ?? Infinity);

              return (
                <TableRow key={index}>
                  <TableCell>{team.name}</TableCell>
                  <TableCell>
                    {team.players.map((player) => (
                      <Box key={player.id} display="flex" alignItems="center">
                        <Typography>
                          {player.firstName} {player.lastName}
                        </Typography>
                        {isUserTheCreator && (
                          <Button
                            variant="outlined"
                            color="secondary"
                            size="small"
                            onClick={async () => {
                              await handleKickPlayer(team.id, player.id);
                            }}
                            sx={{ marginLeft: "8px" }}
                          >
                            {t("buttons.kick_player_button")}
                          </Button>
                        )}
                      </Box>
                    ))}
                  </TableCell>
                  <TableCell>
                    {userTeam?.id === team.id ? (
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={async () => {
                          await handleLeaveTeam(team.id);
                        }}
                      >
                        {t("buttons.leave_team_button")}
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={async () => {
                          await handleJoinTeam(team.id);
                        }}
                        disabled={
                          (userTeam !== null && userTeam !== undefined) ||
                          tournamentFull ||
                          maxPlayersReached
                        }
                      >
                        {t("buttons.join_team_button")}
                      </Button>
                    )}
                    {isUserTheCreator && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={async () => {
                          await handleDeleteTeam(team.id);
                        }}
                        sx={{ marginLeft: "8px" }}
                      >
                        {t("buttons.delete_team_button")}
                      </Button>
                    )}
                    {maxPlayersReached && (
                      <Typography
                        variant="body2"
                        color="error"
                        sx={{ marginTop: "4px" }}
                      >
                        {t("messages.max_players_per_team_reached")}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
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

      {isUserTheCreator && (
        <>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              navigate(`/tournaments/create-team/${tournament.id}`);
            }}
            disabled={maxTeamsReached}
          >
            {t("buttons.create_team_button")}
          </Button>
          {maxTeamsReached && (
            <Typography variant="body2" color="error" sx={{ marginTop: "8px" }}>
              {t("messages.max_teams_reached")}
            </Typography>
          )}
        </>
      )}

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

      <Box>
        <Typography variant="subtitle1">
          <strong>{t("upcoming_tournament_view.max_teams")}:</strong>{" "}
          {tournament.numberOfTeams}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle1">
          <strong>{t("upcoming_tournament_view.max_players_per_team")}:</strong>{" "}
          {tournament.playersPerTeam}
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
    </Container>
  );
};

export default TeamRoundRobinUpcomingView;
