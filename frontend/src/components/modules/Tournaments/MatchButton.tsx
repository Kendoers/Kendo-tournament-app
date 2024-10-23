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
  type ButtonProps
} from "@mui/material";
import type { TournamentPlayer } from "./OngoingTournament/RoundRobin/RoundRobinTournamentView";
import type { Match, Tournament } from "types/models";
import PlayerName from "./PlayerNames";
import api from "api/axios";
import type { ChangeCourtTimeRequest } from "types/requests";

interface MatchButtonProps {
  match: Match;
  players: TournamentPlayer[];
  navigate: (path: string) => void;
  t: (key: string) => string;
  haveSameNames: boolean;
  props: ButtonProps;
  isUserTheCreator: boolean;
  tournamentData: Tournament;
}

const MatchButton: React.FC<MatchButtonProps> = ({
  match,
  players,
  navigate,
  t,
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

  // Function to handle modal open/close
  const handleOpen = (): void => {
    setEditMode(true);
  };

  const handleClose = (): void => {
    setEditMode(false);
  };

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
        console.log("Court and time updated successfully");
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

  return (
    <div style={{ marginBottom: "10px", marginTop: "10px" }} key={match.id}>
      <Box display="flex" alignItems="center" marginBottom={"10px"}>
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
      </Box>
      {match.scheduledTime !== "XX:XX" ? (
        <Typography variant="body1" marginBottom={"10px"}>
          {t("tournament_view_labels.match_start_clock")}
          {": "}
          {newTime}
        </Typography>
      ) : (
        <Typography variant="body1" marginBottom={"10px"}>
          {t("tournament_view_labels.no_scheduled_time")}
        </Typography>
      )}
      <Typography variant="body1" marginBottom={"10px"}>
        {t("tournament_view_labels.court_number")}
        {": "}
        {match.courtNumber}
      </Typography>
      {isUserTheCreator && (
        <Button onClick={handleOpen}>
          {t("tournament_view_labels.edit_court_time")}
        </Button>
      )}
      {officialsInfo !== undefined && match.winner === undefined && (
        <Typography variant="body2">{officialsInfo}</Typography>
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
                  {court}
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
