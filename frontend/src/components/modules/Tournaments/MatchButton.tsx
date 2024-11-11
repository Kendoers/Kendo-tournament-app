import React, { useState } from "react";
import {
  Button,
  Box,
  Typography,
  TextField,
  Modal,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useMediaQuery,
  type ButtonProps
} from "@mui/material";
import type { TournamentPlayer } from "./OngoingTournament/RoundRobin/RoundRobinTournamentView";
import type { Match, Tournament } from "types/models";
import PlayerName from "./PlayerNames";
import api from "api/axios";
import type { ChangeCourtTimeRequest } from "types/requests";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { mapNumberToLetter } from "utils/helperFunctions";

interface MatchButtonProps {
  match: Match;
  players: TournamentPlayer[];
  haveSameNames: boolean;
  props: ButtonProps;
  isUserTheCreator: boolean;
  tournamentData: Tournament;
}

const MatchButton: React.FC<MatchButtonProps> = ({
  match,
  players,
  haveSameNames,
  props,
  isUserTheCreator,
  tournamentData
}) => {
  // State to track form input and modal open state
  const [editMode, setEditMode] = useState(false);
  const [newCourtNumber, setNewCourtNumber] = useState<number>(
    match.courtNumber
  );
  const [newTime, setNewTime] = useState(
    match.scheduledTime === "XX:XX" ? "00:00" : match.scheduledTime
  );
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Function to handle modal open/close
  const handleOpen = (): void => {
    setEditMode(true);
  };

  const handleClose = (): void => {
    setEditMode(false);
  };

  const isMobile = useMediaQuery("(max-width:600px)");

  // Function to handle change court time form submit
  const handleSubmit = async (): Promise<void> => {
    const updates: Partial<ChangeCourtTimeRequest> = {};

    // Check if the court number has changed
    if (Number(newCourtNumber) !== match.courtNumber) {
      updates.courtNumber = Number(newCourtNumber);
    }

    // Check if the scheduled time has changed
    if (newTime !== match.scheduledTime) {
      updates.scheduledTime = newTime;
    }

    // If there are updates, send the request
    if (Object.keys(updates).length > 0) {
      try {
        await api.match.changeCourtAndTime(match.id, updates);
      } catch (error) {
        console.error("Error updating court and time:", error);
      }
    } else {
      console.log("No changes detected, no update needed");
    }

    setEditMode(false); // Close modal after submit
  };

  // Find the players in the players array using their IDs
  const player1 = players.find(
    (player) => player.id === match.players[0].id
  ) as TournamentPlayer;
  const player2 = players.find(
    (player) => player.id === match.players[1]?.id
  ) as TournamentPlayer;

  // Get the names of the players
  const player1Name =
    player1 !== undefined ? (
      <PlayerName
        firstName={player1.firstName}
        lastName={player1.lastName}
        sameNames={haveSameNames}
      />
    ) : (
      <PlayerName firstName="NotFound" lastName="" sameNames={false} />
    );

  const player2Name =
    player2 !== undefined ? (
      <PlayerName
        firstName={player2.firstName}
        lastName={player2.lastName}
        sameNames={haveSameNames}
      />
    ) : (
      <PlayerName firstName="NotFound2" lastName="" sameNames={false} />
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

  // Generate court number options based on the numberOfCourts in tournamentData
  const courtOptions = Array.from(
    { length: tournamentData.numberOfCourts },
    (_, i) => i + 1
  );

  const isOngoing: boolean =
    match.elapsedTime > 0 && match.endTimestamp === undefined;
  const isFinished: boolean =
    (match.elapsedTime > 0 && match.endTimestamp !== undefined) ||
    (match.endTimestamp !== undefined && match.winner !== undefined) ||
    (match.elapsedTime === 0 && match.winner !== undefined);

  const winnerBackgroundColor = "#ABE2A8";

  const player1Styles = {
    bgcolor:
      isFinished && match.player1Score === 2
        ? winnerBackgroundColor
        : "transparent"
  };
  const player2Styles = {
    bgcolor:
      isFinished && match.player2Score === 2
        ? winnerBackgroundColor
        : "transparent"
  };

  return (
    <div
      style={{
        marginBottom: "10px",
        display: "inline-block",
        minWidth: "260px",
        width: isMobile ? "100%" : "auto"
      }}
      key={match.id}
    >
      <Box>
        {!isFinished &&
          (isOngoing ? (
            <Typography variant="body1" marginBottom={"5px"} fontSize={"13px"}>
              {t("tournament_view_labels.ongoing")}{" "}
              {`${Math.floor(match.elapsedTime / 60000)}'`}
            </Typography>
          ) : match.scheduledTime !== "XX:XX" ? (
            <Typography variant="body1" marginBottom={"5px"} fontSize={"13px"}>
              {t("tournament_view_labels.match_start_clock")}
              {": "}
              {match.scheduledTime}
            </Typography>
          ) : (
            <Typography variant="body1" marginBottom={"5px"} fontSize={"13px"}>
              {t("tournament_view_labels.no_scheduled_time")}
            </Typography>
          ))}

        {isUserTheCreator && !isFinished && (
          <Button
            onClick={handleOpen}
            style={{ fontSize: "13px", padding: "0px", marginBottom: "5px" }}
          >
            {t("tournament_view_labels.edit_court_time")}
          </Button>
        )}
        <Box
          onClick={() => {
            if (match.players.length === 2) {
              navigate(`match/${match.id}`);
            }
          }}
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
          border={1}
          borderRadius={"10px"}
          gap={1}
          p={1}
          sx={{
            width: "auto",
            margin: "0 auto",
            cursor: "pointer",
            borderColor: isOngoing ? "#28CC3B" : "black"
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="center">
            <Typography
              variant="body1"
              sx={{
                display: "inline-flex",
                padding: "4px 8px",
                borderRadius: "5px",
                ...player1Styles
              }}
            >
              {player1Name}{" "}
              {isOngoing || isFinished ? ` ${match.player1Score}` : ""}
            </Typography>
            <Typography variant="body1" sx={{ margin: "0 8px" }}>
              {" - "}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                display: "inline-flex",
                padding: "4px 8px",
                borderRadius: "5px",
                ...player2Styles
              }}
            >
              {player2Name}{" "}
              {isOngoing || isFinished ? ` ${match.player2Score}` : ""}
            </Typography>
          </Box>

          <Typography variant="body1" fontSize={"15px"}>
            {t("tournament_view_labels.court_number")}:{" "}
            {mapNumberToLetter(match.courtNumber)}
          </Typography>
        </Box>
      </Box>
      {officialsInfo !== undefined && match.winner === undefined && (
        <Typography variant="body2" marginTop={"5px"} fontSize={"13px"}>
          {officialsInfo}
        </Typography>
      )}
      {/* Modal for editing court and time */}
      <Modal open={editMode} onClose={handleClose}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4
          }}
        >
          <Typography variant="h6">
            {t("tournament_view_labels.edit_court_time")}
          </Typography>
          {/* Time input for scheduling */}
          <TextField
            label={t("tournament_view_labels.scheduled_time")}
            type="time"
            value={newTime}
            onChange={(e) => {
              setNewTime(e.target.value);
            }}
            fullWidth
            margin="normal"
            InputLabelProps={{
              shrink: true
            }}
            inputProps={{
              step: 300 // 5 minutes
            }}
          />
          {/* Select component for choosing court number */}
          <FormControl fullWidth margin="normal">
            <InputLabel>{t("tournament_view_labels.court_number")}</InputLabel>
            <Select
              label={t("tournament_view_labels.court_number")}
              value={newCourtNumber}
              onChange={(e) => {
                setNewCourtNumber(Number(e.target.value));
              }}
              type="number"
            >
              {courtOptions.map((court) => (
                <MenuItem key={court} value={court}>
                  {mapNumberToLetter(court)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {t("buttons.save_button")}
          </Button>
        </Box>
      </Modal>
    </div>
  );
};

export default MatchButton;
