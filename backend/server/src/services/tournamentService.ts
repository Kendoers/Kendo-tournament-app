import NotFoundError from "../errors/NotFoundError.js";
import {
  TournamentModel,
  type Tournament,
  type UnsavedMatch,
  TournamentType
} from "../models/tournamentModel.js";
import UserModel, { type User } from "../models/userModel.js";
import BadRequestError from "../errors/BadRequestError.js";
import { type HydratedDocument, Types } from "mongoose";
import MatchModel, {
  type MatchType,
  type Match,
  type MatchTime
} from "../models/matchModel.js";
import {
  type EditTournamentRequest,
  type CreateTournamentRequest
} from "../models/requestModel.js";
import { io } from "../socket.js";
import { MatchService } from "./matchService.js";

export class TournamentService {
  private readonly matchService: MatchService;

  constructor() {
    this.matchService = new MatchService();
  }

  public async emitTournamentUpdate(tournamentId: string): Promise<void> {
    const updatedTournament = await this.getTournamentById(tournamentId);
    io.to(tournamentId).emit("tournament-updated", updatedTournament);
  }

  public async getTournamentById(id: string): Promise<Tournament> {
    const tournament = await TournamentModel.findById(id)
      .populate<{ creator: User }>({ path: "creator", model: "User" })
      .populate<{ players: User[] }>({ path: "players", model: "User" })
      .populate<{ matchSchedule: Match[] }>({
        path: "matchSchedule",
        model: "Match"
      })
      .exec();
    if (tournament === null || tournament === undefined) {
      throw new NotFoundError({
        message: "Tournament not found"
      });
    }

    return await tournament.toObject();
  }

  public async getAllTournaments(): Promise<Tournament[]> {
    const tournaments = await TournamentModel.find()
      .populate<{ creator: User }>({ path: "creator", model: "User" })
      .populate<{ players: User[] }>({ path: "players", model: "User" })
      .populate<{ matchSchedule: Match[] }>({
        path: "matchSchedule",
        model: "Match"
      })
      .populate<{ teams: Array<{ players: Array<User> }> }>({
        path: "teams.players",
        model: "User"
      })
      .exec();

    if (tournaments === null || tournaments === undefined) {
      throw new NotFoundError({
        message: "No tournaments found"
      });
    }

    return tournaments.map((tournament) => tournament.toObject());
  }

  public async createTournament(
    tournamentData: CreateTournamentRequest,
    creator: string
  ): Promise<Tournament> {
    await this.validateTournamentDetails(tournamentData, creator);

    const newTournament = await TournamentModel.create({
      ...tournamentData,
      creator
    });

    return await newTournament.toObject();
  }

  public async addTeamToTournament(
    tournamentId: string,
    teamName: string,
    creatorId: string
  ): Promise<Tournament> {
    const tournament = await TournamentModel.findById(tournamentId);

    if (!tournament) {
      throw new NotFoundError({
        message: "No tournaments found"
      });
    }

    const teamExists = tournament.teams?.some((team) => team.name === teamName);
    if (teamExists) {
      throw new BadRequestError({
        message: "A team with this name already exists in the tournament"
      });
    }

    if (tournament.teams) {
      tournament.teams.push({
        id: new Types.ObjectId(),
        name: teamName,
        players: []
      });
    } else {
      tournament.teams = [
        {
          id: new Types.ObjectId(),
          name: teamName,
          players: []
        }
      ];
    }

    await tournament.save();
    await this.emitTournamentUpdate(tournamentId);

    return tournament;
  }

  public async removeTeamFromTournament(
    tournamentId: string,
    teamId: string
  ): Promise<Tournament> {
    const tournament = await TournamentModel.findById(tournamentId);

    if (tournament === null || tournament === undefined) {
      throw new NotFoundError({
        message: "Tournament not found"
      });
    }

    const teamExists =
      tournament.teams?.some((team) => team.id.toString() === teamId) ?? false;

    if (!teamExists) {
      throw new NotFoundError({
        message: "Team not found in the tournament"
      });
    }

    tournament.teams = tournament.teams?.filter(
      (team) => team.id.toString() !== teamId
    );

    await tournament.save();
    await this.emitTournamentUpdate(tournamentId);

    return tournament;
  }

