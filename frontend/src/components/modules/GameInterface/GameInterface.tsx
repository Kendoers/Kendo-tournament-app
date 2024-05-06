import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid
} from "@mui/material";
import PointTable from "./PointTable";
import Timer from "./Timer";
import OfficialButtons from "./OfficialButtons";
import TimerButton from "./TimerButton";
import api from "api/axios";
import { useParams } from "react-router-dom";
import { type AddPointRequest } from "types/requests";
import type {
  PointType,
  PlayerColor,
  Match,
  MatchPlayer,
  MatchType,
  MatchTime,
  User
} from "types/models";
import "./GameInterface.css";
import { useAuth } from "context/AuthContext";
import { joinMatch, leaveMatch } from "sockets/emit";
import { useSocket } from "context/SocketContext";
import useToast from "hooks/useToast";
import { useTournament } from "context/TournamentContext";
import Loader from "components/common/Loader";
import ErrorModal from "components/common/ErrorModal";
import { useTranslation } from "react-i18next";
import ModifyDeletePoints from "./ModifyDeletePoints";
import PlayerName, { checkSameNames } from "../Tournaments/PlayerNames";

export interface MatchData {
  timerTime: number;
  players: MatchPlayer[];
  firstNames: string[];
  lastNames: string[];
  winner: string | undefined;
  endTimeStamp: Date | undefined;
  timeKeeper: string | undefined;
  pointMaker: string | undefined;
  startTimestamp: Date | undefined;
  isTimerOn: boolean;
  elapsedTime: number;
  isOvertime: boolean;
  type: MatchType;
  time: MatchTime;
  courtNumber: number;
}

