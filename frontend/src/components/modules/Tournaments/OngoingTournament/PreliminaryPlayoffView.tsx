import React, { useState, useEffect, useRef } from "react";
import {
  Tabs,
  Tab,
  Button,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Grid
} from "@mui/material";
import { type Match, type Tournament } from "types/models";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTournament } from "context/TournamentContext";
import { useTranslation } from "react-i18next";
import {
  type TournamentPlayer,
  Scoreboard,
  Matches,
  updatePlayerStats,
  getPlayerNames,
  sortMatches,
  createMatchButton
} from "./RoundRobinTournamentView";
import PlayoffTournamentView from "./PlayoffTournamentView";
import CopyToClipboardButton from "./CopyToClipboardButton";
import { checkSameNames } from "../PlayerNames";
import { useAuth } from "context/AuthContext";
import ModifyGroupsButton from "./ModifyGroupsButton";

// Sorts the matches of the tournament by groups
const sortMatchesByGroup = (tournament: Tournament): Map<number, Match[]> => {
  const matchesByGroup = new Map<number, Match[]>();

  if (tournament.groups === undefined) {
    return matchesByGroup; // return empty map
  }

  // Initialize matches array for each group
  tournament.groups.forEach((group, index) => {
    matchesByGroup.set(index, []);
  });

  // Iterate through matchSchedule to sort matches by group
  for (const match of tournament.matchSchedule) {
    // Find the group index for each match
    const groupIndex = tournament.groups.findIndex((group) =>
      match.players.every((player) =>
        group.some((member) => member === player.id)
      )
    );

    // Add match to the corresponding group's matches array
    if (groupIndex !== -1) {
      const matches = matchesByGroup.get(groupIndex);
      if (matches !== null && matches !== undefined) {
        matches.push(match);
      }
    }
  }
  return matchesByGroup;
};

