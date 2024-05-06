import { type Dispatch, type SetStateAction } from "react";
import { socket } from "./index";
import { type ISocketContext } from "context/SocketContext";
import { type Tournament, type Match } from "types/models";

export const socketEvents = (
  setValue: Dispatch<SetStateAction<ISocketContext>>
): void => {
  socket.on("start-timer", (matchInfo: Match) => {
    setValue((state) => {
      return { ...state, matchInfo };
    });
  });

  socket.on("stop-timer", (matchInfo: Match) => {
    setValue((state) => {
      return { ...state, matchInfo };
    });
  });

  socket.on("add-point", (matchInfo: Match) => {
    setValue((state) => {
      return { ...state, matchInfo };
    });
  });

  socket.on("add-timekeeper", (matchInfo: Match) => {
    setValue((state) => {
      return { ...state, matchInfo };
    });
  });

  socket.on("remove-timekeeper", (matchInfo: Match) => {
    setValue((state) => {
      return { ...state, matchInfo };
    });
  });

  socket.on("add-pointmaker", (matchInfo: Match) => {
    setValue((state) => {
      return { ...state, matchInfo };
    });
  });

  socket.on("remove-pointmaker", (matchInfo: Match) => {
    setValue((state) => {
      return { ...state, matchInfo };
    });
  });

  socket.on("check-tie", (matchInfo: Match) => {
    setValue((state) => {
      return { ...state, matchInfo };
    });
  });

  socket.on("delete-recent", (matchInfo: Match) => {
    setValue((state) => {
      return { ...state, matchInfo };
    });
  });

  socket.on("modify-recent", (matchInfo: Match) => {
    setValue((state) => {
      return { ...state, matchInfo };
    });
  });

  socket.on("tournament-updated", (tournamentData: Tournament) => {
    console.log("misu");
    setValue((state) => {
      return { ...state, tournamentData };
    });
  });

  socket.on("reset-match", (matchInfo: Match) => {
    setValue((state) => {
      return { ...state, matchInfo };
    });
  });

  socket.on("reset-roles", (matchInfo: Match) => {
    setValue((state) => {
      return { ...state, matchInfo };
    });
  });
};