  public async joinTeam(
    tournamentId: string,
    teamId: string,
    userId: string
  ): Promise<void> {
    const tournament = await TournamentModel.findById(tournamentId);
    if (tournament === null || tournament === undefined) {
      throw new NotFoundError({
        message: "Tournament not found"
      });
    }

    const team = tournament.teams?.find(
      (team) => team.id.toString() === teamId
    );
    if (team === null || team === undefined) {
      throw new NotFoundError({
        message: "Team not found in the tournament"
      });
    }

    if (team.players.some((player) => player.id.toString() === userId)) {
      throw new BadRequestError({
        message: "User is already a member of this team"
      });
    }

    team.players.push(new Types.ObjectId(userId));
    await tournament.save();
    await this.addPlayerToTournament(tournamentId, userId);
  }

  public async leaveTeam(
    tournamentId: string,
    teamId: string,
    userId: string
  ): Promise<void> {
    const tournament = await TournamentModel.findById(tournamentId);
    if (tournament === null || tournament === undefined) {
      throw new NotFoundError({ message: "Tournament not found" });
    }

    const team = tournament.teams?.find(
      (team) => team.id.toString() === teamId
    );
    if (team === null || team === undefined) {
      throw new NotFoundError({
        message: "Team not found in the tournament"
      });
    }

    team.players = team.players.filter(
      (playerId) => playerId.toString() !== userId
    );

    await tournament.save();
    await this.removePlayerFromTournament(tournamentId, userId);
  }

  public async kickPlayerFromTeam(
    tournamentId: string,
    teamId: string,
    userId: string
  ): Promise<void> {
    const tournament = await TournamentModel.findById(tournamentId);
    if (tournament === null || tournament === undefined) {
      throw new NotFoundError({ message: "Tournament not found" });
    }

    const team = tournament.teams?.find(
      (team) => team.id.toString() === teamId
    );
    if (team === null || team === undefined) {
      throw new NotFoundError({
        message: "Team not found in the tournament"
      });
    }

    const playerIndex = team.players.findIndex(
      (playerId) => playerId.toString() === userId
    );
    if (playerIndex === -1) {
      throw new NotFoundError({ message: "Player not found in the team" });
    }

    team.players.splice(playerIndex, 1);

    await tournament.save();
    await this.removePlayerFromTournament(tournamentId, userId);
  }

  public async addPlayerToTournament(
    tournamentId: string,
    playerId: string
  ): Promise<void> {
    const tournament = await TournamentModel.findById(tournamentId).exec();

    if (tournament === null || tournament === undefined) {
      throw new NotFoundError({
        message: "Tournament not found"
      });
    }

    const player = await UserModel.findById(playerId).exec();
    if (player === null || player === undefined) {
      throw new NotFoundError({
        message: "Player not found"
      });
    }

    if (tournament.players.includes(player.id)) {
      throw new BadRequestError({
        message: "Player already registered in the tournament"
      });
    }

    const currentDate = new Date();
    const startDate = new Date(tournament.startDate);
    if (currentDate > startDate) {
      throw new BadRequestError({
        message: `Cannot add new players as the tournament has already started on ${startDate.toDateString()}`
      });
    }

    if (tournament.players.length >= tournament.maxPlayers) {
      throw new BadRequestError({
        message: "Tournament has reached its maximum number of players"
      });
    }

    tournament.players.push(player.id);

    // Adding new player to preliminary requires redoing all groups and matches,
    // perhaps a better way would be possible?
    if (
      tournament.type === TournamentType.PreliminaryPlayoff &&
      tournament.groupsSizePreference !== undefined
    ) {
      tournament.groups = this.dividePlayersIntoGroups(
        tournament.players as Types.ObjectId[],
        tournament.groupsSizePreference
      );
      await MatchModel.deleteMany({ tournamentId: tournament.id });

      tournament.matchSchedule = [];
    }
    if (tournament.type === TournamentType.Swiss) {
      await MatchModel.deleteMany({ tournamentId: tournament.id });

      tournament.matchSchedule = [];
    }

    await tournament.save();

    // Playoff matches are calculated separately when the tournament has started
    if (
      tournament.players.length > 1 &&
      tournament.type !== TournamentType.Playoff
    ) {
      const newMatchIds = await this.generateTournamentSchedule(
        tournament,
        player.id
      );
      if (newMatchIds.length !== 0) {
        tournament.matchSchedule.push(...newMatchIds);
        await tournament.save();
      }
    }
    return await tournament.toObject();
  }

