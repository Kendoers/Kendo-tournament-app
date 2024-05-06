import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CardActionArea
} from "@mui/material";
import { type Match, type User } from "types/models";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PlayerName, { checkSameNames } from "../../PlayerNames";
import { useTournament } from "context/TournamentContext";

interface BracketProps {
  match: Match;
  players: User[];
}

const Bracket: React.FC<BracketProps> = ({ match, players }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tournament = useTournament();

  const [haveSameNames, setHaveSameNames] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | undefined>(match.winner);
  const [player1Font, setPlayer1Font] = useState<string>("regular");
  const [player2Font, setPlayer2Font] = useState<string>("regular");
  const [player1Color, setPlayer1Color] = useState<string>("black");
  const [player2Color, setPlayer2Color] = useState<string>("black");
  const [player1Lining, setPlayer1Lining] = useState<string>("");
  const [player2Lining, setPlayer2Lining] = useState<string>("");

  useEffect(() => {
    const result = checkSameNames(tournament);
    setHaveSameNames(result);
  }, []);

  useEffect(() => {
    setWinner(match.winner);
  }, [match]);

  // Find the players in the players array using their IDs
  const player1 = players.find(
    (player) => player.id === match.players[0].id
  ) as User;
  const player2 = players.find(
    (player) => player.id === match.players[1]?.id
  ) as User;

  const isWinnerDeclared = winner !== undefined;

  useEffect(() => {
    setPlayer1Font(winner === player1.id ? "700" : "400");
    setPlayer2Font(winner === player2?.id ? "700" : "400");
    setPlayer1Color(winner === player1.id ? "black" : "#666666");
    setPlayer2Color(winner === player2?.id ? "black" : "#666666");
    setPlayer1Lining(winner === player1.id ? "underline" : "");
    setPlayer2Lining(winner === player2?.id ? "underline" : "");
  }, [winner, players]);

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

  const officialsInfo = [];

  if (match.elapsedTime <= 0 && match.winner === undefined) {
    // Match is upcoming and is not a bye
    const timerPerson = match.timeKeeper ?? undefined;
    const pointMaker = match.pointMaker ?? undefined;

    // depending on which roles are missing for the match, print them under button

    if (timerPerson === undefined && pointMaker === undefined) {
      officialsInfo.push(
        t("tournament_view_labels.missing_timer"),
        t("tournament_view_labels.missing_and")
      );
    } else {
      if (timerPerson === undefined) {
        officialsInfo.push(t("tournament_view_labels.missing_timer"));
      }
      if (pointMaker === undefined) {
        officialsInfo.push(t("tournament_view_labels.missing_point_maker"));
      }
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 5
      }}
    >
      <Card variant="outlined" sx={{ mb: 1 }}>
        <CardActionArea
          onClick={() => {
            if (players.length === 2) {
              navigate(`match/${match.id}`);
            } else {
              // No match details to display for a bye
            }
          }}
        >
          <CardContent>
            <Typography
              textAlign="center"
              style={{
                fontWeight: player1Font,
                color: player1Color,
                textDecoration: player1Lining
              }}
            >
              {player1Name}
            </Typography>
            <Typography textAlign="center"> vs</Typography>
            <Typography
              textAlign="center"
              style={{
                fontWeight: player2Font,
                color: player2Color,
                textDecoration: player2Lining
              }}
            >
              {player2Name}
            </Typography>
            {isWinnerDeclared && (
              <Typography textAlign="center" variant="h6">
                <span
                  style={{
                    fontWeight: player1Font,
                    color: player1Color,
                    textDecoration: player1Lining
                  }}
                >
                  {match.player1Score}
                </span>{" "}
                -{" "}
                <span
                  style={{
                    fontWeight: player2Font,
                    color: player2Color,
                    textDecoration: player2Lining
                  }}
                >
                  {match.player2Score}
                </span>
              </Typography>
            )}
            {match.elapsedTime <= 0 &&
              officialsInfo.map((info, index) => (
                <Typography textAlign="center" key={index} variant="body2">
                  {info}
                </Typography>
              ))}
          </CardContent>
        </CardActionArea>
      </Card>
    </Box>
  );
};

export default Bracket;