const GameInterface: React.FC = () => {
  const { t } = useTranslation();

  const [haveSameNames, setHaveSameNames] = useState<boolean>(false);

  useEffect(() => {
    const result = checkSameNames(tournament);
    setHaveSameNames(result);
  }, []);

  const [matchInfo, setMatchInfo] = useState<MatchData>({
    timerTime: 0,
    players: [],
    firstNames: [],
    lastNames: [],
    winner: undefined,
    endTimeStamp: undefined,
    timeKeeper: undefined,
    pointMaker: undefined,
    startTimestamp: undefined,
    isTimerOn: false,
    elapsedTime: 0,
    isOvertime: false,
    type: "group",
    time: 300000,
    courtNumber: 1
  });

  const [openPoints, setOpenPoints] = useState(false);
  const [openRoles, setOpenRoles] = useState(false);
  const [selectedButton, setSelectedButton] = useState<string>("");
  const [timer, setTimer] = useState<number>(matchInfo.timerTime);
  const [playerColor, setPlayerColor] = useState<PlayerColor>("red");
  const [hasJoined, setHasJoined] = useState(false);
  const [mostRecentPointType, setMostRecentPointType] =
    useState<PointType | null>(null);

  const { matchId } = useParams();
  const { userId } = useAuth();
  const { matchInfo: matchInfoFromSocket } = useSocket();
  const showToast = useToast();
  const tournament = useTournament();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  // state handlers for whether or not checkbox is checked
  const [timeKeeper, setTimeKeeper] = useState<boolean>(false);
  const [pointMaker, setPointMaker] = useState<boolean>(false);
  const [timeKeeperInfo, setTimeKeeperInfo] = useState<User | null>(null);
  const [pointMakerInfo, setPointMakerInfo] = useState<User | null>(null);

  // Listening to matches websocket
  useEffect(() => {
    if (matchId !== undefined && !hasJoined) {
      joinMatch(matchId);
      setHasJoined(true);

      return () => {
        leaveMatch(matchId);
        setHasJoined(false);
      };
    }
  }, [matchId]);

  useEffect(() => {
    // Check for a saved most recent point type in sessionStorage
    const savedPointType = sessionStorage.getItem("mostRecentPointType");
    if (savedPointType !== null) {
      setMostRecentPointType(savedPointType as PointType);
    }
  }, []);

  // Fetching match data
  useEffect(() => {
    const getMatchData = async (): Promise<void> => {
      try {
        let matchPlayers: MatchPlayer[] = [];
        const playersFirstNames: string[] = [];
        const playersLastNames: string[] = [];
        let matchWinner: string | undefined;
        let timerPerson: string | undefined;
        let pointPerson: string | undefined;
        let time: number = 0;
        let matchEndTimeStamp: Date | undefined;
        let startTime: Date | undefined;
        let timer: boolean = false;
        let elapsedtime: number = 0;
        let isovertime: boolean = false;
        let matchType: MatchType = "group";
        let matchTime: MatchTime = 300000;
        let court: number = 1;

        // Get players' names
        const findPlayerName = (playerId: string, index: number): void => {
          const player = tournament.players.find((p) => p.id === playerId);
          if (player !== undefined) {
            playersFirstNames[index] = player.firstName;
            playersLastNames[index] = player.lastName;
          }
        };

        // Try to get match info from the websocket
        if (matchInfoFromSocket !== undefined) {
          matchTime = matchInfoFromSocket.matchTime;

          // Get players' names in this match
          matchPlayers = matchInfoFromSocket.players;
          findPlayerName(matchPlayers[0].id, 0);
          findPlayerName(matchPlayers[1].id, 1);

          // If there is a winner, save them
          if (matchInfoFromSocket.winner !== undefined) {
            const winner = tournament.players.find(
              (p) => p.id === matchInfoFromSocket.winner
            );
            if (winner !== undefined) {
              matchWinner = winner.firstName;
            }
            matchEndTimeStamp = matchInfoFromSocket.endTimestamp;
          }

          // If there isn't a winner, check if there is an end timestamp or if the elapsedtime
          // is over the match time (it's a tie)
          else if (
            matchInfoFromSocket.endTimestamp !== undefined ||
            matchInfoFromSocket.elapsedTime >= matchTime
          ) {
            matchEndTimeStamp = matchInfoFromSocket.endTimestamp;
          }

          // Get officials
          if (matchInfoFromSocket.timeKeeper !== undefined) {
            timerPerson = matchInfoFromSocket.timeKeeper;
          }
          if (matchInfoFromSocket.pointMaker !== undefined) {
            pointPerson = matchInfoFromSocket.pointMaker;
          }
          if (matchInfoFromSocket.startTimestamp !== undefined) {
            startTime = matchInfoFromSocket.startTimestamp;
          }
          // Get time
          time = Math.floor(matchInfoFromSocket.elapsedTime / 1000);
          timer = matchInfoFromSocket.isTimerOn;

          elapsedtime = matchInfoFromSocket.elapsedTime;
          isovertime = matchInfoFromSocket.isOvertime;
          matchType = matchInfoFromSocket.type;

          court = matchInfoFromSocket.courtNumber;

          setTimeKeeper(matchInfoFromSocket.timeKeeper !== undefined);
          setPointMaker(matchInfoFromSocket.pointMaker !== undefined);
        }
        // If websocket doesn't have match info, use api
        // Usually this is the first time the match view is loaded
        else if (matchId !== undefined) {
          const matchFromApi: Match = await api.match.info(matchId);

          if (matchFromApi !== undefined) {
            matchTime = matchFromApi.matchTime;

            matchPlayers = matchFromApi.players;
            findPlayerName(matchPlayers[0].id, 0);
            findPlayerName(matchPlayers[1].id, 1);

            // If there is a winner, save them
            if (matchFromApi.winner !== undefined) {
              const winner = tournament.players.find(
                (p) => p.id === matchFromApi.winner
              );
              if (winner !== undefined) {
                matchWinner = winner.firstName;
              }
              matchEndTimeStamp = matchFromApi.endTimestamp;
            }
            // If there isn't a winner, check if there is an end timestamp
            // or if elapsed time is over match time (it's a tie)
            else if (
              matchFromApi.endTimestamp !== undefined ||
              matchFromApi.elapsedTime >= matchTime
            ) {
              matchEndTimeStamp = matchFromApi.endTimestamp;
            }
            if (matchFromApi.timeKeeper !== undefined) {
              timerPerson = matchFromApi.timeKeeper;
            }
            if (matchFromApi.pointMaker !== undefined) {
              pointPerson = matchFromApi.pointMaker;
            }
            if (matchFromApi.startTimestamp !== undefined) {
              startTime = matchFromApi.startTimestamp;
            }
            // Get time
            time = Math.floor(matchFromApi.elapsedTime / 1000);
            timer = matchFromApi.isTimerOn;

            elapsedtime = matchFromApi.elapsedTime;
            isovertime = matchFromApi.isOvertime;
            matchType = matchFromApi.type;

            court = matchFromApi.courtNumber;

            setTimeKeeper(matchInfo.timeKeeper !== undefined);
            setPointMaker(matchInfo.pointMaker !== undefined);
          }
        }
        setMatchInfo({
          timerTime: time,
          players: matchPlayers,
          firstNames: playersFirstNames,
          lastNames: playersLastNames,
          winner: matchWinner,
          endTimeStamp: matchEndTimeStamp,
          timeKeeper: timerPerson,
          pointMaker: pointPerson,
          startTimestamp: startTime,
          isTimerOn: timer,
          elapsedTime: elapsedtime,
          isOvertime: isovertime,
          type: matchType,
          time: matchTime,
          courtNumber: court
        });
      } catch (error) {
        setIsError(true);
        showToast(error, "error");
      } finally {
        setIsLoading(false);
      }
    };
    void getMatchData();
  }, [isLoading, matchInfoFromSocket]);

  useEffect(() => {
    setTimer(matchInfo.timerTime);
  }, [matchInfo.elapsedTime, matchInfo.timerTime]);

  // Handle timer, make it run and stop
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (matchInfo.isTimerOn) {
      intervalId = setInterval(() => {
        setTimer((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    }

    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [matchInfo.isTimerOn]);

  // If timer is ended, check for ties
  useEffect(() => {
    const checkForTieAndStopTimer = async (): Promise<void> => {
      try {
        if (matchInfo.winner !== undefined) {
          return; // Exit early if the winner has been determined so no endless rerendering
        }

        if (
          timer === matchInfo.time / 1000 &&
          matchId !== undefined &&
          !matchInfo.isOvertime
        ) {
          if (matchInfo.isTimerOn) {
            await apiTimerRequest(matchId);
          }
        }
        if (
          (matchInfo.elapsedTime >= matchInfo.time ||
            matchInfo.endTimeStamp !== undefined) &&
          matchId !== undefined
        ) {
          await api.match.checkForTie(matchId);
        }
      } catch (error) {
        showToast(error, "error");
      }
    };

    void checkForTieAndStopTimer();
  }, [matchInfo, timer]);

  const selectedPointType = buttonToTypeMap[selectedButton];

  const pointRequest: AddPointRequest = {
    pointType: selectedPointType,
    pointColor: playerColor
  };

  // When point is selected, close the selection and send it to API
  const handlePointShowing = async (): Promise<void> => {
    // Check if both time keeper and point maker roles are checked
    setOpenPoints(false);
    if (
      matchInfo.timeKeeper === undefined &&
      matchInfo.pointMaker === undefined
    ) {
      showToast(t("messages.missing_both"), "error");
      return;
    }
    if (matchInfo.timeKeeper === undefined) {
      showToast(t("messages.missing_timekeeper"), "error");
      return;
    }

    if (matchId !== undefined) {
      if (matchInfo.isTimerOn) {
        await apiTimerRequest(matchId);
      }
      if (matchInfo.isOvertime) {
        await apiPointRequest(matchId, pointRequest);
        await api.match.checkForTie(matchId);
      } else {
        await apiPointRequest(matchId, pointRequest);
      }
    }

    setMostRecentPointType(pointRequest.pointType);
    sessionStorage.setItem("mostRecentPointType", pointRequest.pointType);
  };

  // Get the selected radio button value
  const handleRadioButtonClick = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setSelectedButton(event.target.value);
  };

  // Open the radio button selection for points
  const handleOpen = (player: number): void => {
    setSelectedButton("");
    setOpenPoints(true);
    if (player === 1) {
      setPlayerColor("white");
    }
    if (player === 2) {
      setPlayerColor("red");
    }
  };

  // Send the point to the API (add it to the match)
  const apiPointRequest = async (
    matchId: string,
    body: AddPointRequest
  ): Promise<void> => {
    try {
      await api.match.addPoint(matchId, body);
    } catch (error) {
      showToast(error, "error");
    }
  };

  // Send timer starts and stops to API
  const apiTimerRequest = async (matchId: string): Promise<void> => {
    try {
      if (!matchInfo.isTimerOn) {
        await api.match.startTimer(matchId);
      } else {
        await api.match.stopTimer(matchId);
      }
    } catch (error) {
      showToast(error, "error");
    }
  };

  // When timer button is clicked, set its status
  const handleTimerChange = async (): Promise<void> => {
    // Check if both time keeper and point maker roles are checked
    if (
      matchInfo.timeKeeper === undefined &&
      matchInfo.pointMaker === undefined
    ) {
      showToast(t("messages.missing_both"), "error");
      return;
    }
    if (matchInfo.pointMaker === undefined) {
      showToast(t("messages.missing_pointmaker"), "error");
      return;
    }
    if (matchId !== undefined) {
      await apiTimerRequest(matchId);
    }
  };

  const apiRoleRequest = async (
    matchId: string,
    userId: string
  ): Promise<void> => {
    try {
      if (matchId !== undefined) {
        // if checkbox is checked and no time keeper is set yet
        if (timeKeeper && matchInfo.timeKeeper === undefined) {
          await api.match.addTimekeeper(matchId, userId);
        }
        // if checkbox is not chcekd and time keeper is set
        else if (!timeKeeper && matchInfo.timeKeeper !== undefined) {
          await api.match.removeTimekeeper(matchId, userId);
        }

        // if checkbox is checked and no point maker is set yet
        if (pointMaker && matchInfo.pointMaker === undefined) {
          await api.match.addPointmaker(matchId, userId);
        }
        // if checkbox is not checked and point maker is set
        else if (!pointMaker && matchInfo.pointMaker !== undefined) {
          await api.match.removePointmaker(matchId, userId);
        }
      }
    } catch (error) {
      showToast(error, "error");
    }
  };

  const handleRoleSave = async (): Promise<void> => {
    if (matchId !== undefined && userId !== undefined) {
      await apiRoleRequest(matchId, userId);
    }
    // close popup on save press
    setOpenRoles(false);
  };

  function handleClose(): void {
    setOpenPoints(false);
  }

  function handleCloseRoles(): void {
    setOpenRoles(false);
  }

  function showButtons(): boolean {
    if (matchInfo.winner !== undefined) {
      return false;
    } else if (
      matchInfo.winner === undefined &&
      matchInfo.elapsedTime > matchInfo.time &&
      matchInfo.type === "group"
    ) {
      return false;
    } else {
      return true;
    }
  }

  const handleDeleteRecentPoint = async (): Promise<void> => {
    if (matchId !== undefined) {
      try {
        await api.match.deleteRecentPoint(matchId);
      } catch (error) {
        showToast(error, "error");
      }
    }
    setMostRecentPointType(null);
    sessionStorage.removeItem("mostRecentPointType");
  };

  const handleModifyRecentPoint = async (newType: PointType): Promise<void> => {
    if (matchId !== undefined) {
      try {
        await api.match.modifyRecentPoint(matchId, newType);
      } catch (error) {
        showToast(error, "error");
      }
    }

    setMostRecentPointType(pointRequest.pointType);
  };

  // Function to fetch time keeper information
  const findTimekeeper = async (): Promise<void> => {
    if (userId !== null && userId !== undefined) {
      try {
        if (matchInfo.timeKeeper === undefined) {
          setTimeKeeperInfo(null);
          return;
        }

        const timeKeeper = await api.user.details(matchInfo.timeKeeper);
        if (timeKeeper === undefined) {
          throw new Error("Time keeper not found");
        }
        setTimeKeeperInfo(timeKeeper);
      } catch (error) {
        showToast(error, "error");
      }
    }
  };

  // Function to fetch point maker information
  const findPointmaker = async (): Promise<void> => {
    if (userId !== null && userId !== undefined) {
      try {
        if (matchInfo.pointMaker === undefined) {
          setPointMakerInfo(null);
          return;
        }

        const pointMaker = await api.user.details(matchInfo.pointMaker);
        if (pointMaker === undefined) {
          throw new Error("Point maker not found");
        }
        setPointMakerInfo(pointMaker);
      } catch (error) {
        showToast(error, "error");
      }
    }
  };

  // Call the findTimekeeper and findPointmaker functions when matchInfo updates
  useEffect(() => {
    void findTimekeeper();
    void findPointmaker();
  }, [matchInfo]);

  const handleReset = async (): Promise<void> => {
    if (matchId !== undefined) {
      try {
        await api.match.resetMatch(matchId);
        showToast(t("messages.match_reset"), "success");
      } catch (error) {
        showToast(error, "error");
      }
    }
  };

  const handleResetRoles = async (): Promise<void> => {
    if (matchId !== undefined) {
      try {
        await api.match.resetRoles(matchId);
        showToast(t("messages.role_reset"), "success");
      } catch (error) {
        showToast(error, "error");
      }
    }
  };

  const isUserTheCreator = tournament.creator.id === userId;

  return (
    <div className="app-container">
      <main className="main-content">
        {isLoading && <Loader />}
        {isError && (
          <ErrorModal
            open={isError}
            onClose={() => {
              setIsError(false);
            }}
            errorMessage={t("messages.unexpected_error_happened")}
          />
        )}
        {!isLoading && !isError && (
          <>
            <Grid
              container
              justifyContent="space-between"
              style={{ display: "flex", alignItems: "center" }}
            >
              {/* button is shown until the match is started */}
              {userId !== null &&
                userId !== undefined &&
                matchInfo.startTimestamp === undefined && (
                  <>
                    <Grid item>
                      {/* button is disabled if both roles are checked and user is not one of them */}
                      <Button
                        variant="contained"
                        onClick={() => {
                          setOpenRoles(true);
                        }}
                        disabled={
                          matchInfo.timeKeeper !== undefined &&
                          matchInfo.pointMaker !== undefined &&
                          matchInfo.timeKeeper !== userId &&
                          matchInfo.pointMaker !== userId
                        }
                      >
                        {t("game_interface.select_role")}
                      </Button>
                    </Grid>
                    <br />
                    <br />
                  </>
                )}
              <Dialog open={openRoles} onClose={handleCloseRoles}>
                <DialogTitle>{t("game_interface.select_role")}</DialogTitle>
                <DialogContent>
                  {/* checkbox is shown if there is no time keeper yet
                  or if user is the time keeper */}
                  {(matchInfo.timeKeeper === undefined ||
                    matchInfo.timeKeeper === userId) && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={timeKeeper}
                          onChange={() => {
                            setTimeKeeper(!timeKeeper);
                          }}
                        />
                      }
                      label={t("game_interface.time_keeper")}
                    />
                  )}
                  {/* checkbox is shown if there is no point maker yet
                  or if user is the point maker */}
                  {(matchInfo.pointMaker === undefined ||
                    matchInfo.pointMaker === userId) && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={pointMaker}
                          onChange={() => {
                            setPointMaker(!pointMaker);
                          }}
                        />
                      }
                      label={t("game_interface.point_maker")}
                    />
                  )}
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseRoles}>
                    {t("buttons.cancel_button")}
                  </Button>
                  <Button onClick={handleRoleSave}>
                    {t("buttons.save_button")}
                  </Button>
                </DialogActions>
              </Dialog>
              {/* elements shown only after match has started */}
              {userId !== null &&
                userId !== undefined &&
                matchInfo.startTimestamp !== undefined && (
                  <>
                    <Grid item>
                      {/* print time keeper and point maker names */}
                      <Typography variant="body2">
                        {t("game_interface.time_keeper")}:{" "}
                        <PlayerName
                          firstName={timeKeeperInfo?.firstName ?? ""}
                          lastName={timeKeeperInfo?.lastName ?? ""}
                          sameNames={haveSameNames}
                        />
                        <br />
                        {t("game_interface.point_maker")}:{" "}
                        <PlayerName
                          firstName={pointMakerInfo?.firstName ?? ""}
                          lastName={pointMakerInfo?.lastName ?? ""}
                          sameNames={haveSameNames}
                        />
                      </Typography>
                    </Grid>
                    <br />
                    <br />
                  </>
                )}
              <Grid item xs={4} style={{ marginLeft: "auto" }}>
                {isUserTheCreator && matchInfo.endTimeStamp === undefined && (
                  <>
                    {/* Reset button 
                        Only shown for the tournament creator before the match ends */}
                    {userId !== null &&
                    userId !== undefined &&
                    matchInfo.startTimestamp !== undefined ? (
                      <Button
                        variant="contained"
                        onClick={async () => {
                          await handleReset();
                        }}
                      >
                        {t("game_interface.reset")}
                      </Button>
                    ) : (
                      // Reset roles button
                      // Only shown for the tournament creator before the match starts
                      <Button
                        variant="contained"
                        onClick={async () => {
                          await handleResetRoles();
                        }}
                        disabled={
                          matchInfo.pointMaker === undefined ||
                          matchInfo.timeKeeper === undefined
                        }
                      >
                        {t("game_interface.reset_roles")}
                      </Button>
                    )}
                  </>
                )}
              </Grid>
            </Grid>
            <br />
            <br />
            {/* Court number text */}
            <Box
              display="flex"
              gap="20px"
              justifyContent="center"
              marginBottom="20px"
            >
              <Typography variant="h5">
                {t("tournament_view_labels.court_number")}
                {": "}
                {matchInfo.courtNumber}
              </Typography>
            </Box>
            {/* Player name boxes */}
            <Grid container justifyContent="center" spacing={2}>
              <Grid item xs={12}>
                <Box display="flex" justifyContent="center" flexWrap="wrap">
                  {matchInfo.firstNames.map((firstName, index) => (
                    <Box
                      key={index}
                      className="playerBox"
                      bgcolor={index === 0 ? "white" : "#db4744"}
                      textAlign="center"
                      p={2}
                      borderRadius={4}
                      border="1px solid black"
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                      margin="auto"
                      mb={2}
                      minWidth={400}
                      minHeight={130}
                      sx={{
                        wordWrap: "break-word", // Allow long names to break onto new lines
                        maxWidth: "400px"
                      }}
                    >
                      <Typography
                        variant="h4"
                        textAlign="center"
                        sx={{ width: "100%" }}
                      >
                        <PlayerName
                          firstName={firstName}
                          lastName={matchInfo.lastNames[index]}
                          sameNames={haveSameNames}
                        />
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Grid>
            </Grid>
            {/* Overtime text */}
            {matchInfo.isOvertime && (
              <Box display="flex" gap="20px" justifyContent="center">
                <Typography variant="body2">
                  {t("game_interface.overtime")}
                </Typography>
              </Box>
            )}
            {/* Timer */}
            <Box display="flex" gap="20px" justifyContent="center">
              <Timer timer={timer} />
              {/* timer button only shown to time keeper */}
              {userId !== null &&
                userId !== undefined &&
                showButtons() &&
                matchInfo.timeKeeper === userId && (
                  <TimerButton
                    isTimerRunning={matchInfo.isTimerOn}
                    handleTimerChange={handleTimerChange}
                  />
                )}
            </Box>
            {/* Score table */}
            <PointTable matchInfo={matchInfo} />
            <br></br>
            {/* point buttons only shown to point maker */}
            {userId !== null &&
              userId !== undefined &&
              showButtons() &&
              matchInfo.pointMaker === userId && (
                <OfficialButtons
                  open={openPoints}
                  selectedButton={selectedButton}
                  handleRadioButtonClick={handleRadioButtonClick}
                  handlePointShowing={handlePointShowing}
                  handleOpen={handleOpen}
                  handleClose={handleClose}
                />
              )}
            <br></br>
            {userId !== null &&
              userId !== undefined &&
              matchInfo.pointMaker === userId && (
                <ModifyDeletePoints
                  handleDeleteRecentPoint={handleDeleteRecentPoint}
                  handleModifyRecentPoint={handleModifyRecentPoint}
                  mostRecentPointType={mostRecentPointType}
                />
              )}
            {/* Print the winner */}
            {matchInfo.winner !== undefined && (
              <div>
                <Typography>
                  {t("game_interface.player")} {matchInfo.winner}{" "}
                  {t("game_interface.wins")}
                </Typography>
              </div>
            )}
            {/* If there isn't a winner, check if there is an end timestamp (it's a tie) */}
            {matchInfo.winner === undefined &&
              (matchInfo.endTimeStamp !== undefined ||
                (matchInfo.elapsedTime >= matchInfo.time &&
                  matchInfo.type !== "playoff")) && (
                <div>
                  <Typography>{t("game_interface.tie")}</Typography>
                </div>
              )}
          </>
        )}
      </main>
    </div>
  );
};

export default GameInterface;

export const buttonToTypeMap: Record<string, PointType> = {
  M: "men",
  K: "kote",
  D: "do",
  T: "tsuki",
  "\u0394": "hansoku"
};
