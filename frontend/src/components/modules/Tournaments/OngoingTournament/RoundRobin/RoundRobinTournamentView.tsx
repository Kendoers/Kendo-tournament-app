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
  Select,
  MenuItem,
  Button,
  Box
} from "@mui/material";
import { type User, type Match, type Tournament } from "types/models";
import { useSearchParams } from "react-router-dom";
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
import useMediaQuery from "@mui/material/useMediaQuery";
import { allMatchesPlayed, findTournamentWinner } from "utils/TournamentUtils";
import MatchButton from "../../MatchButton";
import UpcomingTournamentView from "../../UpcomingTournamentView";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { keyframes } from "@mui/system";
import { format } from "date-fns";

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
  const isMobile = useMediaQuery("(max-width:600px)");

  // Toggle states for each match section
  const [showOngoing, setShowOngoing] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showPast, setShowPast] = useState(true);
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab");

  useEffect(() => {
    if (!isMobile) {
      setShowOngoing(true);
      setShowUpcoming(true);
      setShowPast(true);
    }
  }, [isMobile]);

  const renderSection = (
    title: string,
    show: boolean,
    setShow: React.Dispatch<React.SetStateAction<boolean>>,
    elements: React.ReactNode[]
  ): JSX.Element => (
    <Box
      display="flex"
      flexDirection="column"
      gap="10px"
      marginBottom={"15px"}
      component="div"
    >
      <Box
        display="flex"
        gap="10px"
        alignItems="center"
        justifyContent="space-between"
        padding={isMobile ? "5px 10px" : "0"}
        borderRadius={isMobile ? "8px" : "0"}
        sx={{ backgroundColor: isMobile ? "#FFE1E1" : "transparent" }}
        component="div"
      >
        <Typography
          variant="h6"
          sx={{
            fontSize: "13px",
            fontWeight: "bold",
            justifyContent: isMobile ? "center" : "flex-start"
          }}
        >
          {title}
        </Typography>
        {isMobile && (
          <Button
            onClick={() => {
              setShow(!show);
            }}
            variant="text"
            sx={{ fontSize: "20px", color: "black" }}
          >
            {show ? <ArrowDropDownIcon /> : <ArrowDropUpIcon />}
          </Button>
        )}
      </Box>
      {show && (
        <Box
          display="flex"
          gap="15px"
          justifyContent="space-between"
          flexWrap="wrap"
          marginTop="10px"
          marginLeft="10px"
          component="div"
        >
          {elements.length > 0 ? (
            elements
          ) : (
            <Typography variant="body2" color="textSecondary" fontSize={"13px"}>
              {t("tournament_view_labels.no_matches")}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );

  return (
    <Box padding="20px 0" component="div">
      {/* Ongoing and Upcoming Matches */}
      {currentTab !== "completedMatches" &&
        renderSection(
          t("tournament_view_labels.ongoing_matches"),
          showOngoing,
          setShowOngoing,
          ongoingMatchElements
        )}

      {currentTab !== "completedMatches" &&
        renderSection(
          t("tournament_view_labels.upcoming_matches"),
          showUpcoming,
          setShowUpcoming,
          upcomingMatchElements
        )}

      {/* Past Matches */}
      {currentTab === "completedMatches" &&
        renderSection(
          t("tournament_view_labels.past_matches"),
          showPast,
          setShowPast,
          pastMatchElements
        )}
    </Box>
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

  // Filter and sort upcoming matches by scheduled time, placing undefined times at the end
  const upcomingMatches = matches
    .filter(
      (match) =>
        match.elapsedTime <= 0 &&
        match.endTimestamp === undefined &&
        match.winner === undefined
    )
    .sort((a, b) => {
      const timeA = a.scheduledTime;
      const timeB = b.scheduledTime;

      // If `scheduledTime` is undefined, place it at the end
      if (timeA === null) return 1;
      if (timeB === null) return -1;

      // Convert `scheduledTime` to Date for comparison
      const dateA = new Date(`1970-01-01T${timeA}`);
      const dateB = new Date(`1970-01-01T${timeB}`);

      return dateA.getTime() - dateB.getTime();
    });

  const pastMatches = matches.filter(
    (match) =>
      (match.elapsedTime > 0 && match.endTimestamp !== undefined) ||
      (match.endTimestamp !== undefined && match.winner !== undefined) ||
      (match.elapsedTime === 0 && match.winner !== undefined)
  );

  return { ongoingMatches, upcomingMatches, pastMatches };
};

const RoundRobinTournamentView: React.FC = () => {
  const initialTournamentData = useTournament();
  const { t } = useTranslation();
  const tournament = useTournament();
  const mobile = useMediaQuery("(max-width:600px)");

  const [hasJoined, setHasJoined] = useState(false);
  const initialRender = useRef(true);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [ongoingMatches, setOngoingMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [pastMatches, setPastMatches] = useState<Match[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [haveSameNames, setHaveSameNames] = useState<boolean>(false);
  const [showOnlyUserMatches, setShowOnlyUserMatches] = useState(false);
  const tabTypes = [
    "tournamentInfo",
    "scoreboard",
    "ongoingUpcomingMatches",
    "completedMatches"
  ] as const;
  const defaultTab = "scoreboard";
  const currentTab = searchParams.get("tab") ?? defaultTab;
  const { userId } = useAuth();
  const isUserTheCreator = tournament.creator.id === userId;
  const showToast = useToast();

  // Filter matches based on `showOnlyUserMatches` and `userId`
  const filteredOngoingMatches = showOnlyUserMatches
    ? ongoingMatches.filter((match) =>
        match.players.some((player) => player.id === userId)
      )
    : ongoingMatches;

  const filteredUpcomingMatches = showOnlyUserMatches
    ? upcomingMatches.filter((match) =>
        match.players.some((player) => player.id === userId)
      )
    : upcomingMatches;

  const filteredPastMatches = showOnlyUserMatches
    ? pastMatches.filter((match) =>
        match.players.some((player) => player.id === userId)
      )
    : pastMatches;

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

  const handleFilterToggle = (): void => {
    setShowOnlyUserMatches((prev) => !prev);
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

  const ongoingElements = filteredOngoingMatches.map((match) => (
    <MatchButton
      key={match.id}
      match={match}
      players={players}
      haveSameNames={haveSameNames}
      props={{
        variant: "contained"
      }}
      isUserTheCreator={isUserTheCreator}
      tournamentData={tournamentData}
    />
  ));

  const upcomingElements = filteredUpcomingMatches.map((match) => (
    <MatchButton
      key={match.id}
      match={match}
      players={players}
      haveSameNames={haveSameNames}
      props={{
        variant: "contained",
        color: "info"
      }}
      isUserTheCreator={isUserTheCreator}
      tournamentData={tournamentData}
    />
  ));

  const pastElements = filteredPastMatches.map((match) => (
    <MatchButton
      key={match.id}
      match={match}
      players={players}
      haveSameNames={haveSameNames}
      props={{
        variant: "contained",
        color: "secondary"
      }}
      isUserTheCreator={isUserTheCreator}
      tournamentData={tournamentData}
    />
  ));

  const flash = keyframes`
    0% { transform: scale(1); }
    100% { transform: scale(1.05); }
  `;

  const formattedStartDate =
    tournamentData.startDate !== null
      ? format(new Date(tournamentData.startDate), "MMM dd, yyyy")
      : "";
  const formattedEndDate =
    tournamentData.endDate !== null
      ? format(new Date(tournamentData.endDate), "MMM dd, yyyy")
      : "";

  return (
    <>
      <Typography
        variant="body1"
        fontSize="10px"
        sx={{ display: "flex", gap: "5px", alignItems: "center" }}
      >
        {formattedStartDate}
        {formattedEndDate !== null && ` - ${formattedEndDate}`}
      </Typography>
      <Typography
        variant="body1"
        fontSize="10px"
        sx={{ display: "flex", gap: "5px", alignItems: "center" }}
      >
        {tournamentData.location !== null && `${tournamentData.location}`}
      </Typography>{" "}
      <Typography variant="h4">{tournamentData.name}</Typography>
      {allMatchesPlayed(tournamentData) && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            width: "100%"
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#db4744",
              width: "90%",
              padding: "10px 20px",
              borderRadius: "10px",
              boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
              color: "white",
              marginTop: "20px",
              animation: `${flash} 1.5s infinite alternate`
            }}
          >
            <EmojiEventsIcon
              sx={{ fontSize: "2rem", marginRight: "8px", color: "#FFD700" }}
            />
            <Typography
              variant="h5"
              sx={{ fontWeight: "bold", fontSize: "1.25rem" }}
            >
              {t("frontpage_labels.winner")}
              {": "}
              <span
                style={{
                  color: "#FFD700",
                  fontSize: "1.5rem",
                  fontWeight: "bold"
                }}
              >
                {findTournamentWinner(tournamentData)}
              </span>
            </Typography>
          </Box>
        </Box>
      )}
      <div
        style={{
          position: "absolute",
          right: "15px",
          top: mobile ? "44px" : "64px",
          transform: "translateY(50%)"
        }}
      >
        <CopyToClipboardButton />
      </div>
      {mobile ? (
        <Select
          value={currentTab}
          onChange={(event) => {
            handleTabChange(event.target.value);
          }}
          style={{ marginBottom: "10px", alignItems: "center", padding: "0" }}
          sx={{
            border: "2px solid #db4744",
            fontSize: "13px",
            color: "#db4744",
            margin: "10px 0",
            width: "100%"
          }}
        >
          <MenuItem value="tournamentInfo" sx={{ fontSize: "13px" }}>
            {t("tournament_view_labels.tournament_info")}
          </MenuItem>
          <MenuItem value="scoreboard" sx={{ fontSize: "13px" }}>
            {t("tournament_view_labels.scoreboard")}
          </MenuItem>
          <MenuItem value="ongoingUpcomingMatches" sx={{ fontSize: "13px" }}>
            {t("tournament_view_labels.ongoing_upcoming_matches_tab")}
          </MenuItem>
          <MenuItem value="completedMatches" sx={{ fontSize: "13px" }}>
            {t("tournament_view_labels.past_matches_tab")}
          </MenuItem>
        </Select>
      ) : (
        <>
          <Tabs
            value={currentTab}
            onChange={(_, newValue) => {
              handleTabChange(newValue);
            }}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ margin: "10px 0" }}
          >
            <Tab
              label={t("tournament_view_labels.tournament_info")}
              value="tournamentInfo"
              sx={{ fontSize: "13px" }}
            />
            <Tab
              label={t("tournament_view_labels.scoreboard")}
              value="scoreboard"
              sx={{ fontSize: "13px" }}
            />
            <Tab
              label={t("tournament_view_labels.ongoing_upcoming_matches_tab")}
              value="ongoingUpcomingMatches"
              sx={{ fontSize: "13px" }}
            />
            <Tab
              label={t("tournament_view_labels.past_matches_tab")}
              value="completedMatches"
              sx={{ fontSize: "13px" }}
            />
          </Tabs>
        </>
      )}
      {(currentTab === "ongoingUpcomingMatches" ||
        currentTab === "completedMatches") && (
        <Button
          variant="outlined"
          onClick={handleFilterToggle}
          sx={{ fontSize: "10px", borderRadius: "25px", margin: "10px 0" }}
        >
          {showOnlyUserMatches
            ? t("buttons.show_all_matches")
            : t("buttons.show_my_matches")}
        </Button>
      )}
      {currentTab === "tournamentInfo" && (
        <div style={{ padding: "10px 0 0 0" }}>
          <UpcomingTournamentView ongoing />
        </div>
      )}
      {currentTab === "scoreboard" && (
        <Scoreboard players={players} haveSameNames={haveSameNames} />
      )}
      {currentTab === "ongoingUpcomingMatches" && (
        <Matches
          ongoingMatchElements={ongoingElements}
          upcomingMatchElements={upcomingElements}
          pastMatchElements={[]}
        />
      )}
      {currentTab === "completedMatches" && (
        <Matches
          ongoingMatchElements={[]}
          upcomingMatchElements={[]}
          pastMatchElements={pastElements}
        />
      )}
      {isUserTheCreator && currentTab === "ongoingUpcomingMatches" && (
        <DeleteUserFromTournament />
      )}
    </>
  );
};

export default RoundRobinTournamentView;
