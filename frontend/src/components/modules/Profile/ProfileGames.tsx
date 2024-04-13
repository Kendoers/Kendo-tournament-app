import React, { useState, useEffect } from "react";
import {
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Box
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import api from "api/axios";
import type { Tournament, Match, User } from "types/models";
import { useTranslation } from "react-i18next";
import FilterTournaments from "../Tournaments/FilterTournaments";

const ProfileGames: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { t } = useTranslation();
  // State to keep track if filters have been applied
  const [filtersApplied, setFiltersApplied] = useState(false);
  // State for storing possible filtered tournaments
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>(
    []
  );

  // If nothing filtered, get right tournaments again
  useEffect(() => {
    if (filteredTournaments.length === 0) {
      // tournaments; not sure what here
    }
  }, [filtersApplied]);

  // Function to receive filtered tournaments from FilterTournaments
  const handleFilteredTournaments = (
    filteredTournaments: Tournament[],
    areFiltersApplied: boolean
  ): void => {
    setFiltersApplied(areFiltersApplied);
    if (filteredTournaments !== null) {
      setFilteredTournaments(filteredTournaments);
    } else {
      // is undefined, sort somehow?
    }
  };

  useEffect(() => {
    const fetchTournaments = async (): Promise<void> => {
      try {
        const tournamentsData = await api.tournaments.getAll();
        const filteredTournaments = tournamentsData.filter((tournament) =>
          tournament.players.some((player) => player.id === userId)
        );
        // Sort tournaments based on startDate
        filteredTournaments.sort(
          (a, b) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
        setTournaments(filteredTournaments);
      } catch (error) {
        console.error("Error fetching tournaments:", error);
      }
    };

    void fetchTournaments();
  }, [userId]);

  // Function to get player name by ID
  const getPlayerNameById = (players: User[], playerId: string): string => {
    const player = players.find((player) => player.id === playerId);
    if (player != null) {
      return `${player.firstName} ${player.lastName}`;
    } else {
      return "Unknown Player";
    }
  };

  // Function to get matches of a player in a tournament
  const getPlayerMatches = (
    tournament: Tournament,
    userId: string
  ): Match[] => {
    return tournament.matchSchedule.filter((match) =>
      match.players.some((player) => player.id === userId)
    );
  };

  if (userId == null) {
    return <div>No user ID available</div>;
  }

  return (
    <Box>
      <FilterTournaments
        parentComponent="ProfileGames"
        tournaments={tournaments}
        handleFilteredTournaments={handleFilteredTournaments}
      />
      {/* Map through tournaments and print info */}
      {tournaments.map((tournament, index) => (
        <Box key={index} style={{ marginBottom: "20px" }}>
          <Typography variant="h5" sx={{ marginBottom: 4, marginTop: 4 }}>
            {tournament.name}
            <Typography
              component="span"
              variant="subtitle1"
              sx={{ display: "inline", marginLeft: 1 }}
            >
              {/* Print tournament start date */}
              {new Date(tournament.startDate).toLocaleDateString("en-US", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              })}
              {/* Check if tournament duration spans multiple days and print end date if necessary */}
              {new Date(tournament.startDate).toLocaleDateString("en-US", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              }) !==
                new Date(tournament.endDate).toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric"
                }) &&
                ` - ${new Date(tournament.endDate).toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric"
                })}`}
            </Typography>
          </Typography>
          {/* Map through tournament matches and print each */}
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "20px"
            }}
          >
            {getPlayerMatches(tournament, userId).map((match, matchIndex) => (
              <Card key={matchIndex} variant="outlined" sx={{ mb: 1 }}>
                <CardActionArea
                  onClick={() => {
                    navigate(`/tournaments/${tournament.id}/match/${match.id}`);
                  }}
                >
                  <CardContent>
                    <Typography textAlign="center">
                      {/* Print match details, including player names and scores */}
                      {t("profile.match")} {matchIndex + 1}:
                      <br />
                      <span>
                        {getPlayerNameById(
                          tournament.players,
                          match.players[0].id
                        )}
                        {"  "}
                        {match.player1Score}
                        {" - "}
                        {match.player2Score}
                        {"  "}
                        {getPlayerNameById(
                          tournament.players,
                          match.players[1].id
                        )}
                      </span>
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default ProfileGames;