  public async removePlayerFromTournament(
    tournamentId: string,
    playerId: string
  ): Promise<void> {
    const tournament = await TournamentModel.findById(tournamentId).exec();

    if (tournament === null || tournament === undefined) {
      throw new NotFoundError({
        message: "Tournament not found"
      });
    }

    const player = await UserModel.findById(playerId).exec();
    if (player === null || player === undefined) {
      throw new NotFoundError({
        message: "Player not found"
      });
    }

    const currentDate = new Date();
    const startDate = new Date(tournament.startDate);
    if (currentDate > startDate) {
      throw new BadRequestError({
        message: `Cannot cancel sign up as the tournament has already started on ${startDate.toDateString()}`
      });
    }

    // Remove player from tournament
    if (tournament.players.includes(player.id)) {
      const index = tournament.players.indexOf(player.id);
      tournament.players.splice(index, 1);

      // Remove player's matches from match schedule
      const matchesToRemove: Array<Types.ObjectId | Match> = [];

      for (const matchId of tournament.matchSchedule) {
        const match = await MatchModel.findById(matchId).exec();
        if (match === undefined || match === null) {
          continue; // Skip if match doesn't exist
        }
        // Check if a match involves the removed player
        const matchPlayerIds = match.players.map((player) =>
          player.id.toString()
        );
        if (matchPlayerIds.includes(playerId)) {
          matchesToRemove.push(matchId);
          // Delete the match
          const matchIdString = String(matchId);
          await this.matchService.deleteMatchById(matchIdString);
        }
      }

      // Remove match IDs involving the removed player from match schedule
      tournament.matchSchedule = tournament.matchSchedule.filter(
        (matchId) => !matchesToRemove.includes(matchId)
      );
    }

    // Preliminary changes
    if (tournament.type === TournamentType.PreliminaryPlayoff) {
      // Removing a player to preliminary requires redoing all groups and matches
      if (tournament.groupsSizePreference !== undefined) {
        tournament.groups = this.dividePlayersIntoGroups(
          tournament.players as Types.ObjectId[],
          tournament.groupsSizePreference
        );
        await MatchModel.deleteMany({ tournamentId: tournament.id });

        tournament.matchSchedule = [];
      }
    }
    // Also swiss requires new matches
    if (tournament.type === TournamentType.Swiss) {
      await MatchModel.deleteMany({ tournamentId: tournament.id });

      tournament.matchSchedule = [];
    }

    // Playoff matches are calculated separately when the tournament has started,
    // round robin works without this
    if (
      tournament.players.length > 1 &&
      tournament.type !== TournamentType.Playoff &&
      tournament.type !== TournamentType.RoundRobin
    ) {
      const newMatchIds = await this.generateTournamentSchedule(tournament);
      if (newMatchIds.length !== 0) {
        tournament.matchSchedule.push(...newMatchIds);
      }
    }

    await tournament.save();

    return await tournament.toObject();
  }

  public async addMatchToTournament(
    tournamentId: string,
    unsavedMatch: UnsavedMatch
  ): Promise<Tournament> {
    const tournament = await TournamentModel.findById(tournamentId).exec();
    if (tournament === null || tournament === undefined) {
      throw new NotFoundError({
        message: "Tournament not found"
      });
    }

    const currentDate = new Date();
    const startDate = new Date(tournament.startDate);
    if (currentDate > startDate) {
      throw new BadRequestError({
        message: `Cannot add new players as the tournament has already started on ${startDate.toDateString()}`
      });
    }

    for (const player of unsavedMatch.players) {
      // player.id is a String from the requestBody. conversion is necessary here.
      const playerId = new Types.ObjectId(player.id);

      if (!tournament.players.includes(playerId)) {
        const user = await UserModel.findById(playerId).exec();

        if (user === null || user === undefined) {
          throw new NotFoundError({
            message: "Player not found!"
          });
        }
        throw new BadRequestError({
          message: `Cannot create the match: Player: ${user.firstName} ${user.lastName} is not registered for this tournament.`
        });
      }
    }

    const newMatch = await MatchModel.create(unsavedMatch);
    tournament.matchSchedule.push(newMatch._id);
    await tournament.save();
    return await tournament.toObject();
  }

  public async updateTournamentById(
    tournamentId: string,
    requestBody: EditTournamentRequest,
    updaterId: string
  ): Promise<void> {
    const tournamentDoc = await this.getTournamentDocumentById(tournamentId);
    await this.validateTournamentDetails(
      requestBody,
      updaterId,
      true,
      tournamentDoc
    );

    // Apply the updates from requestBody to the tournament document
    tournamentDoc.set(requestBody);
    await tournamentDoc.save();
  }

