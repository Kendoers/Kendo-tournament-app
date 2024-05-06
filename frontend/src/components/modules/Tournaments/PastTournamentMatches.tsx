import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTournaments } from "context/TournamentsContext";
import type { User, Match, TournamentType } from "types/models";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Tab,
  Tabs
} from "@mui/material";
import { useTranslation } from "react-i18next";
import CopyToClipboardButton from "./OngoingTournament/CopyToClipboardButton";
import {
  getPlayerNames,
  Scoreboard,
  updatePlayerStats,
  type TournamentPlayer
} from "./OngoingTournament/RoundRobin/RoundRobinTournamentView";
import { checkSameNames } from "./PlayerNames";
import { findTournamentWinner } from "utils/TournamentUtils";

type Rounds = Record<string, Match[]>; // Define the type for rounds

const PastTournamentMatches: React.FC = () => {
  const { tournamentId } = useParams();
  const { past } = useTournaments();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabTypes = ["scoreboard", "matches"] as const;
  const defaultTab = "scoreboard";
  const currentTab = searchParams.get("tab") ?? defaultTab;
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [haveSameNames, setHaveSameNames] = useState<boolean>(false);

  // Tournament types with their translations
  const tournamentTypes: Record<TournamentType, string> = {
    "Round Robin": "types.round_robin",
    Playoff: "types.playoff",
    "Preliminary Playoff": "types.preliminary_playoff",
    Swiss: "types.swiss"
  };

  const selectedTournament = past.find(
    (tournament) => tournament.id === tournamentId
  );

  if (selectedTournament === null || selectedTournament === undefined) {
    return <div>Tournament not found.</div>; // lisää lokalisaatuo
  }

  const showTabs =
    selectedTournament.type === "Round Robin" ||
    selectedTournament.type === "Swiss";

  // Function to get player name by ID
  const getPlayerNameById = (players: User[], playerId: string): string => {
    const player = players.find((player) => player.id === playerId);
    if (player != null) {
      return `${player.firstName} ${player.lastName}`;
    } else {
      return "Unknown Player";
    }
  };

  useEffect(() => {
    if (selectedTournament !== undefined) {
      const result = checkSameNames(selectedTournament);
      setHaveSameNames(result);
      getPlayerNames(selectedTournament, setPlayers);
      updatePlayerStats(selectedTournament, setPlayers);
    }
  }, []);

  useEffect(() => {
    if (currentTab === null || !tabTypes.some((tab) => tab === currentTab)) {
      setSearchParams((params) => {
        params.set("tab", defaultTab);
        return params;
      });
    }
  }, [currentTab]);

  const handleTabChange = (tab: string): void => {
    setSearchParams((params) => {
      params.set("tab", tab);
      return params;
    });
  };

  const rounds: Rounds = {}; // To sort matches per rounds
  selectedTournament.matchSchedule.forEach((match) => {
    const round = match.tournamentRound;
    if (round !== undefined) {
      if (!(round in rounds)) {
        rounds[round] = [];
      }
      rounds[round].push(match);
    }
  });

  const ShowMatches: React.FC<{ rounds: Rounds }> = ({ rounds }) => (
    <div>
      {/* Map through tournament rounds and matches and print each */}
      {Object.entries(rounds).map(([round, matches]) => (
        <div key={round}>
          {/* Add round print only if there is more than one round */}
          {Object.keys(rounds).length > 1 && (
            <Typography variant="h6" sx={{ marginTop: 2 }}>
              {t("tournament_view_labels.round")} {round}
            </Typography>
          )}
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "20px"
            }}
          >
            {matches.map((match, matchIndex) => (
              <Card key={matchIndex} variant="outlined" sx={{ mb: 1 }}>
                <CardActionArea
                  onClick={() => {
                    if (match.players.length === 2) {
                      navigate(
                        `/tournaments/${selectedTournament.id}/match/${match.id}`
                      );
                    } else {
                      // No match details to display for a bye
                    }
                  }}
                >
                  <CardContent>
                    <Typography textAlign="center">
                      {/* Print match details, including player names and scores */}
                      {t("profile.match")} {matchIndex + 1}:
                      <br />
                      {match.players.length === 1 ? (
                        // Handle matches with only one player (bye)
                        <span>
                          {getPlayerNameById(
                            selectedTournament.players,
                            match.players[0].id
                          )}
                          {" - "}
                          {"BYE"}
                        </span>
                      ) : (
                        <span>
                          {getPlayerNameById(
                            selectedTournament.players,
                            match.players[0].id
                          )}
                          {"  "}
                          {match.player1Score}
                          {" - "}
                          {match.player2Score}
                          {"  "}
                          {getPlayerNameById(
                            selectedTournament.players,
                            match.players[1].id
                          )}
                        </span>
                      )}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </div>
      ))}
    </div>
  );

  const printTournamentWinner = (): string => {
    const winner = findTournamentWinner(selectedTournament);
    if (winner === undefined) {
      return t("tournament_view_labels.no_winner");
    } else {
      return t("tournament_view_labels.tournament_winner") + winner;
    }
  };

  return (
    <div>
      <Grid container alignItems="center" spacing={4} marginBottom={2}>
        <Grid item>
          <Typography variant="h4">{selectedTournament.name}</Typography>
        </Grid>
        <Grid item>
          <CopyToClipboardButton />
        </Grid>
      </Grid>
      <Typography variant="h6" sx={{ marginBottom: 2 }}>
        {t(tournamentTypes[selectedTournament.type])}
      </Typography>
      <Typography variant="subtitle1" sx={{ marginBottom: 2 }}>
        {printTournamentWinner()}
      </Typography>

      {showTabs && (
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => {
            handleTabChange(newValue);
          }}
        >
          <Tab
            label={t("tournament_view_labels.scoreboard")}
            value="scoreboard"
          />
          <Tab label={t("tournament_view_labels.matches")} value="matches" />
        </Tabs>
      )}

      {showTabs && currentTab === "scoreboard" && (
        <Scoreboard players={players} haveSameNames={haveSameNames} />
      )}

      {showTabs && currentTab === "matches" && <ShowMatches rounds={rounds} />}

      {!showTabs && <ShowMatches rounds={rounds} />}
    </div>
  );
};

export default PastTournamentMatches;
