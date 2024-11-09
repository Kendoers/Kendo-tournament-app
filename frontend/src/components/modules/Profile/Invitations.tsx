import React, { useEffect, useState } from "react";
import { Typography, Box, CircularProgress, Button, Chip } from "@mui/material";
import api from "api/axios";
import { useAuth } from "context/AuthContext";
import { useNavigate } from "react-router-dom";
import { type Tournament } from "types/models";
import { useTranslation } from "react-i18next";

const Invitations: React.FC = () => {
  const [invitations, setInvitations] = useState<string[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (userId === undefined) return;

    const fetchInvitations = async (): Promise<void> => {
      setLoading(true);
      try {
        const invitationIds = await api.user.getPlayerInvitations(userId);
        setInvitations(invitationIds);

        const tournamentPromises = invitationIds.map(
          async (id) => await api.tournaments.getTournament(id)
        );

        const tournamentDetails = await Promise.all(tournamentPromises);

        const sortedTournaments = tournamentDetails.sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );

        setTournaments(sortedTournaments);
      } catch (err) {
        console.error("Failed to fetch invitations:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchInvitations();
  }, [userId]);

  if (userId === undefined || loading) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100%"
      >
        <CircularProgress />
      </Box>
    );
  }

  const now = new Date();
  const upcomingTournaments = tournaments.filter(
    (tournament) => new Date(tournament.startDate) > now
  );

  return (
    <Box>
      {invitations.length > 0 && upcomingTournaments.length > 0 ? (
        upcomingTournaments.map((tournament) => {
          const hasJoined = tournament.players.some(
            (player) => player.id === userId
          );

          return (
            <Box
              key={tournament.id}
              display="flex"
              flexDirection="column"
              gap={1}
              mb={3}
              p={2}
              sx={{
                border: "1px solid #ddd",
                borderRadius: "8px"
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {tournament.name}
                {hasJoined && (
                  <Chip
                    label={t("invite.accepted")}
                    color="success"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
              <Typography>
                <span style={{ fontWeight: "bold" }}>
                  {t("frontpage_labels.start_date")}:
                </span>{" "}
                {new Date(tournament.startDate).toLocaleDateString()}
              </Typography>
              <Typography>
                <span style={{ fontWeight: "bold" }}>
                  {t("created_tournament.location_header")}:
                </span>{" "}
                {tournament.location}
              </Typography>
              <Typography>
                <span style={{ fontWeight: "bold" }}>
                  {t("invite.players")}:{" "}
                </span>
                {tournament.players.length} / {tournament.maxPlayers}
              </Typography>
              <Button
                variant={hasJoined ? "outlined" : "contained"}
                color={hasJoined ? "secondary" : "primary"}
                onClick={() => {
                  navigate(`/tournaments/${tournament.id}`);
                }}
              >
                {t("invite.check_out")}
              </Button>
            </Box>
          );
        })
      ) : (
        <Typography p={2}>{t("invite.no_invitations")}</Typography>
      )}
    </Box>
  );
};

export default Invitations;