  public async deleteTournamentById(tournamentId: string): Promise<void> {
    const result = await TournamentModel.deleteOne({
      _id: tournamentId
    }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundError({
        message: "Tournament not found or already deleted"
      });
    }
  }

  public async markUserMatchesLost(
    tournamentId: string,
    userId: string,
    creatorId: string
  ): Promise<void> {
    // Check if the userId is provided
    if (userId == null || userId === "" || userId.trim() === "") {
      throw new BadRequestError({
        message: "Player must be selected before proceeding with withdrawal."
      });
    }

    const tournament = await TournamentModel.findById(tournamentId).exec();
    if (tournament === null || tournament === undefined) {
      throw new NotFoundError({
        message: "Tournament not found"
      });
    }

    // Check if the creatorId matches the tournament's creator
    if (tournament.creator.id.toString("hex") !== creatorId) {
      throw new BadRequestError({
        message: "Only the tournament creator can modify the tournament!"
      });
    }

    // Fetch all matches for the tournament
    const matches = await MatchModel.find({ tournamentId }).exec();

    const currentTime = new Date();
    for (const match of matches) {
      // Only modify if there is no winner or end timestamp, so only the unfinished matches
      if (match.winner === undefined && match.endTimestamp === undefined) {
        // Check if the user is a player in the match
        const isUserInMatch = match.players.some(
          (player) => player.id.toString() === userId
        );

        if (isUserInMatch) {
          // Find the opponent
          const opponent = match.players.find(
            (player) => player.id.toString() !== userId
          );

          if (opponent !== undefined) {
            // Mark the opponent as the winner
            const id = opponent.id as Types.ObjectId;
            match.winner = id;
            match.endTimestamp = currentTime;
            await match.save();
          }
        }
      }
    }
  }

  public async getTournamentAndCreateSchedule(
    tournamentId: string
  ): Promise<Tournament | undefined> {
    // Helper function for getting tournament based on id and creating schedule
    // Used for tournament types where all matches are calculated simultaneously
    try {
      const tournament = await TournamentModel.findById(tournamentId).exec();
      if (tournament === null) {
        return;
      } else if (tournament.matchSchedule.length !== 0) {
        await tournament.populate([
          { path: "matchSchedule", model: "Match" },
          { path: "players", model: "User" }
        ]);
        return await tournament.toObject();
      }

      const newMatchIds = await this.generateTournamentSchedule(
        tournament as Tournament
      );
      if (newMatchIds.length !== 0) {
        tournament.matchSchedule.push(...newMatchIds);
        await tournament.save();
      }
      await tournament.populate([
        { path: "matchSchedule", model: "Match" },
        { path: "players", model: "User" }
      ]);
      return await tournament.toObject();
    } catch (error) {
      console.error(
        "Error in fetching tournament and creating schedule:",
        error
      );
    }
  }

  private async generateTournamentSchedule(
    tournament: Tournament,
    newPlayer: Types.ObjectId | undefined = undefined
  ): Promise<Types.ObjectId[]> {
    let matches: Array<UnsavedMatch | Match> = [];
    switch (tournament.type) {
      case TournamentType.RoundRobin:
        if (newPlayer === null) {
          throw new TypeError(
            "newPlayer shouldn't be null for round robin tournaments!"
          );
        }
        matches = TournamentService.generateRoundRobinSchedule(
          tournament.players as Types.ObjectId[],
          newPlayer as Types.ObjectId,
          tournament.id,
          tournament.matchTime
        );
        break;
      case TournamentType.Playoff:
        if (newPlayer !== undefined) {
          throw new TypeError(
            "Playoff matches should be generated all at once"
          );
        }
        matches = await TournamentService.generatePlayoffSchedule(
          tournament.players as Types.ObjectId[],
          tournament.id,
          tournament.matchTime
        );
        break;
      case TournamentType.PreliminaryPlayoff:
        for (const group of tournament.groups) {
          const addedPlayers: Types.ObjectId[] = [];
          for (const player of group) {
            const groupMatches = TournamentService.generateRoundRobinSchedule(
              addedPlayers,
              player,
              tournament.id,
              tournament.matchTime,
              "preliminary"
            );
            matches.push(...groupMatches);
            addedPlayers.push(player);
          }
        }
        break;
      case TournamentType.Swiss:
        matches = TournamentService.generateSwissSchedule(
          tournament.players as Types.ObjectId[],
          tournament.id,
          tournament.matchTime
        );

        break;
    }

    if (matches.length === 0) {
      return [];
    }
    const matchDocuments = await MatchModel.insertMany(matches);
    await MatchService.divideMatchesToCourts(tournament.id);
    return matchDocuments.map((doc) => doc._id);
  }

