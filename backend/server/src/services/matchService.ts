import MatchModel, {
  type MatchPlayer,
  type Match,
  type MatchPoint,
  type PlayerColor,
  type MatchType,
  type PointType
} from "../models/matchModel.js";
import NotFoundError from "../errors/NotFoundError.js";
import BadRequestError from "../errors/BadRequestError.js";
import {
  type CreateMatchRequest,
  type AddPointRequest
} from "../models/requestModel.js";
import { type Document, Types } from "mongoose";
import {
  type Tournament,
  TournamentModel,
  TournamentType,
  type UnsavedMatch
} from "../models/tournamentModel.js";
import { TournamentService } from "./tournamentService.js";
import { shuffle } from "../utility/utils.js";

type rankingStruct = [Types.ObjectId, number, number];

// Note by Samuel:
// There's something missing about mongoose validation if using update.
// => Used find and save. => TODO: need for transactions. Until
// the DB has been configured for a replica set, testing transactions
// is not possible. The transactions have been commented out in the code.
export class MatchService {
  public async createMatch(requestBody: CreateMatchRequest): Promise<Match> {
    const newMatch = await MatchModel.create({
      type: requestBody.matchType,
      players: requestBody.players,
      comment: requestBody.comment,
      officials: requestBody.officials,
      timeKeeper: requestBody.timeKeeper,
      pointMaker: requestBody.pointMaker,
      matchTime: requestBody.matchTime
    });

    return await newMatch.toObject();
  }

  public async getMatchById(id: string): Promise<Match> {
    const match = await MatchModel.findById(id).exec();

    if (match === null) {
      throw new NotFoundError({
        code: 404,
        message: `Match not found for ID: ${id}`
      });
    }

    return await match.toObject();
  }

