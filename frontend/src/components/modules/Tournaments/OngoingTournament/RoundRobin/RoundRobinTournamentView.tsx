import React, { useState, useEffect, useRef } from "react";
import {
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  type ButtonProps,
  Grid,
  Box
} from "@mui/material";
import { type User, type Match, type Tournament } from "types/models";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTournament } from "context/TournamentContext";
import { useTranslation } from "react-i18next";
import { useAuth } from "context/AuthContext";
import DeleteUserFromTournament from "../DeleteUserFromTournament";
import CopyToClipboardButton from "../CopyToClipboardButton";
import { useSocket } from "context/SocketContext";
import { joinTournament, leaveTournament } from "sockets/emit";
import PlayerName, { checkSameNames } from "../../PlayerNames";
import api from "api/axios";
import useToast from "hooks/useToast";
import { allMatchesPlayed, findTournamentWinner } from "utils/TournamentUtils";

export interface TournamentPlayer {
  id: string;
  firstName: string;
  lastName: string;
  points: number;
  ippons: number;
  wins: number;
  losses: number;
  ties: number;
}

interface ScoreboardProps {
  players: TournamentPlayer[];
  onClick?: () => void; // Make onClick prop optional
  haveSameNames: boolean;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  players,
  onClick,
  haveSameNames
}) => {
  const { t } = useTranslation();

  const generateTableCells = (player: TournamentPlayer): React.ReactNode[] => {
    return Object.values(player).map((value, index) => {
      if (index < 3) {
        // We want to skip the ID and name properties
        return null;
      }

      return (
        <TableCell key={index}>
          <Typography>{value}</Typography>
        </TableCell>
      );
    });
  };

  const generateTable = (): React.ReactNode => {
    const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

    const tableHeaders = [
      t("tournament_view_labels.name"),
      t("tournament_view_labels.points"),
      t("tournament_view_labels.ippons"),
      t("tournament_view_labels.wins"),
      t("tournament_view_labels.losses"),
      t("tournament_view_labels.ties")
    ];

    return (
      <div>
        <TableContainer component={Paper}>
          <Table onClick={onClick}>
            <TableHead>
              <TableRow>
                {tableHeaders.map((header, index) => (
                  <TableCell key={index}>{header}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPlayers.map((player, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {/* Render PlayerName component for each player */}
                    <PlayerName
                      firstName={player.firstName}
                      lastName={player.lastName}
                      sameNames={haveSameNames}
                    />
                  </TableCell>
                  {generateTableCells(player)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    );
  };

  return <div>{generateTable()}</div>;
};

export const Matches: React.FC<{
  ongoingMatchElements: React.ReactNode[];
  upcomingMatchElements: React.ReactNode[];
  pastMatchElements: React.ReactNode[];
}> = ({ ongoingMatchElements, upcomingMatchElements, pastMatchElements }) => {
  const { t } = useTranslation();

  return (
    <div>
      <div>
        <Typography variant="h5">
          {t("tournament_view_labels.ongoing_matches")}
        </Typography>
      </div>
      <div>{ongoingMatchElements}</div>

      <div>
        <Typography variant="h5">
          {t("tournament_view_labels.upcoming_matches")}
        </Typography>
      </div>
      <div>{upcomingMatchElements}</div>
      <div>
        <Typography variant="h5">
          {t("tournament_view_labels.past_matches")}
        </Typography>
      </div>
      <div>{pastMatchElements}</div>
    </div>
  );
};

export const updatePlayerStats = (
  tournament: Tournament,
  setPlayers: React.Dispatch<React.SetStateAction<TournamentPlayer[]>>
): void => {
  setPlayers((prevPlayers: TournamentPlayer[]) => {
    const players = [...prevPlayers];

    // reset the players points before recalculation, resolves matches being counted multiple times
    const updatedPlayers: TournamentPlayer[] = players.map((player) => ({
      ...player,
      points: 0,
      ippons: 0,
      wins: 0,
      losses: 0,
      ties: 0
    }));

    for (const match of tournament.matchSchedule) {
      // Exclude unfinished and playoff matches in preliminaryplayoff view scoreboard
      if (match.type === "playoff" || match.endTimestamp === undefined) {
        continue;
      }

      const [player1Id, player2Id] = match.players.map((player) => player.id);

      // Find the TournamentPlayer objects corresponding to the player IDs
      const player1Index = updatedPlayers.findIndex(
        (player) => player.id === player1Id
      );
      const player2Index = updatedPlayers.findIndex(
        (player) => player.id === player2Id
      );

      // Add wins and losses
      if (match.winner !== undefined) {
        const winnerIndex = updatedPlayers.findIndex(
          (player) => player.id === match.winner
        );
        const loserIndex =
          winnerIndex === player1Index ? player2Index : player1Index;

        // Update stats, win equals 3 points
        updatedPlayers[winnerIndex].wins += 1;
        updatedPlayers[winnerIndex].points += 3;
        updatedPlayers[loserIndex].losses += 1;
      }

      // Add ties
      if (
        match.winner === undefined &&
        (match.endTimestamp !== undefined ||
          match.elapsedTime >= match.matchTime)
      ) {
        // Update their stats, tie equals 1 point
        updatedPlayers[player1Index].ties += 1;
        updatedPlayers[player1Index].points += 1;
        updatedPlayers[player2Index].ties += 1;
        updatedPlayers[player2Index].points += 1;
      }

      // Add ippons
      updatedPlayers[player1Index].ippons += match.player1Score;
      updatedPlayers[player2Index].ippons += match.player2Score;
    }
    return updatedPlayers;
  });
};

export const getPlayerNames = (
  tournament: Tournament,
  setPlayers: React.Dispatch<React.SetStateAction<TournamentPlayer[]>>
): void => {
  setPlayers((prevPlayers: TournamentPlayer[]) => {
    const updatedPlayers = [...prevPlayers];
    const playersObjects: User[] = tournament.players;
    if (playersObjects.length > 0) {
      for (const playerObject of playersObjects) {
        const playerExists = updatedPlayers.some(
          (player) => player.id === playerObject.id
        );
        if (!playerExists) {
          updatedPlayers.push({
            id: playerObject.id,
            firstName: playerObject.firstName,
            lastName: playerObject.lastName,
            points: 0,
            ippons: 0,
            wins: 0,
            losses: 0,
            ties: 0
          });
        }
      }
    }
    return updatedPlayers;
  });
};

export const sortMatches = (
  matches: Match[]
): {
  ongoingMatches: Match[];
  upcomingMatches: Match[];
  pastMatches: Match[];
} => {
  const ongoingMatches = matches.filter(
    (match) => match.elapsedTime > 0 && match.endTimestamp === undefined
  );
  const upcomingMatches = matches.filter(
    (match) =>
      match.elapsedTime <= 0 &&
      match.endTimestamp === undefined &&
      match.winner === undefined
  );
  const pastMatches = matches.filter(
    (match) =>
      (match.elapsedTime > 0 && match.endTimestamp !== undefined) ||
      (match.endTimestamp !== undefined && match.winner !== undefined) ||
      (match.elapsedTime === 0 && match.winner !== undefined)
  );
  return { ongoingMatches, upcomingMatches, pastMatches };
};

export const createMatchButton = (
  match: Match,
  players: TournamentPlayer[],
  navigate: (path: string) => void,
  t: (key: string) => string,
  haveSameNames: boolean,
  props: ButtonProps
): React.ReactNode => {
  // Find the players in the players array using their IDs
  const player1 = players.find(
    (player) => player.id === match.players[0].id
  ) as TournamentPlayer;
  const player2 = players.find(
    (player) => player.id === match.players[1]?.id
  ) as TournamentPlayer;

  // Get the names of the players
  const player1Name = (
    <PlayerName
      firstName={player1.firstName}
      lastName={player1.lastName}
      sameNames={haveSameNames}
    />
  );
  const player2Name =
    player2 !== undefined ? (
      <PlayerName
        firstName={player2.firstName}
        lastName={player2.lastName}
        sameNames={haveSameNames}
      />
    ) : (
      <PlayerName firstName="BYE" lastName="" sameNames={false} />
    );

  let officialsInfo = "";

  if (match.elapsedTime <= 0 && match.winner === undefined) {
    // Match is upcoming
    const timerPerson = match.timeKeeper ?? undefined;
    const pointMaker = match.pointMaker ?? undefined;

    // depending on which roles are missing for the match, print them under button
    if (timerPerson === undefined && pointMaker === undefined) {
      officialsInfo = t("tournament_view_labels.missing_both");
    } else {
      if (timerPerson === undefined) {
        officialsInfo += t("tournament_view_labels.missing_timer");
      }
      if (pointMaker === undefined) {
        officialsInfo += t("tournament_view_labels.missing_point_maker");
      }
    }
  }

  return (
    <div style={{ marginBottom: "10px" }} key={match.id}>
      <Box display="flex" alignItems="center">
        <Button
          onClick={() => {
            if (match.players.length === 2) {
              navigate(`match/${match.id}`);
            } else {
              // No match details to display for a bye
            }
          }}
          {...props}
        >
          {player1Name}
          {" - "}
          {player2Name}
        </Button>
        <Typography variant="body1" marginLeft="10px">
          {t("tournament_view_labels.court_number")}
          {": "}
          {match.courtNumber}
        </Typography>
      </Box>
      {officialsInfo !== undefined && match.winner === undefined && (
        <Typography variant="body2">{officialsInfo}</Typography>
      )}
    </div>
  );
};

const RoundRobinTournamentView: React.FC = () => {
  const initialTournamentData = useTournament();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tournament = useTournament();

  const [hasJoined, setHasJoined] = useState(false);
  const initialRender = useRef(true);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [ongoingMatches, setOngoingMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [pastMatches, setPastMatches] = useState<Match[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [haveSameNames, setHaveSameNames] = useState<boolean>(false);
  const tabTypes = ["scoreboard", "matches"] as const;
  const defaultTab = "scoreboard";
  const currentTab = searchParams.get("tab") ?? defaultTab;
  const { userId } = useAuth();
  const isUserTheCreator = tournament.creator.id === userId;
  const showToast = useToast();

  useEffect(() => {
    const result = checkSameNames(tournament);
    setHaveSameNames(result);
  }, []);

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

  useEffect(() => {
    getPlayerNames(tournamentData, setPlayers);
    const sortedMatches = sortMatches(tournamentData.matchSchedule);
    setOngoingMatches(sortedMatches.ongoingMatches);
    setUpcomingMatches(sortedMatches.upcomingMatches);
    setPastMatches(sortedMatches.pastMatches);
  }, [tournamentData]);

  const prevMatchScheduleRef = useRef(tournamentData.matchSchedule);

  useEffect(() => {
    // Function to check if there are any recently finished matches
    const hasFinishedMatches = (
      currentMatches: Match[],
      previousMatches: Match[]
    ): boolean => {
      return currentMatches.some((match) => {
        if (match.endTimestamp === undefined) return false; // Skip if match hasn't ended
        // Search for a match with the same ID in previousMatches to compare its state to the current one
        const prevMatch = previousMatches.find((m) => m.id === match.id);
        // Returns true if either the match was not present in previousMatches (meaning
        // it's a new match that has ended since the last check) or if the endTimestamp has changed
        // (indicating the match has recently concluded)
        return (
          prevMatch === undefined ||
          prevMatch.endTimestamp !== match.endTimestamp
        );
      });
    };

    if (
      hasFinishedMatches(
        tournamentData.matchSchedule,
        prevMatchScheduleRef.current
      )
    ) {
      updatePlayerStats(tournamentData, setPlayers);
    }

    // Update the ref with the current matchSchedule after running checks
    prevMatchScheduleRef.current = tournamentData.matchSchedule;
  }, [tournamentData.matchSchedule]);

  useEffect(() => {
    if (initialRender.current && players.length > 0) {
      initialRender.current = false;
      updatePlayerStats(tournamentData, setPlayers);
    }
  }, [players, tournamentData]);

  const ongoingElements = ongoingMatches.map((match) =>
    createMatchButton(match, players, navigate, t, haveSameNames, {
      variant: "contained"
    })
  );
  const upcomingElements = upcomingMatches.map((match) =>
    createMatchButton(match, players, navigate, t, haveSameNames, {
      variant: "contained",
      color: "info"
    })
  );
  const pastElements = pastMatches.map((match) =>
    createMatchButton(match, players, navigate, t, haveSameNames, {
      variant: "contained",
      color: "secondary"
    })
  );

  return (
    <>
      <Grid container alignItems="center" spacing={4}>
        <Grid item>
          <Typography variant="h4">{tournamentData.name}</Typography>
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
      {currentTab === "scoreboard" && (
        <Scoreboard players={players} haveSameNames={haveSameNames} />
      )}
      {currentTab === "matches" && (
        <Matches
          ongoingMatchElements={ongoingElements}
          upcomingMatchElements={upcomingElements}
          pastMatchElements={pastElements}
        />
      )}
      {isUserTheCreator && currentTab === "matches" && (
        <DeleteUserFromTournament />
      )}
    </>
  );
};

export default RoundRobinTournamentView;
