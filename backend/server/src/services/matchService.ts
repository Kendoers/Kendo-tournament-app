import MatchModel, {
  type MatchPlayer,
  type Match,
  type MatchPoint,
  type PlayerColor,
  type MatchType
} from "../models/matchModel.js";
import NotFoundError from "../errors/NotFoundError.js";
import BadRequestError from "../errors/BadRequestError.js";
import {
  type CreateMatchRequest,
  type AddPointRequest
} from "../models/requestModel.js";
import { Document, Types } from "mongoose";
import { Tournament, TournamentModel, TournamentType, UnsavedMatch } from "../models/tournamentModel.js";
import { TournamentService } from "./tournamentService";
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
      pointMaker: requestBody.pointMaker
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

    if (match.winner !== undefined) {
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

    // Reset the timer timestamp
    match.elapsedTime += elapsedMilliseconds;
    match.timerStartedTimestamp = null;
    // Mark the timer to be off
    match.isTimerOn = false;
    await match.save();

    return await match.toObject();
  }

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

    const resolved = await this.checkMatchOutcome(match);

    await match.save();

    if((match.type === "preliminary" || match.type === "pre playoff") && resolved){
      const tournament = await this.checkPreliminary(match);

      if(tournament !== null){

        const [players, ties] = this.playersToPlayoffsFromPreliminary(tournament, tournament.matchSchedule as Match[]);
        
        if(ties.flat().length === 0){
          
          
          const playerIds = players.flat();
          if(playerIds.length % 2 !== 0){
            console.log("UNEVEN PLAYOFF, NOT IMPLEMENTED YET");
          }
          else{
            const shuffledPlayerIds = playerIds;
            const playoffRound = this.findHighestRound(tournament.matchSchedule as Match[])+1;
            for (let i = 0; i < shuffledPlayerIds.length; i += 2) {
      
              const newMatch = {
                players: [
                  { id: shuffledPlayerIds[i], points: [], color: "white" },
                  { id: shuffledPlayerIds[i + 1], points: [], color: "red" }
                ],
                type: "playoff",
                elapsedTime: 0,
                timerStartedTimestamp: null,
                tournamentRound: playoffRound
              };
      
              const matchDocuments = await MatchModel.create(newMatch);
              tournament.matchSchedule.push(matchDocuments.id)
            }
          }
          
        }

        else{
          const nextRound = this.findHighestRound(tournament.matchSchedule as Match[])+1;
          
          for(let i = 0; i<ties.length; i++){
            
            if(players[i].length === 0 && tournament.groups[i].length === ties[i].length){
              
              let matches: UnsavedMatch[] = [];
              
              let addedPlayers : Types.ObjectId[] = [];
              for(const player of tournament.groups[i]){
                let groupMatches = TournamentService.generateRoundRobinSchedule(
                  addedPlayers as Types.ObjectId[],
                  player,
                  tournament.id,
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

            else if(ties[i].length > 0){
              if(ties[i].length % 2 !== 0){
                console.log("UNEVEN TIES PLAYOFF, NOT IMPLEMENTED YET");
              }
              else{
                
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
                    tournamentRound: nextRound
                  };
          
                  const matchDocuments = await MatchModel.create(newMatch);
                  tournament.matchSchedule.push(matchDocuments.id)
                }
              }
            }
            
          }
        }
        await tournament.save();     
      }
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

    return await match.toObject();
  }

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

  private async checkMatchOutcome(match: Match): Promise<boolean> {
    const MAXIMUM_POINTS = 2;
    let player1Points = 0;
    let player2Points = 0;
    const player1: MatchPlayer = match.players[0] as MatchPlayer;
    const player2: MatchPlayer = match.players[1] as MatchPlayer;

    player1.points.forEach((point: MatchPoint) => {
      if (point.type === "hansoku") {
        // In case of hansoku, the opponent recieves half a point.
        player2Points += 0.5;
      } else {
        // Otherwise give one point to the player.
        player1Points++;
      }
    });

    player2.points.forEach((point: MatchPoint) => {
      if (point.type === "hansoku") {
        player1Points += 0.5;
      } else {
        player2Points++;
      }
    });

    if (player1Points >= MAXIMUM_POINTS) {
      match.winner = player1.id;
      match.endTimestamp = new Date();
      await this.createPlayoffSchedule(match.id, player1.id);
      return true;
    } else if (player2Points >= MAXIMUM_POINTS) {
      match.winner = player2.id;
      match.endTimestamp = new Date();
      await this.createPlayoffSchedule(match.id, player2.id);
      return true;
    }

    return false;
  }

  private async createPlayoffSchedule(
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

    if(tournament === null || tournament === undefined) {
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

    if(tournament.type === TournamentType.PreliminiaryPlayoff && currentRound === 1){
        return;
    }

    const nextRound = currentRound + 1;

    const winners = playedMatches
      .filter((match) => match.tournamentRound === currentRound && match.winner && match.type === "playoff")
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

    // Pair current winner with eligible winners for the next round
    for (const pairWithWinnerId of eligibleWinners) {
      if (
        pairWithWinnerId !== null &&
        pairWithWinnerId !== undefined &&
        !pairWithWinnerId.equals(winnerId)
      ) {
        // Create a new match.
        const newMatch = {
          players: [
            { id: winnerId, points: [], color: "white" },
            { id: pairWithWinnerId, points: [], color: "red" }
          ],
          type: "playoff",
          elapsedTime: 0,
          timerStartedTimestamp: null,
          tournamentRound: nextRound
        };

        const matchDocuments = await MatchModel.create(newMatch);
        tournament.matchSchedule.push(matchDocuments.id);
      }
    }

    // Save the tournament if new matches were added
    if (eligibleWinners.length > 0) {
      await tournament.save();
    }
  }

  private playersToPlayoffsFromPreliminary(
    tournament: Tournament & Document,
    matches: Match[],
  ):  [Types.ObjectId[][], Types.ObjectId[][] ]{
    let amountToPlayoffsPerGroup = tournament.playersToPlayoffsPerGroup;

    let rankingMap: Map<string, Array<number>> = this.getAllPlayerScores(matches, "preliminary");
    let groupRankings: Array<Array<rankingStruct>> = this.formRankings(rankingMap, tournament);

    let groupTies: Types.ObjectId[][] = [];
    let availableSpots: Array<number> = []

    for (let i=0; i<groupRankings.length; i++) {
      let tieIds: Array<Types.ObjectId> = [];
      availableSpots.push(0);

      // tiescore including wins/draw points and ippons
      let tieScore = [groupRankings[i][amountToPlayoffsPerGroup-1][1], groupRankings[i][amountToPlayoffsPerGroup-1][2]];

      if(groupRankings[i].length > amountToPlayoffsPerGroup){
        // check if there is a tie that matters (tie between last player to playoff and the next in scores)
        if(groupRankings[i][amountToPlayoffsPerGroup][1] === tieScore[0] &&
          groupRankings[i][amountToPlayoffsPerGroup][2] === tieScore[1]){
          
          for(let j=0; j<groupRankings[i].length; j++){

            if(groupRankings[i][j][1] === tieScore[0] && groupRankings[i][j][2] === tieScore[1]){
              if(tieIds.length === 0){
                availableSpots[i] = (amountToPlayoffsPerGroup-j);
              }
              tieIds.push(groupRankings[i][j][0]);
            }
          }
          
        }

      }
      groupTies.push(tieIds);
    }

    let playerIds: Types.ObjectId[][] = [];
    
    for (let i = 0; i<groupRankings.length; i++) {
      const topPlayers = groupRankings[i].slice(0, amountToPlayoffsPerGroup-availableSpots[i]);
      
      // Extract the playerIds from the topPlayers
      const topPlayerIds = topPlayers.map(([playerId, _]) => playerId);

      // Append the top playerIds to the playerIds array
      playerIds.push(topPlayerIds);
    }

    let prePlayoffRankingMap : Map<string, Array<number>> = this.getAllPlayerScores(matches, "pre playoff");
    if(prePlayoffRankingMap.size > 0) {
      let prePlayoffRankings: Array<Array<rankingStruct>> = this.formRankings(prePlayoffRankingMap, tournament);
      let tiedPrePlayoff : Types.ObjectId[][] = []
      for (let i=0; i<prePlayoffRankings.length; i++) {
        let tieIds: Array<Types.ObjectId> = [];

        if(prePlayoffRankings[i].length > 0){
          let highScore = prePlayoffRankings[i][0][1];
          for(let j=0; j<prePlayoffRankings[i].length; j++){
            if(prePlayoffRankings[i][j][1] === highScore){
              tieIds.push(prePlayoffRankings[i][j][0]);
            }
          }
        }
        tiedPrePlayoff.push(tieIds);
      }
      
      for(let i=0; i<tiedPrePlayoff.length; i++){
        if(amountToPlayoffsPerGroup-playerIds[i].length === tiedPrePlayoff[i].length){
          playerIds[i].push(...tiedPrePlayoff[i])
          groupTies[i] = [];
        }
        else if(tiedPrePlayoff[i].length > 0 && playerIds[i].length < amountToPlayoffsPerGroup){
          groupTies[i] = tiedPrePlayoff[i];
        }
      }

    }

    return [playerIds, groupTies];

  }

  private async checkPreliminary(match: Match): Promise<Tournament & Document | null>{
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

      if(tournament === null || tournament === undefined) {
        throw new NotFoundError({
          message: "Tournament not found"
        });
      }
      const playedMatches = tournament.matchSchedule;

      if(tournament.type === TournamentType.PreliminiaryPlayoff){
        let played = 0;

        for(let i=0; i<playedMatches.length; i++){
          if(playedMatches[i].winner != null){
            played++;
          }
        }

        if(played === playedMatches.length){
          return tournament;
        }
        return null;
      }
      else{
        return null
      }
  }
  
  private getAllPlayerScores(
    matches: Match[],
    matchType?: MatchType
  ): Map<string, Array<number>>{
    let rankingMap: Map<string, Array<number>> = new Map();
    
    for(const match of matches){

      if(matchType === undefined || match.type === matchType){
        
        for(let j=0; j<match.players.length; j++){
          const matchPlayer: MatchPlayer = match.players[j] as MatchPlayer;
          let playerPoints = 0;
          matchPlayer.points.forEach((point: MatchPoint) => {
            if (point.type === "hansoku") {
              // In case of hansoku, the opponent recieves half a point.
              playerPoints += 0.5;
            } else {
              // Otherwise give one point to the player.
              playerPoints++;
            }
          });
  
          if(rankingMap.has(matchPlayer.id.toString())){
            
            let currentPoints = rankingMap.get(matchPlayer.id.toString()) || [0,0];
            currentPoints[1] += playerPoints;
            if(match.winner?.equals(matchPlayer.id)){
              currentPoints[0] += 3;
            }
            rankingMap.set(matchPlayer.id.toString(), currentPoints);
          }
  
          else{
            let currentPoints = [0, playerPoints];
            if(match.winner?.equals(matchPlayer.id)){
              currentPoints[0] += 3;
            }
            rankingMap.set(matchPlayer.id.toString(), currentPoints);
            
          }
  
        }  
      }
      
    }

    return rankingMap;
  }

  private formRankings(
    rankingMap: Map<string, Array<number>>,
    tournament: Tournament & Document
    ): Array<Array<rankingStruct>>
  {
    let groupRankings: Array<Array<rankingStruct>> = [];

    for(let i=0; i<tournament.groups.length; i++){
      let groupRankingMap: Array<rankingStruct> = [];
      groupRankings.push(groupRankingMap);

      for(const playerId of tournament.groups[i]){
        if(rankingMap.has(playerId.toString())){
          let score = rankingMap.get(playerId.toString()) || [0, 0];
        groupRankings[i].push([playerId, score[0], score[1]]);
        }
      }
    }

    groupRankings.forEach((group) => {
      group.sort((a, b) =>{
        if(b[1] !== a[1] ){
          return b[1] - a[1];
        }
        return b[2] - a[2];
      });
    });
    return groupRankings;
  }
  private findHighestRound(matches: Match[]): number {
    let round = 1;
    for(const match of matches){
      if(match.tournamentRound > round){
        round = match.tournamentRound;
      }
    }
    return round;
  }
}


