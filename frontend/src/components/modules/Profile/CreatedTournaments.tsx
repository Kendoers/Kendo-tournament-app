import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Box,
  Button
} from "@mui/material";
import { useAuth } from "context/AuthContext";
import api from "api/axios";
import type { Tournament } from "types/models";
import { useTranslation } from "react-i18next";

const CreatedTournaments: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { t } = useTranslation();

  // State for storing the user's created tournaments
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async (): Promise<void> => {
      try {
        const tournamentsData = await api.tournaments.getAll();
        // Filter tournaments to include only those created by the current user
        const filteredTournaments = tournamentsData.filter(
          (tournament) => tournament.creator.id === userId
        );
        // Sort tournaments based on startDate
        filteredTournaments.sort(
          (a, b) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
        // Update state with filtered and sorted tournaments
        setTournaments(filteredTournaments);
      } catch (error) {
        // Error handling can be added here if necessary
      } finally {
        setLoading(false);
      }
    };

    void fetchTournaments();
  }, [userId]);

  if (loading) {
    return <></>;
  }

  return (
    <Box>
      {tournaments.length > 0 ? (
        tournaments.map((tournament, index) => (
          <Card key={index} style={{ marginBottom: "20px" }}>
            <CardActionArea
              onClick={() => {
                navigate(`/tournaments/own-tournament/${tournament.id}`);
              }}
            >
              <CardContent>
                {/* Display tournament name and start/end dates */}
                <Typography variant="h5" sx={{ marginBottom: 4, marginTop: 4 }}>
                  {tournament.name}
                  <Typography
                    component="span"
                    variant="subtitle1"
                    sx={{ display: "inline", marginLeft: 1 }}
                  >
                    {new Date(tournament.startDate).toLocaleDateString(
                      "en-US",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                      }
                    )}
                    {new Date(tournament.startDate).toLocaleDateString(
                      "en-US",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                      }
                    ) !==
                      new Date(tournament.endDate).toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                      }) &&
                      ` - ${new Date(tournament.endDate).toLocaleDateString(
                        "en-US",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric"
                        }
                      )}`}
                  </Typography>
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))
      ) : (
        <Box>
          <Typography variant="h6" marginTop="40px" marginLeft="15px">
            You have not created yet any tournaments
          </Typography>
          <Button
            type="button"
            variant="outlined"
            color="primary"
            onClick={() => {
              navigate("/tournaments/new-tournament");
            }}
            sx={{
              fontSize: "14px",
              color: "white",
              backgroundColor: "#db4744",
              borderRadius: "20px",
              width: "200px",
              height: "40px",
              textTransform: "none",
              boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.3)",
              transition: "transform 0.3s",
              marginLeft: "15px",
              marginTop: "30px",
              "&::before": {
                content: '"+"',
                fontSize: "24px",
                position: "absolute",
                left: "12px"
              },
              "&::after": {
                content: `"${t("frontpage_labels.create_tournament")}"`
              },
              "&:hover": {
                backgroundColor: "#e57373"
              }
            }}
          ></Button>
        </Box>
      )}
    </Box>
  );
};

export default CreatedTournaments;