const PreliminaryPlayoffView: React.FC = () => {
  const tournament = useTournament();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const initialRender = useRef(true);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [ongoingMatches, setOngoingMatches] = useState<Map<number, Match[]>>(
    new Map()
  );
  const [upcomingMatches, setUpcomingMatches] = useState<Map<number, Match[]>>(
    new Map()
  );
  const [pastMatches, setPastMatches] = useState<Map<number, Match[]>>(
    new Map()
  );
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [ongoingElements, setOngoingElements] = useState<React.ReactNode[]>([]);
  const [upcomingElements, setUpcomingElements] = useState<React.ReactNode[]>(
    []
  );
  const [pastElements, setPastElements] = useState<React.ReactNode[]>([]);
  const [tournamentStage, setTournamentStage] = useState("preliminary");
  const [showMatches, setShowMatches] = useState(false);
  const defaultTab = "preliminary";
  const [previousTab, setPreviousTab] = useState(defaultTab); // Keep track of the previous tab
  const [searchParams, setSearchParams] = useSearchParams();
  const [haveSameNames, setHaveSameNames] = useState<boolean>(false);
  const tabTypes = ["preliminary", "playoff"] as const;
  const currentTab = searchParams.get("tab") ?? defaultTab;
  const { userId } = useAuth();
  const isUserTheCreator = tournament.creator.id === userId;

  useEffect(() => {
    const result = checkSameNames(tournament);
    setHaveSameNames(result);
  }, []);

  const handleTabChange = (tab: string): void => {
    setSearchParams((params) => {
      params.set("tab", tab);
      return params;
    });
  };

  // Renders back  thescoreboard view in the tab
  const handleBackToGroupView = (): void => {
    if (currentTab === "preliminary") {
      setSelectedGroup(null);
      setShowMatches(false);
    }
  };

  // Function to get players for a specific group. Helper to render scoreboards.
  const getPlayersForGroup = (groupIds: string[]): TournamentPlayer[] => {
    return groupIds
      .map((groupId) => {
        // Find the player in the players array by ID
        return players.find((player) => player.id === groupId);
      })
      .filter((player) => player !== undefined) as TournamentPlayer[]; // Filter out undefined values and assert the type
  };

  // Handles view change when scoreboard is clicked
  const handleScoreboardClick = (groupId: number): void => {
    setSelectedGroup(groupId);
    setShowMatches(true);
  };

  useEffect(() => {
    if (currentTab === null || !tabTypes.some((tab) => tab === currentTab)) {
      setSearchParams((params) => {
        params.set("tab", defaultTab);
        return params;
      });
    }
  }, [currentTab]);

  useEffect(() => {
    if (currentTab !== previousTab) {
      setPreviousTab(currentTab);
    }
  }, [currentTab, previousTab]);

  useEffect(() => {
    getPlayerNames(tournament, setPlayers);
    const matchesByGroup = sortMatchesByGroup(tournament);
    // Loop through each group and sort match schedule for each group
    for (const [group, matches] of matchesByGroup.entries()) {
      const sortedMatches = sortMatches(matches);
      setOngoingMatches((prevOngoingMatches) => {
        const newOngoingMatches = new Map<number, Match[]>(prevOngoingMatches);
        newOngoingMatches.set(group, sortedMatches.ongoingMatches);
        return newOngoingMatches;
      });
      setUpcomingMatches((prevUpcomingMatches) => {
        const newUpcomingMatches = new Map<number, Match[]>(
          prevUpcomingMatches
        );
        newUpcomingMatches.set(group, sortedMatches.upcomingMatches);
        return newUpcomingMatches;
      });
      setPastMatches((prevPastMatches) => {
        const newPastMatches = new Map<number, Match[]>(prevPastMatches);
        newPastMatches.set(group, sortedMatches.pastMatches);
        return newPastMatches;
      });
    }
  }, [tournament]);

  useEffect(() => {
    // Determine the tournament stage based on match types whenever matchSchedule changes
    const playoffMatchExists = tournament.matchSchedule.some(
      (match) => match.type === "playoff"
    );

    if (playoffMatchExists) {
      setTournamentStage("playoff");
    } else {
      setTournamentStage("preliminary");
    }
  }, [tournament.matchSchedule]);

  useEffect(() => {
    if (initialRender.current && players.length > 0) {
      initialRender.current = false;
      updatePlayerStats(tournament, setPlayers);
    }
  }, [players, tournament]);

  // When a scoreboard is clicked, find out matches for that group to show
  useEffect(() => {
    if (selectedGroup !== null) {
      const generateMatchElements = (): {
        ongoingElements: React.ReactNode[];
        upcomingElements: React.ReactNode[];
        pastElements: React.ReactNode[];
      } => {
        const ongoingElements = Array.from(
          ongoingMatches.get(selectedGroup) ?? []
        )
          .filter((match) => match.type !== "playoff") // Filter playoff matches from this view
          .map((match) =>
            createMatchButton(match, players, navigate, t, haveSameNames, {
              variant: "contained"
            })
          );

        const upcomingElements = Array.from(
          upcomingMatches.get(selectedGroup) ?? []
        )
          .filter((match) => match.type !== "playoff") // Filter playoff matches from this view
          .map((match) =>
            createMatchButton(match, players, navigate, t, haveSameNames, {
              variant: "contained",
              color: "info"
            })
          );

        const pastElements = Array.from(pastMatches.get(selectedGroup) ?? [])
          .filter((match) => match.type !== "playoff") // Filter playoff matches from this view
          .map((match) =>
            createMatchButton(match, players, navigate, t, haveSameNames, {
              variant: "contained",
              color: "secondary"
            })
          );

        return { ongoingElements, upcomingElements, pastElements };
      };

      const { ongoingElements, upcomingElements, pastElements } =
        generateMatchElements();
      setOngoingElements(ongoingElements);
      setUpcomingElements(upcomingElements);
      setPastElements(pastElements);
    }
  }, [selectedGroup, ongoingMatches, upcomingMatches, pastMatches]);

  return (
    <>
      <Grid container alignItems="center" spacing={4}>
        <Grid item>
          <Typography variant="h4">{tournament.name}</Typography>
        </Grid>
        <Grid item>
          <CopyToClipboardButton />
        </Grid>
        <Grid item>{isUserTheCreator && <ModifyGroupsButton />}</Grid>
      </Grid>

      <Tabs
        value={currentTab}
        onChange={(_, newValue) => {
          handleTabChange(newValue);
        }}
      >
        <Tab label={t("types.preliminary")} value="preliminary" />
        <Tab label={t("types.playoff")} value="playoff" />
      </Tabs>
      {currentTab === "preliminary" && (
        <>
          {!showMatches &&
            tournament.groups?.map((groupIds, index) => (
              <Card key={index}>
                <CardActionArea
                  onClick={() => {
                    handleScoreboardClick(index);
                  }}
                >
                  <CardContent>
                    <Typography variant="h5" component="h2">
                      {t("tournament_view_labels.group")} {index + 1}
                    </Typography>
                    <Scoreboard
                      players={getPlayersForGroup(groupIds)}
                      haveSameNames={haveSameNames}
                    />
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          {showMatches && (
            <div>
              <Button onClick={handleBackToGroupView}>
                <ArrowBackIcon /> {t("navigation.back_to_group_view")}
              </Button>
              <Typography variant="h4">
                {t("tournament_view_labels.group")}{" "}
                {selectedGroup !== null ? selectedGroup + 1 : ""}
              </Typography>
              <Matches
                ongoingMatchElements={ongoingElements}
                upcomingMatchElements={upcomingElements}
                pastMatchElements={pastElements}
              />
            </div>
          )}
        </>
      )}
      {currentTab === "playoff" && tournamentStage !== "playoff" && (
        <div>{t("tournament_view_labels.playoff_stage_not_started")}</div>
      )}
      {currentTab === "playoff" && tournamentStage === "playoff" && (
        <div>
          <PlayoffTournamentView />
        </div>
      )}
    </>
  );
};

export default PreliminaryPlayoffView;