  public static generateRoundRobinSchedule(
    playerIds: Types.ObjectId[],
    newPlayer: Types.ObjectId,
    tournament: Types.ObjectId,
    tournamentMatchTime: MatchTime,
    tournamentType: MatchType = "group",
    tournamentRound: number = 1
  ): UnsavedMatch[] {
    const matches: UnsavedMatch[] = [];
    for (const playerId of playerIds) {
      if (!playerId.equals(newPlayer)) {
        matches.push({
          players: [
            { id: newPlayer, points: [], color: "white" },
            { id: playerId, points: [], color: "red" }
          ],
          type: tournamentType,
          elapsedTime: 0,
          timerStartedTimestamp: null,
          tournamentRound,
          tournamentId: tournament,
          matchTime: tournamentMatchTime
        });
      }
    }
    return matches;
  }

  public static async generatePlayoffSchedule(
    playerIds: Types.ObjectId[],
    tournament: Types.ObjectId,
    tournamentMatchTime: MatchTime,
    currentRound: number = 1,
    matchType: string = "playoff"
  ): Promise<UnsavedMatch[]> {
    const matches: UnsavedMatch[] = [];

    const bracketSize = TournamentService.nextPowerOfTwo(playerIds.length);
    const byesNeeded = bracketSize - playerIds.length;

    // create the byes first to be added later
    // this way the first registrants get the byes
    let i: number;
    const byes = [];
    for (i = 0; i < byesNeeded; i++) {
      byes.push({
        players: [{ id: playerIds[i], points: [], color: "white" }],
        type: matchType,
        elapsedTime: 0,
        timerStartedTimestamp: null,
        tournamentRound: currentRound,
        tournamentId: tournament,
        matchTime: tournamentMatchTime,
        winner: playerIds[i]
      });
    }

    // add the rest of the matches
    for (i; i < playerIds.length - 1; i += 2) {
      matches.push({
        players: [
          { id: playerIds[i], points: [], color: "white" },
          { id: playerIds[i + 1], points: [], color: "red" }
        ],
        type: matchType as MatchType,
        elapsedTime: 0,
        timerStartedTimestamp: null,
        tournamentRound: currentRound,
        tournamentId: tournament,
        matchTime: tournamentMatchTime
      });
    }

    matches.push(...(byes as UnsavedMatch[]));
    return matches;
  }

  private isPowerOfTwo(n: number): boolean {
    if (n <= 0) {
      return false;
    }
    return (n & (n - 1)) === 0;
  }

  private static nextPowerOfTwo(n: number): number {
    let power = 1;
    while (power < n) {
      power *= 2;
    }
    return power;
  }

  private calculateRoundRobinMatches(playerCount: number): number {
    if (playerCount < 2) {
      throw new BadRequestError({
        message:
          "At least two players are required for a round robin tournament."
      });
    }
    return (playerCount * (playerCount - 1)) / 2;
  }

  private dividePlayersIntoGroups(
    players: Types.ObjectId[],
    preferredGroupSize: number
  ): Types.ObjectId[][] {
    const totalPlayers = players.length;
    const numGroups = Math.ceil(totalPlayers / preferredGroupSize);

    const groups: Types.ObjectId[][] = Array.from(
      { length: numGroups },
      () => []
    );

    for (let i = 0; i < totalPlayers; i++) {
      const currentPlayer = players[i];
      const groupIndex = i % numGroups;

      groups[groupIndex].push(currentPlayer);
    }

    return groups;
  }

  private async getTournamentDocumentById(
    id: string
  ): Promise<HydratedDocument<Tournament>> {
    const tournament = await TournamentModel.findById(id).exec();

    if (tournament === null || tournament === undefined) {
      throw new NotFoundError({
        message: "Tournament not found"
      });
    }

    return tournament;
  }

