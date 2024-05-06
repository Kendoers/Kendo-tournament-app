import { type Socket, Server } from "socket.io";
import type http from "http";
import config from "./utility/config";

export const io = new Server();

export function initSocket(server: http.Server): Server {
  io.attach(server, {
    cors: {
      origin: config.CLIENT_HOST,
      credentials: true
    }
  });

  io.on("connection", async (socket: Socket) => {
    socket.on("join-match", async (matchId: string) => {
      await socket.join(matchId);
    });

    socket.on("leave-match", async (matchId: string) => {
      await socket.leave(matchId);
    });

    socket.on("join-tournament", async (tournamentId: string) => {
      await socket.join(tournamentId);
    });

    socket.on("leave-tournament", async (tournamentId: string) => {
      await socket.leave(tournamentId);
    });
  });

  return io;
}