  public async deleteMatchById(id: string): Promise<void> {
    const result = await MatchModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundError({
        code: 404,
        message: `Match not found for ID: ${id}`
      });
    }
  }

  public async startTimer(id: string): Promise<Match> {
    const match = await MatchModel.findById(id).exec();

    if (match === null) {
      throw new NotFoundError({
        message: `Match not found for ID: ${id}`
      });
    }

    if (match.winner !== undefined || match.elapsedTime === match.matchTime) {
      throw new BadRequestError({
        message: "Finished matches cannot be edited"
      });
    }

    if (match.timerStartedTimestamp !== null) {
      throw new BadRequestError({
        message: `Timer is already started for the match`
      });
    }

    // Set the initial start timestamp if it's the first start
    if (match.startTimestamp === undefined) {
      match.startTimestamp = new Date();
    }

    // Mark the timer as started
    match.timerStartedTimestamp = new Date();
    match.isTimerOn = true;

    await match.save();

    const tournamentService = new TournamentService();
    const tournamentId = match.tournamentId as Types.ObjectId;

    if (tournamentId !== undefined) {
      await tournamentService.emitTournamentUpdate(tournamentId.toString());
    }

    return await match.toObject();
  }

  public async stopTimer(id: string): Promise<Match> {
    const match = await MatchModel.findById(id).exec();

    if (match === null) {
      throw new NotFoundError({
        message: `Match not found for ID: ${id}`
      });
    }

    if (match.winner !== undefined) {
      throw new BadRequestError({
        message: "Finished matches cannot be edited"
      });
    }

    // Check if the match has a start timestamp and the timer has been started
    if (
      match.startTimestamp === undefined ||
      match.timerStartedTimestamp === null
    ) {
      throw new BadRequestError({
        message: `Timer has not been started for the match`
      });
    }

    // Calculate the time elapsed
    const currentTime = new Date();
    const elapsedMilliseconds =
      currentTime.getTime() - match.timerStartedTimestamp.getTime();

    match.elapsedTime += elapsedMilliseconds;
    // Reset the timer timestamp
    match.timerStartedTimestamp = null;
    // Mark the timer to be off
    match.isTimerOn = false;
    await match.save();
    const tournamentService = new TournamentService();
    const tournamentId = match.tournamentId as Types.ObjectId;

    if (tournamentId !== undefined) {
      await tournamentService.emitTournamentUpdate(tournamentId.toString());
    }
    return await match.toObject();
  }

  // Every time adding point is done in frontend, this function handles it
  // It adds the point to a match, adds the point to a player,
  // checks if the match is finished and saves the match
  public async addPointToMatchById(
    id: string,
    requestBody: AddPointRequest
  ): Promise<Match> {
    const match = await MatchModel.findById(id).exec();

    if (match === null) {
      throw new NotFoundError({
        message: `Match not found for ID: ${id}`
      });
    }

    if (match.winner !== undefined) {
      throw new BadRequestError({
        message: "Finished matches cannot be edited"
      });
    }

    const { pointType, pointColor } = requestBody;

    const newPoint: MatchPoint = {
      type: pointType,
      timestamp: new Date()
    };

    this.assignPoint(match, newPoint, pointColor);

    await this.checkMatchOutcome(match);

    if (match.isOvertime) {
      await this.checkForTie(id);
    }

    await match.save();

    if (match.type === "preliminary" || match.type === "pre playoff") {
      // check if all matches are done, if not tournament is null
      const tournament = await this.checkAllMatchesPlayed(match);
      if (tournament !== null) {
        // getting players that proceed to playoffs and ties that need to be solved before playoff
        const [players, ties] = this.playersToPlayoffsFromPreliminary(
          tournament,
          tournament.matchSchedule as Match[]
        );

        if (ties.flat().length !== 0) {
          const nextRound =
            MatchService.findHighestRound(tournament.matchSchedule as Match[]) +
            1;

          for (let i = 0; i < ties.length; i++) {
            // case: all group players have same score
            if (
              players[i].length === 0 &&
              tournament.groups[i].length === ties[i].length
            ) {
              // three times same result, just take random players
              if (nextRound > 3) {
                let randomPlayers = shuffle(ties[i]);
                randomPlayers = randomPlayers.slice(
                  0,
                  tournament.playersToPlayoffsPerGroup
                );
                players[i].push(...randomPlayers);
                ties[i] = [];
              }
              // redo the round robin
              else {
                const matches: UnsavedMatch[] = [];
                const addedPlayers: Types.ObjectId[] = [];
                for (const player of tournament.groups[i]) {
                  const groupMatches =
                    TournamentService.generateRoundRobinSchedule(
                      addedPlayers,
                      player,
                      tournament.id,
                      tournament.matchTime,
                      "preliminary",
                      nextRound
                    );
                  matches.push(...groupMatches);
                  addedPlayers.push(player);
                }
                const matchDocuments = await MatchModel.insertMany(matches);
                const matchIds = matchDocuments.map((doc) => doc._id);
                tournament.matchSchedule.push(...matchIds);
              }
            }
            // case: some players tied for spot/spots, generate playoff elimination matches
            else if (ties[i].length > 0) {
              if (ties[i].length % 2 !== 0) {
                const matches = await TournamentService.generatePlayoffSchedule(
                  ties[i],
                  tournament.id,
                  tournament.matchTime,
                  nextRound,
                  "pre playoff"
                );
                const matchDocs = await MatchModel.insertMany(matches);
                for (const match of matchDocs) {
                  tournament.matchSchedule.push(match.id);
                }
              } else {
                const tiedPlayers = ties[i];
                for (let j = 0; j < tiedPlayers.length; j += 2) {
                  const newMatch = {
                    players: [
                      { id: tiedPlayers[j], points: [], color: "white" },
                      { id: tiedPlayers[j + 1], points: [], color: "red" }
                    ],
                    type: "pre playoff",
                    elapsedTime: 0,
                    timerStartedTimestamp: null,
                    tournamentRound: nextRound,
                    matchTime: tournament.matchTime,
                    tournamentId: tournament.id
                  };

                  const matchDocuments = await MatchModel.create(newMatch);
                  tournament.matchSchedule.push(matchDocuments.id);
                }
              }
            }
          }
        }

        // no ties, proceeding to playoffs
        if (ties.flat().length === 0) {
          const playerIds = players.flat();
          const playoffRound =
            MatchService.findHighestRound(tournament.matchSchedule as Match[]) +
            1;

          const matches = await TournamentService.generatePlayoffSchedule(
            playerIds,
            tournament.id,
            tournament.matchTime,
            playoffRound
          );
          const matchDocs = await MatchModel.insertMany(matches);
          for (const match of matchDocs) {
            tournament.matchSchedule.push(match.id);
          }
        }

        await tournament.save();
        await MatchService.divideMatchesToCourts(tournament.id);
      }
    }

    // swiss match generation logic
    if (match.type === "swiss") {
      const tournament = await this.checkAllMatchesPlayed(match);
      if (tournament !== null) {
        const rankingMap = this.getAllPlayerScores(
          tournament.matchSchedule as Match[],
          "swiss"
        );
        const rankings = this.formRankings(rankingMap, tournament)[0];
        const nextRound =
          MatchService.findHighestRound(tournament.matchSchedule as Match[]) +
          1;

        if (
          tournament.swissRounds !== undefined &&
          nextRound <= tournament.swissRounds
        ) {
          let swissPairings = this.generateAvailableSwiss(
            tournament.matchSchedule as Match[],
            tournament.players as Types.ObjectId[]
          );

          // grant bye
          if (rankings.length % 2 !== 0) {
            for (let i = 0; i < rankings.length; i++) {
              if (
                !this.hasHadBye(
                  tournament.matchSchedule as Match[],
                  rankings[i][0]
                )
              ) {
                const byeMatch = {
                  players: [{ id: rankings[i][0], points: [], color: "white" }],
                  type: "swiss",
                  elapsedTime: 0,
                  timerStartedTimestamp: null,
                  tournamentRound: nextRound,
                  tournamentId: tournament.id,
                  matchTime: tournament.matchTime,
                  winner: rankings[i][0]
                };

                swissPairings = this.removeFromAvailableSwiss(
                  swissPairings,
                  rankings[i][0],
                  undefined
                );
                rankings.splice(i, 1);

                const matchDocuments = await MatchModel.create(byeMatch);
                tournament.matchSchedule.push(matchDocuments.id);

                break;
              }
            }
          }

          let i = 0;
          while (rankings.length > 0) {
            const player1 = rankings.shift() as rankingStruct;
            const player2 = rankings[i];

            if (this.hasAvailableSwiss(swissPairings, player1[0], player2[0])) {
              const newMatch = {
                players: [
                  { id: player1[0], points: [], color: "white" },
                  { id: player2[0], points: [], color: "red" }
                ],
                type: "swiss",
                elapsedTime: 0,
                timerStartedTimestamp: null,
                tournamentRound: nextRound,
                matchTime: tournament.matchTime,
                tournamentId: tournament.id
              };

              swissPairings = this.removeFromAvailableSwiss(
                swissPairings,
                player1[0],
                player2[0]
              );
              rankings.splice(i, 1);

              const matchDocuments = await MatchModel.create(newMatch);
              tournament.matchSchedule.push(matchDocuments.id);
              i = 0;
            } else {
              i++;
              rankings.unshift(player1);
            }

            if (i + 1 >= rankings.length && rankings.length > 0) {
              break;
            }
          }

          await tournament.save();
          await MatchService.divideMatchesToCourts(tournament.id);
        }
      }
    }

    const tournamentService = new TournamentService();
    const tournamentId = match.tournamentId as Types.ObjectId;

    if (tournamentId !== undefined) {
      await tournamentService.emitTournamentUpdate(tournamentId.toString());
    }

    return await match.toObject();
  }

  public async addTimeKeeperToMatch(
    matchId: string,
    timeKeeperId: string
  ): Promise<Match> {
    const match = await MatchModel.findById(matchId).exec();

    if (match === null) {
      throw new NotFoundError({
        message: `Match not found for ID: ${matchId}`
      });
    }

    if (match.winner !== undefined) {
      throw new BadRequestError({
        message: "Finished matches cannot be edited"
      });
    }

    // Set the time keeper
    match.timeKeeper = new Types.ObjectId(timeKeeperId);

    await match.save();

    const tournamentService = new TournamentService();
    const tournamentId = match.tournamentId as Types.ObjectId;

    if (tournamentId !== undefined) {
      await tournamentService.emitTournamentUpdate(tournamentId.toString());
    }
    return await match.toObject();
  }

  public async addPointMakerToMatch(
    matchId: string,
    pointMakerId: string
  ): Promise<Match> {
    const match = await MatchModel.findById(matchId).exec();

    if (match === null) {
      throw new NotFoundError({
        message: `Match not found for ID: ${matchId}`
      });
    }

    if (match.winner !== undefined) {
      throw new BadRequestError({
        message: "Finished matches cannot be edited"
      });
    }

    // Set the point maker
    match.pointMaker = new Types.ObjectId(pointMakerId);

    await match.save();

    const tournamentService = new TournamentService();
    const tournamentId = match.tournamentId as Types.ObjectId;

    if (tournamentId !== undefined) {
      await tournamentService.emitTournamentUpdate(tournamentId.toString());
    }
    return await match.toObject();
  }

  public async deleteTimeKeeperFromMatch(matchId: string): Promise<Match> {
    const match = await MatchModel.findById(matchId).exec();

    if (match === null) {
      throw new NotFoundError({
        message: `Match not found for ID: ${matchId}`
      });
    }

    if (match.winner !== undefined) {
      throw new BadRequestError({
        message: "Finished matches cannot be edited"
      });
    }

    // Remove time keeper's id
    match.timeKeeper = undefined;

    await match.save();

    const tournamentService = new TournamentService();
    const tournamentId = match.tournamentId as Types.ObjectId;

    if (tournamentId !== undefined) {
      await tournamentService.emitTournamentUpdate(tournamentId.toString());
    }
    return await match.toObject();
  }

  public async deletePointMakerFromMatch(matchId: string): Promise<Match> {
    const match = await MatchModel.findById(matchId).exec();

    if (match === null) {
      throw new NotFoundError({
        message: `Match not found for ID: ${matchId}`
      });
    }

    if (match.winner !== undefined) {
      throw new BadRequestError({
        message: "Finished matches cannot be edited"
      });
    }

    // Remove point maker's id
    match.pointMaker = undefined;

    await match.save();

    const tournamentService = new TournamentService();
    const tournamentId = match.tournamentId as Types.ObjectId;

    if (tournamentId !== undefined) {
      await tournamentService.emitTournamentUpdate(tournamentId.toString());
    }
    return await match.toObject();
  }

  // Check if there is a tie or an overtime whne time has ended
  public async checkForTie(id: string): Promise<Match> {
    const match = await MatchModel.findById(id).exec();

    if (match === null) {
      throw new NotFoundError({
        message: `Match not found for ID: ${id}`
      });
    }

    if (match !== null) {
      const player1: MatchPlayer = match.players[0] as MatchPlayer;
      const player2: MatchPlayer = match.players[1] as MatchPlayer;
      const { player1CalculatedScore, player2CalculatedScore } =
        this.calculateScore(player1.points, player2.points);

      // When time ends, the player with more points wins
      // (rounded down because one hansoku doesn't count)
      if (
        Math.floor(player1CalculatedScore) >
          Math.floor(player2CalculatedScore) ||
        Math.floor(player2CalculatedScore) > Math.floor(player1CalculatedScore)
      ) {
        match.winner =
          player1CalculatedScore > player2CalculatedScore
            ? player1.id
            : player2.id;
        match.endTimestamp = new Date();
        if (match.type === "playoff") {
          await this.updatePlayoffSchedule(match.id, match.winner);
        }
      } else {
        // If the points are the same, it's a tie (in round robin)
        if (match.type === "group") {
          match.endTimestamp = new Date();
          await match.save();
        }
        // If it's a playoff, an overtime will start
        else if (
          match.type === "playoff" &&
          player1CalculatedScore === player2CalculatedScore
        ) {
          match.isOvertime = true;
          await match.save();
        }
      }

      match.player1Score = Math.floor(player1CalculatedScore);
      match.player2Score = Math.floor(player2CalculatedScore);

      await match.save();
    }
    const tournamentService = new TournamentService();
    const tournamentId = match.tournamentId as Types.ObjectId;

    if (tournamentId !== undefined) {
      await tournamentService.emitTournamentUpdate(tournamentId.toString());
    }
    return await match.toObject();
  }

  // Method to delete the most recent point from a match
  public async deleteRecentPoint(matchId: string): Promise<Match> {
    const match = await MatchModel.findById(matchId).exec();
    if (match === null) {
      throw new NotFoundError({
        message: `Match not found for ID: ${matchId}`
      });
    }

    if (match.players !== null && match.players.length > 0) {
      const players = match.players as MatchPlayer[];
      const { player, pointIndex } = this.findMostRecentPoint(players);

      if (player !== null && pointIndex !== -1) {
        player.points.splice(pointIndex, 1); // Remove the most recent point

        // Determine if the match had ended with this point
        const wasMatchEndingPoint = match.endTimestamp !== undefined;

        // If the removed point ended the match, revert match to ongoing
        if (wasMatchEndingPoint) {
          match.winner = undefined; // Clear the winner
          match.endTimestamp = undefined; // Clear the end timestamp

          if (match.type !== "group") {
            const tournamentId = match.tournamentId as Types.ObjectId;
            await this.deleteNextRound(tournamentId, match.tournamentRound);
          }
        }

        await match.save();
      } else {
        throw new BadRequestError({ message: "No points to delete." });
      }
    } else {
      throw new BadRequestError({ message: "No players in match." });
    }
    const tournamentService = new TournamentService();
    const tournamentId = match.tournamentId as Types.ObjectId;

    if (tournamentId !== undefined) {
      await tournamentService.emitTournamentUpdate(tournamentId.toString());
    }

    return await match.toObject();
  }

  // Method to modify the most recent point in a match
  public async modifyRecentPoint(
    matchId: string,
    newPointType: PointType
  ): Promise<Match> {
    const match = await MatchModel.findById(matchId).exec();
    if (match === null) {
      throw new NotFoundError({
        message: `Match not found for ID: ${matchId}`
      });
    }

    if (match.players !== null && match.players.length > 0) {
      const players = match.players as MatchPlayer[];
      const { player, pointIndex } = this.findMostRecentPoint(players);

      if (player !== null && pointIndex !== -1) {
        const originalPointType = player.points[pointIndex].type; // Store the original point type
        player.points[pointIndex].type = newPointType; // Modify the type of the most recent point

        // Check if original or new point type is "hansoku", indicating a need to re-evaluate the match outcome
        if (originalPointType === "hansoku" || newPointType === "hansoku") {
          // Only re-evaluate match outcome if the match had already ended
          if (match.winner !== undefined || match.endTimestamp !== undefined) {
            // Clear potentially incorrect match conclusions
            match.winner = undefined;
            match.endTimestamp = undefined;

            await this.checkMatchOutcome(match); // Re-check the match outcome with the updated point
          }
        }
        await match.save();
      } else {
        throw new BadRequestError({ message: "No points found to modify." });
      }
    } else {
      throw new BadRequestError({ message: "No players in match." });
    }
    const tournamentService = new TournamentService();
    const tournamentId = match.tournamentId as Types.ObjectId;

    if (tournamentId !== undefined) {
      await tournamentService.emitTournamentUpdate(tournamentId.toString());
    }

    return await match.toObject();
  }

  public static async divideMatchesToCourts(id: Types.ObjectId): Promise<void> {
    const tournament = await TournamentModel.findById(id).exec();

    if (tournament === null || tournament === undefined) {
      throw new NotFoundError({
        message: "Tournament not found"
      });
    }
    if (tournament.numberOfCourts === 1) {
      return;
    }

    const matches = await MatchModel.find({ tournamentId: id });

    const latestRound = MatchService.findHighestRound(matches);

    const latestMatches = matches.filter(
      (match) => match.tournamentRound === latestRound
    );

    if (tournament.type === TournamentType.PreliminaryPlayoff) {
      if (
        latestMatches[0].type === "preliminary" ||
        latestMatches[0].type === "pre playoff"
      ) {
        const matchesByGroups = MatchService.matchesByGroup(
          tournament,
          latestMatches
        );
        let court = 1;
        for (const groupMatches of matchesByGroups) {
          for (const match of groupMatches) {
            match.courtNumber = court;
            await match.save();
          }
          court++;
          if (court > tournament.numberOfCourts) {
            court = 1;
          }
        }
      } else {
        let court = 1;
        for (const match of latestMatches) {
          match.courtNumber = court;
          await match.save();

          court++;
          if (court > tournament.numberOfCourts) {
            court = 1;
          }
        }
      }
    } else if (tournament.type === TournamentType.RoundRobin) {
      let tournamentCourts = tournament.numberOfCourts;
      if (tournament.players.length / 2 < tournamentCourts) {
        tournamentCourts = Math.floor(tournament.players.length / 2);
      }
      const queue = latestMatches;
      const matches: Match[][] & Document[][] = [];
      let sorted = 0;
      let round = -1;
      while (queue.length > 0) {
        const match = queue.shift();

        if (match === undefined) {
          throw new NotFoundError({
            message: "Match not found"
          });
        }

        if (sorted % tournamentCourts === 0) {
          matches.push([]);
          round++;
        }

        if (!this.hasPlayerAlready(matches[round], match)) {
          matches[round].push(match);
          sorted++;
        } else {
          queue.push(match);
        }
      }

      for (const matchRound of matches) {
        let court = 1;

        for (const match of matchRound) {
          match.courtNumber = court;
          await match.save();
          court++;
        }
      }
    } else if (
      tournament.type === TournamentType.Playoff ||
      tournament.type === TournamentType.Swiss
    ) {
      let court = 1;
      for (const match of latestMatches) {
        match.courtNumber = court;
        court++;
        if (court > tournament.numberOfCourts) {
          court = 1;
        }
        await match.save();
      }
    }
  }

  public async resetMatch(matchId: string): Promise<Match> {
    const match = await MatchModel.findById(matchId).exec();
    if (match === null) {
      throw new NotFoundError({
        message: `Match not found for ID: ${matchId}`
      });
    }
    if (match.winner !== undefined) {
      throw new BadRequestError({
        message: "Finished matches cannot be edited"
      });
    }

    // Set time to zero
    match.elapsedTime = 0;
    match.startTimestamp = undefined;
    match.timerStartedTimestamp = null;
    match.isTimerOn = false;

    // Set points to zero
    if (match.players !== null && match.players.length > 0) {
      const players = match.players as MatchPlayer[];
      players.forEach((player) => {
        player.points = [];
      });
    }

    await match.save();

    return await match.toObject();
  }

  public async resetRoles(matchId: string): Promise<Match> {
    const match = await MatchModel.findById(matchId).exec();
    if (match === null) {
      throw new NotFoundError({
        message: `Match not found for ID: ${matchId}`
      });
    }
    if (match.winner !== undefined) {
      throw new BadRequestError({
        message: "Finished matches cannot be edited"
      });
    }
    if (
      match.isTimerOn ||
      match.timerStartedTimestamp !== null ||
      match.startTimestamp !== undefined
    ) {
      throw new BadRequestError({
        message: "Cannot reset roles for a match that has started"
      });
    }

    // Set the roles to zero
    match.timeKeeper = undefined;
    match.pointMaker = undefined;

    await match.save();

    // Websocket
    const tournamentService = new TournamentService();
    const tournamentId = match.tournamentId as Types.ObjectId;

    if (tournamentId !== undefined) {
      await tournamentService.emitTournamentUpdate(tournamentId.toString());
    }
    return await match.toObject();
  }

  private findMostRecentPoint(players: MatchPlayer[]): {
    player: MatchPlayer | null;
    pointIndex: number;
  } {
    let latestPointTimestamp = new Date(0); // Epoch time as the initial latest timestamp
    let playerWithLatestPoint: MatchPlayer | null = null;
    let pointIndexWithLatestTimestamp = -1;

    players.forEach((player) => {
      player.points.forEach((point, index) => {
        if (point.timestamp > latestPointTimestamp) {
          latestPointTimestamp = point.timestamp;
          playerWithLatestPoint = player;
          pointIndexWithLatestTimestamp = index;
        }
      });
    });

    return {
      player: playerWithLatestPoint,
      pointIndex: pointIndexWithLatestTimestamp
    };
  }

  private async checkMatchOutcome(match: Match): Promise<void> {
    const MAXIMUM_POINTS = 2;
    const player1: MatchPlayer = match.players[0] as MatchPlayer;
    const player2: MatchPlayer = match.players[1] as MatchPlayer;
    const { player1CalculatedScore, player2CalculatedScore } =
      this.calculateScore(player1.points, player2.points);

    // Check if player 1 or 2 has 2 points and wins
    if (
      player1CalculatedScore >= MAXIMUM_POINTS ||
      player2CalculatedScore >= MAXIMUM_POINTS
    ) {
      // Determine the winner based on points
      match.winner =
        player1CalculatedScore > player2CalculatedScore
          ? player1.id
          : player2.id;
      match.endTimestamp = new Date();

      if (match.type === "playoff") {
        // If playoff, add match to next round schedule
        await this.updatePlayoffSchedule(match.id, match.winner);
      }
    }

    match.player1Score = Math.floor(player1CalculatedScore);
    match.player2Score = Math.floor(player2CalculatedScore);
  }

  private calculateScore(
    player1Points: MatchPoint[],
    player2Points: MatchPoint[]
  ): { player1CalculatedScore: number; player2CalculatedScore: number } {
    let player1CalculatedScore = 0;
    let player2CalculatedScore = 0;

    player1Points.forEach((point: MatchPoint) => {
      if (point.type === "hansoku") {
        player2CalculatedScore += 0.5;
      } else {
        player1CalculatedScore++;
      }
    });

    player2Points.forEach((point: MatchPoint) => {
      if (point.type === "hansoku") {
        player1CalculatedScore += 0.5;
      } else {
        player2CalculatedScore++;
      }
    });

    return { player1CalculatedScore, player2CalculatedScore };
  }

  // Add assigned point to the correct player
  private assignPoint(
    match: Match,
    point: MatchPoint,
    pointColor: PlayerColor
  ): void {
    const player1: MatchPlayer = match.players[0] as MatchPlayer;
    const player2: MatchPlayer = match.players[1] as MatchPlayer;
    const pointWinner = player1.color === pointColor ? player1 : player2;
    pointWinner.points.push(point);
  }

  private async updatePlayoffSchedule(
    matchId: Types.ObjectId,
    winnerId: Types.ObjectId
  ): Promise<void> {
    const tournament = await TournamentModel.findOne({
      matchSchedule: matchId
    })
      .populate<{
        matchSchedule: Match[];
      }>({
        path: "matchSchedule",
        model: "Match"
      })
      .exec();

    if (tournament === null || tournament === undefined) {
      throw new NotFoundError({
        message: "Tournament not found"
      });
    }

    if (tournament.type === TournamentType.RoundRobin) {
      return;
    }

    const playedMatches = tournament.matchSchedule;

    const currentMatch = playedMatches.find(
      (match) => match.id.toString() === matchId.toString()
    );
    if (currentMatch === null || currentMatch === undefined) {
      throw new NotFoundError({
        message: "Match not found in tournament schedule"
      });
    }
    const currentRound = currentMatch.tournamentRound;

    if (
      tournament.type === TournamentType.PreliminaryPlayoff &&
      currentRound === 1
    ) {
      return;
    }

    const nextRound = currentRound + 1;

    const winners = playedMatches
      .filter(
        (match) =>
          match.tournamentRound === currentRound &&
          match.winner !== null &&
          match.type === "playoff"
      )
      .map((match) => match.winner)
      .filter((winner): winner is Types.ObjectId => winner != null);

    // Find eligible winners who don't have a match in the next round
    const eligibleWinners = winners.filter((winner) => {
      if (winner === null || winner === undefined) {
        return false;
      }
      return !playedMatches.some(
        (match) =>
          match.tournamentRound === nextRound &&
          match.players.some(
            (player) => player.id.toString() === winner.toString()
          )
      );
    });

    eligibleWinners.push(winnerId);
    // Pair current winner with eligible winners for the next round

    for (let i = 0; i < eligibleWinners.length; i += 2) {
      if (i + 1 === eligibleWinners.length) {
        break;
      }
      // Create a new match.
      const newMatch = {
        players: [
          { id: eligibleWinners[i], points: [], color: "white" },
          { id: eligibleWinners[i + 1], points: [], color: "red" }
        ],
        type: "playoff",
        elapsedTime: 0,
        timerStartedTimestamp: null,
        tournamentRound: nextRound,
        matchTime: tournament.matchTime,
        tournamentId: tournament.id
      };

      const matchDocuments = await MatchModel.create(newMatch);
      tournament.matchSchedule.push(matchDocuments.id);
    }

    // Save the tournament if new matches were added
    if (eligibleWinners.length > 0) {
      await tournament.save();
      await MatchService.divideMatchesToCourts(tournament.id);
    }
  }

  // find that are moving from preliminary to playoffs and players tied to spots for playoffs
  private playersToPlayoffsFromPreliminary(
    tournament: Tournament & Document,
    matches: Match[]
  ): [Types.ObjectId[][], Types.ObjectId[][]] {
    // ensuring amountToPlayoffsPerGroup is defined
    if (tournament.playersToPlayoffsPerGroup === undefined) {
      throw new Error(
        "Tournament configuration error: 'playersToPlayoffsPerGroup' is undefined."
      );
    }
    const amountToPlayoffsPerGroup = tournament.playersToPlayoffsPerGroup;

    // round robin rankings
    const rankingMap: Map<string, number[]> = this.getAllPlayerScores(
      matches,
      "preliminary"
    );
    const groupRankings: rankingStruct[][] = this.formRankings(
      rankingMap,
      tournament
    );

    const groupTies: Types.ObjectId[][] = [];
    const availableSpots: number[] = [];

    // find ties from round robins and how many openings left for playoffs
    for (let i = 0; i < groupRankings.length; i++) {
      const tieIds: Types.ObjectId[] = [];
      availableSpots.push(0);

      // tiescore including wins/draw points and ippons
      const tieScore = [
        groupRankings[i][amountToPlayoffsPerGroup - 1][1],
        groupRankings[i][amountToPlayoffsPerGroup - 1][2]
      ];

      if (groupRankings[i].length > amountToPlayoffsPerGroup) {
        // check if there is a tie that matters (tie between last player to playoff and the next in scores)
        if (
          groupRankings[i][amountToPlayoffsPerGroup][1] === tieScore[0] &&
          groupRankings[i][amountToPlayoffsPerGroup][2] === tieScore[1]
        ) {
          for (let j = 0; j < groupRankings[i].length; j++) {
            if (
              groupRankings[i][j][1] === tieScore[0] &&
              groupRankings[i][j][2] === tieScore[1]
            ) {
              if (tieIds.length === 0) {
                availableSpots[i] = amountToPlayoffsPerGroup - j;
              }
              tieIds.push(groupRankings[i][j][0]);
            }
          }
        }
      }
      groupTies.push(tieIds);
    }

    // take those players that continue to playoffs
    const playerIds: Types.ObjectId[][] = [];
    for (let i = 0; i < groupRankings.length; i++) {
      // slice only those not tied/competing for spots
      const topPlayers = groupRankings[i].slice(
        0,
        amountToPlayoffsPerGroup - availableSpots[i]
      );

      // Extract the playerIds from the topPlayers
      const topPlayerIds = topPlayers.map(([playerId, _]) => playerId);

      // Append the top playerIds to the playerIds array
      playerIds.push(topPlayerIds);
    }

    // check tie breaker playoff matches
    const prePlayoffRankingMap: Map<string, number[]> = this.getAllPlayerScores(
      matches,
      "pre playoff"
    );
    if (prePlayoffRankingMap.size > 0) {
      // get tie breaker scores
      const prePlayoffRankings: rankingStruct[][] = this.formRankings(
        prePlayoffRankingMap,
        tournament
      );

      // find all playof winners in groups
      const winnersPrePlayoff: Types.ObjectId[][] = [];
      for (let i = 0; i < prePlayoffRankings.length; i++) {
        const winnerIds: Types.ObjectId[] = [];

        if (prePlayoffRankings[i].length > 0) {
          const highestScore = prePlayoffRankings[i][0][1];
          for (let j = 0; j < prePlayoffRankings[i].length; j++) {
            if (prePlayoffRankings[i][j][1] === highestScore) {
              winnerIds.push(prePlayoffRankings[i][j][0]);
            }
          }
        }
        winnersPrePlayoff.push(winnerIds);
      }

      // check if correct number of players eliminated in tie breaker playoffs,
      // if number of winners = number of available spots for playoffs then no
      // need for further tie breakers
      for (let i = 0; i < winnersPrePlayoff.length; i++) {
        // winners = number of available spots, remove ties from the array and move to
        // playerIds (players going to playoffs)
        if (
          amountToPlayoffsPerGroup - playerIds[i].length ===
          winnersPrePlayoff[i].length
        ) {
          playerIds[i].push(...winnersPrePlayoff[i]);
          groupTies[i] = [];
        }
        // still more players than spots
        else if (
          winnersPrePlayoff[i].length > 0 &&
          playerIds[i].length < amountToPlayoffsPerGroup
        ) {
          groupTies[i] = winnersPrePlayoff[i];
        }
      }
    }

    return [playerIds, groupTies];
  }

  // just check that all preliminary matches are played, returns tournament if so
  private async checkAllMatchesPlayed(
    match: Match
  ): Promise<(Tournament & Document) | null> {
    const tournament = await TournamentModel.findOne({
      matchSchedule: match.id
    })
      .populate<{
        matchSchedule: Match[];
      }>({
        path: "matchSchedule",
        model: "Match"
      })
      .exec();

    if (tournament === null || tournament === undefined) {
      throw new NotFoundError({
        message: "Tournament not found"
      });
    }
    const playedMatches = tournament.matchSchedule;

    let played = 0;

    for (let i = 0; i < playedMatches.length; i++) {
      if (
        playedMatches[i].endTimestamp !== undefined ||
        playedMatches[i].winner !== undefined
      ) {
        played++;
      }
    }

    if (played === playedMatches.length) {
      return tournament;
    }
    return null;
  }

  // determine player scores of certain match type or all matches
  private getAllPlayerScores(
    matches: Match[],
    matchType?: MatchType
  ): Map<string, number[]> {
    const rankingMap = new Map<string, number[]>();

    for (const match of matches) {
      if (matchType === undefined || match.type === matchType) {
        for (let j = 0; j < match.players.length; j++) {
          const matchPlayer: MatchPlayer = match.players[j] as MatchPlayer;
          let playerPoints = 0;
          if (j === 0) {
            playerPoints = match.player1Score;
          } else if (j === 1) {
            playerPoints = match.player2Score;
          }

          const matchPlayerId = matchPlayer.id.toString();
          if (rankingMap.has(matchPlayerId)) {
            const currentPoints = rankingMap.get(matchPlayerId) ?? [0, 0];
            currentPoints[1] += playerPoints;
            if (
              match.winner !== undefined &&
              match.winner.toString() === matchPlayerId
            ) {
              currentPoints[0] += 3;
            } else if (
              match.winner === undefined &&
              match.endTimestamp !== undefined
            ) {
              currentPoints[0] += 1;
            }
            rankingMap.set(matchPlayerId, currentPoints);
          } else {
            const currentPoints = [0, playerPoints];
            if (
              match.winner !== undefined &&
              match.winner.toString() === matchPlayerId
            ) {
              currentPoints[0] += 3;
            } else if (
              match.winner === undefined &&
              match.endTimestamp !== undefined
            ) {
              currentPoints[0] += 1;
            }
            rankingMap.set(matchPlayerId, currentPoints);
          }
        }
      }
    }

    return rankingMap;
  }

  // arrange rankings by group and scores consisting of wins and ippons (scored points),
  // descending order (highest score first)
  private formRankings(
    rankingMap: Map<string, number[]>,
    tournament: Tournament & Document
  ): rankingStruct[][] {
    const groupRankings: rankingStruct[][] = [];

    if (tournament.type === TournamentType.PreliminaryPlayoff) {
      for (let i = 0; i < tournament.groups.length; i++) {
        const groupRankingMap: rankingStruct[] = [];
        groupRankings.push(groupRankingMap);

        for (const playerId of tournament.groups[i]) {
          if (rankingMap.has(playerId.toString())) {
            const score = rankingMap.get(playerId.toString()) ?? [0, 0];
            groupRankings[i].push([playerId, score[0], score[1]]);
          }
        }
      }
    } else {
      groupRankings.push([]);
      for (const playerId of tournament.players as Types.ObjectId[]) {
        if (rankingMap.has(playerId.toString())) {
          const score = rankingMap.get(playerId.toString()) ?? [0, 0];
          groupRankings[0].push([playerId, score[0], score[1]]);
        }
      }
    }

    groupRankings.forEach((group) => {
      group.sort((a, b) => {
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }
        return b[2] - a[2];
      });
    });
    return groupRankings;
  }

  private static findHighestRound(matches: Match[]): number {
    let round = 1;
    for (const match of matches) {
      if (match.tournamentRound > round) {
        round = match.tournamentRound;
      }
    }
    return round;
  }

  private static matchesByGroup(
    tournament: Tournament & Document,
    matches: Match[] & Document[]
  ): Match[][] & Document[][] {
    const matchesByGroup: Match[][] & Document[][] = Array.from(
      { length: tournament.groups.length },
      () => []
    );
    for (const match of matches) {
      const player = match.players[0] as MatchPlayer;
      const playerId = player.id;
      const groupIndex = tournament.groups.findIndex((group) =>
        group.includes(playerId)
      );

      if (groupIndex !== -1) {
        matchesByGroup[groupIndex].push(match);
        break;
      }
    }

    return matchesByGroup;
  }

  private static hasPlayerAlready(
    matches: Match[] & Document[],
    match: Match & Document
  ): boolean {
    const player1 = match.players[0] as MatchPlayer;
    const player2 = match.players[1] as MatchPlayer;
    for (const listMatch of matches) {
      const players = listMatch.players as MatchPlayer[];
      const playerIds: Types.ObjectId[] = players.map((player) => player.id);
      if (playerIds.includes(player1.id) || playerIds.includes(player2.id)) {
        return true;
      }
    }
    return false;
  }

  private generateAvailableSwiss(
    matches: Match[],
    players: Types.ObjectId[]
  ): Map<string, Types.ObjectId[]> {
    const map = new Map<string, string[]>();
    for (const match of matches) {
      const matchPlayer1 = match.players[0] as MatchPlayer;
      const player1Id = matchPlayer1.id.toString();

      if (match.players.length !== 1) {
        const matchPlayer2 = match.players[1] as MatchPlayer;
        const player2Id = matchPlayer2.id.toString();
        if (map.has(player1Id)) {
          const array = map.get(player1Id) as string[];
          array.push(player2Id);
          map.set(player1Id, array);
        } else {
          map.set(player1Id, [player1Id, player2Id]);
        }

        if (map.has(player2Id)) {
          const array = map.get(player2Id) as string[];
          array.push(player1Id);
          map.set(player2Id, array);
        } else {
          map.set(player2Id, [player2Id, player1Id]);
        }
      } else {
        if (!map.has(player1Id)) {
          map.set(player1Id, [player1Id]);
        }
      }
    }

    const swissMap = new Map<string, Types.ObjectId[]>();
    for (const [key, value] of map) {
      const array = players.filter((item) => !value.includes(item.toString()));
      swissMap.set(key, array);
    }

    return swissMap;
  }

  private hasAvailableSwiss(
    map: Map<string, Types.ObjectId[]>,
    player1Id: Types.ObjectId,
    player2Id: Types.ObjectId
  ): boolean {
    const toRemove = [player1Id.toString(), player2Id.toString()];
    for (const [key, value] of map) {
      const array = value.filter((item) => !toRemove.includes(item.toString()));
      if (
        array.length === 0 &&
        player1Id.toString() !== key &&
        player2Id.toString() !== key
      ) {
        return false;
      }
    }

    return true;
  }

  private removeFromAvailableSwiss(
    swissMap: Map<string, Types.ObjectId[]>,
    player1Id: Types.ObjectId,
    player2Id: Types.ObjectId | undefined
  ): Map<string, Types.ObjectId[]> {
    for (const [key, value] of swissMap) {
      if (player1Id.toString() === key) {
        swissMap.delete(key);
      }

      const index1 = value.indexOf(player1Id);

      if (index1 !== -1) {
        value.splice(index1, 1);
        swissMap.set(key, value);
      }

      if (player2Id !== undefined) {
        const index2 = value.indexOf(player2Id);
        if (player2Id.toString() === key) {
          swissMap.delete(key);
        }
        if (index2 !== -1) {
          value.splice(index2, 1);
          swissMap.set(key, value);
        }
      }
    }

    return swissMap;
  }

  private hasHadBye(matches: Match[], playerId: Types.ObjectId): boolean {
    for (const match of matches) {
      if (match.players.length === 1) {
        const matchPlayer = match.players[0] as MatchPlayer;
        if (matchPlayer.id.toString() === playerId.toString()) {
          return true;
        }
      }
    }

    return false;
  }

  private async deleteNextRound(
    tournamentId: Types.ObjectId,
    currentRound: number
  ): Promise<void> {
    const matches = await MatchModel.find({
      tournamentId,
      tournamentRound: currentRound + 1
    });
    if (matches.length > 0) {
      const matchIds = matches.map((match) => match.id);
      await TournamentModel.updateOne(
        { _id: tournamentId },
        { $pull: { matchSchedule: { $in: matchIds } } }
      );
      await MatchModel.deleteMany({
        tournamentId,
        round: currentRound + 1
      });
    }
  }
}
