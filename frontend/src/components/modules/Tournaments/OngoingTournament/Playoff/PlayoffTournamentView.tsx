import React, { useEffect, useState } from "react";
import Bracket from "./TournamentBracket";
import { type User, type Match, type Tournament } from "types/models";
import { useTournament } from "context/TournamentContext";
import { Typography, Box, Grid, Divider } from "@mui/material";
import ErrorModal from "components/common/ErrorModal";
import { useNavigate } from "react-router-dom";
import routePaths from "routes/route-paths";
import { useTranslation } from "react-i18next";
import { useAuth } from "context/AuthContext";
import DeleteUserFromTournament from "../DeleteUserFromTournament";
import CopyToClipboardButton from "../CopyToClipboardButton";
import { useSocket } from "context/SocketContext";
import { joinTournament, leaveTournament } from "sockets/emit";
import api from "api/axios";
import useToast from "hooks/useToast";
import { allMatchesPlayed, findTournamentWinner } from "utils/TournamentUtils";
import { mapNumberToLetter } from "utils/helperFunctions";

interface Rounds extends Record<number, Match[]> {}

const PlayoffTournamentView: React.FC = () => {
  const initialTournamentData = useTournament();
  const tournament = useTournament();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { userId } = useAuth();
  const showToast = useToast();
  const isUserTheCreator = tournament.creator.id === userId;
  const [hasJoined, setHasJoined] = useState(false);

  const isPlayoff = tournament.type === "Playoff";

  const { tournamentData: socketData } = useSocket();

  const [tournamentData, setTournamentData] = useState<Tournament>(
    initialTournamentData
  );

  // Listening to tournaments websocket
  useEffect(() => {
    if (initialTournamentData.id !== undefined && !hasJoined) {
      joinTournament(initialTournamentData.id);
      setHasJoined(true);

      return () => {
        leaveTournament(initialTournamentData.id);
        setHasJoined(false);
      };
    }
  }, [initialTournamentData.id]);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        if (socketData !== undefined) {
          setTournamentData(socketData);
        } else {
          const data: Tournament = await api.tournaments.getTournament(
            initialTournamentData.id
          );
          setTournamentData(data);
        }
      } catch (error) {
        showToast(error, "error");
      }
    };

    void fetchData();
  }, [socketData]);

  let playoffMatches: Match[];
  let totalRounds = 0;
  let highestPreliminaryRound = 0;

  const { type, matchSchedule, players, groups, playersToPlayoffsPerGroup } =
    tournamentData;

  if (type === "Preliminary Playoff") {
    // Calculate initial round number for playoff matches
    for (const match of matchSchedule) {
      if (match.type !== "playoff") {
        highestPreliminaryRound = Math.max(
          highestPreliminaryRound,
          match.tournamentRound
        );
      }
    }

    // Filter playoff matches from the matchSchedule
    playoffMatches = matchSchedule.filter((match) => match.type === "playoff");
    // Calculate the total number of rounds, assuming it's a single-elimination tournament
    if (groups !== undefined && playersToPlayoffsPerGroup !== undefined) {
      totalRounds = Math.ceil(
        Math.log2(playersToPlayoffsPerGroup * groups.length)
      );
    }
  } else {
    // Is normal playoff tournament
    playoffMatches = matchSchedule;
    totalRounds = Math.ceil(Math.log2(players.length));
  }

  if (error !== null) {
    return (
      <ErrorModal
        open={true}
        onClose={() => {
          navigate(routePaths.homeRoute);
        }}
        errorMessage={error}
      />
    );
  }

  try {
    // Group matches by tournamentRound
    const rounds: Rounds = playoffMatches.reduce<Rounds>((acc, match) => {
      let round = 0;
      if (type === "Preliminary Playoff") {
        round = match.tournamentRound - highestPreliminaryRound;
      } else {
        round = match.tournamentRound;
      }

      if (acc[round] === undefined) {
        acc[round] = [];
      }
      acc[round].push(match);
      return acc;
    }, {});

    return (
      <Box
        sx={{
          overflowX: "auto",
          "&::-webkit-scrollbar": { display: "none" }
        }}
      >
        {isPlayoff && (
          <Grid container alignItems="center" spacing={4}>
            <Grid item>
              <Typography variant="h4">{tournament.name}</Typography>
              {allMatchesPlayed(tournamentData) && (
                <Typography variant="subtitle1">
                  <span>
                    {t("frontpage_labels.winner")}
                    {": "}
                    {findTournamentWinner(tournamentData)}
                  </span>
                </Typography>
              )}
            </Grid>
            <Grid item>
              <CopyToClipboardButton />
            </Grid>
          </Grid>
        )}

        <Grid
          container
          spacing={2}
          justifyContent="flex-start"
          alignItems="flex-start"
        >
          {Object.entries(rounds).map(([roundNumber, matches], index) => {
            const roundNrPrint = index + 1;
            return (
              <React.Fragment key={roundNumber}>
                {index > 0 && <Divider orientation="vertical" flexItem />}
                <Grid item>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      minWidth: 300
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        marginBottom: 2,
                        textAlign: "center",
                        textDecoration: "underline"
                      }}
                    >
                      {parseInt(roundNumber) === totalRounds &&
                      tournament.type === "Playoff"
                        ? t("tournament_view_labels.final")
                        : `${t(
                            "tournament_view_labels.round"
                          )} ${roundNrPrint}`}
                    </Typography>
                    {matches.map((match: Match) => {
                      const tempPlayers: User[] = match.players.map(
                        (matchPlayer) => {
                          const player = players.find(
                            (p) => p.id === matchPlayer.id
                          );
                          if (player === null || player === undefined) {
                            throw new Error();
                          }
                          return player;
                        }
                      );
                      return (
                        <Grid item key={match.id}>
                          <Typography
                            variant="body2"
                            style={{ textAlign: "center" }}
                          >
                            {t("tournament_view_labels.court_number")}
                            {": "}
                            {mapNumberToLetter(match.courtNumber)}
                          </Typography>
                          <Bracket
                            key={match.id}
                            players={tempPlayers}
                            match={match}
                          />
                        </Grid>
                      );
                    })}
                  </Box>
                </Grid>
              </React.Fragment>
            );
          })}
        </Grid>
        {isUserTheCreator && <DeleteUserFromTournament />}
      </Box>
    );
  } catch (e) {
    if (e instanceof Error) {
      setError(e.message);
    } else {
      setError(t("messages.unexpected_error_happened"));
    }
  }
};

export default PlayoffTournamentView;