  private static generateSwissSchedule(
    playerIds: Types.ObjectId[],
    tournament: Types.ObjectId,
    tournamentMatchTime: MatchTime,
    tournamentRound: number = 1
  ): UnsavedMatch[] {
    const matches: UnsavedMatch[] = [];
    const bye = [];
    for (let i = 0; i < playerIds.length; i += 2) {
      if (i + 1 === playerIds.length) {
        bye.push({
          players: [{ id: playerIds[i], points: [], color: "white" }],
          type: "swiss",
          elapsedTime: 0,
          timerStartedTimestamp: null,
          tournamentRound: 1,
          tournamentId: tournament,
          matchTime: tournamentMatchTime,
          winner: playerIds[i]
        });
        matches.push(...(bye as UnsavedMatch[]));
      } else {
        matches.push({
          players: [
            { id: playerIds[i], points: [], color: "white" },
            { id: playerIds[i + 1], points: [], color: "red" }
          ],
          type: "swiss",
          elapsedTime: 0,
          timerStartedTimestamp: null,
          tournamentRound,
          tournamentId: tournament,
          matchTime: tournamentMatchTime
        });
      }
    }

    return matches;
  }

  private async validateTournamentDetails(
    tournamentDetails: CreateTournamentRequest | EditTournamentRequest,
    creatorOrUpdaterId: string,
    isUpdate: boolean = false,
    existingTournamentDoc?: HydratedDocument<Tournament>
  ): Promise<void> {
    const MINIMUM_GROUP_SIZE = 3;
    if (
      tournamentDetails.type === TournamentType.RoundRobin &&
      tournamentDetails.maxPlayers !== undefined
    ) {
      this.calculateRoundRobinMatches(tournamentDetails.maxPlayers);
    }

    if (
      tournamentDetails.startDate !== undefined &&
      tournamentDetails.endDate !== undefined
    ) {
      const startDate = new Date(tournamentDetails.startDate);
      const endDate = new Date(tournamentDetails.endDate);
      if (startDate >= endDate) {
        throw new BadRequestError({
          message:
            "Invalid tournament dates. The start date must be before the end date."
        });
      }

      const now = new Date();

      // Check if start date and time is before the current date and time
      if (startDate < now) {
        throw new BadRequestError({
          message:
            "Invalid tournament date. The start date and time cannot be in the past."
        });
      }
    }

    if (tournamentDetails.type === TournamentType.TeamRoundRobin) {
      if (
        tournamentDetails.numberOfTeams === undefined ||
        tournamentDetails.playersPerTeam === undefined
      ) {
        throw new BadRequestError({
          message:
            "Number of teams and players per team are required for Team Round Robin tournaments."
        });
      }

      const totalPlayers =
        tournamentDetails.numberOfTeams * tournamentDetails.playersPerTeam;

      tournamentDetails.maxPlayers = totalPlayers;
    }

    // If tournament is type preliminary playoff, validate related fields
    if (tournamentDetails.type === TournamentType.PreliminaryPlayoff) {
      if (tournamentDetails.groupsSizePreference === undefined) {
        throw new BadRequestError({
          message:
            "Group size preference is required for Preliminary Playoff tournaments."
        });
      }
      if (tournamentDetails.groupsSizePreference < MINIMUM_GROUP_SIZE) {
        throw new BadRequestError({
          message: `Group size needs to be ${MINIMUM_GROUP_SIZE} on minimum`
        });
      }
      if (tournamentDetails.playersToPlayoffsPerGroup === undefined) {
        throw new BadRequestError({
          message:
            "Players to playoffs per group is required for Preliminary Playoff tournaments."
        });
      }
    }

    // If creating a new tournament or differentOrganizer is true during an update, validate organizer details
    if (tournamentDetails.differentOrganizer === false) {
      const organizer = await UserModel.findById(creatorOrUpdaterId).exec();

      if (organizer === null) {
        throw new NotFoundError({
          message: "No user data found for the organizer."
        });
      }

      tournamentDetails.organizerEmail = organizer.email;
      tournamentDetails.organizerPhone = organizer.phoneNumber;
    }

    // Additional checks for updates can be added here, e.g., ensuring the tournament hasn't started
    if (isUpdate && existingTournamentDoc !== undefined) {
      const currentDate = new Date();
      const tournamentStartDate = new Date(existingTournamentDoc.startDate);
      if (currentDate >= tournamentStartDate) {
        throw new BadRequestError({
          message: "Cannot update the tournament after it has started."
        });
      }
    }
  }
}
