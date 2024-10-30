import {
  Route,
  Controller,
  Get,
  Path,
  Tags,
  Security,
  Body,
  Post,
  Put,
  Request,
  Delete
} from "tsoa";
import { TournamentService } from "../services/tournamentService.js";
import { UnsavedMatch } from "../models/tournamentModel.js";
import type { Tournament } from "../models/tournamentModel.js";
import {
  CreateTournamentRequest,
  EditTournamentRequest,
  ObjectIdString,
  SignupForTournamentRequest
} from "../models/requestModel.js";
import type { JwtPayload } from "jsonwebtoken";
import type * as express from "express";

@Route("tournaments")
export class TournamentController extends Controller {
  /*
   * Get tournament details from a specific tournament.
   */
  @Get("{tournamentId}")
  @Tags("Tournaments")
  public async getTournament(
    @Path() tournamentId: ObjectIdString
  ): Promise<Tournament> {
    this.setStatus(200);
    return await this.service.getTournamentById(tournamentId);
  }

  /*
   * Get all tournaments.
   */
  @Get()
  @Tags("Tournaments")
  public async getTournaments(): Promise<Tournament[]> {
    this.setStatus(200);
    return await this.service.getAllTournaments();
  }

  /*
   * Create a new tournament.
   */
  @Post()
  @Tags("Tournaments")
  @Security("jwt")
  public async createTournament(
    @Request() request: express.Request & { user: JwtPayload },
    @Body() tournamentData: CreateTournamentRequest
  ): Promise<Tournament> {
    this.setStatus(201);

    const creator = request.user.id;

    return await this.service.createTournament(tournamentData, creator);
  }

  /*
   * Create a team in the Team Round Robin tournament.
   */
  @Post("{tournamentId}/add-team")
  @Tags("Tournaments")
  @Security("jwt")
  public async addTeamToTournament(
    @Request() request: express.Request & { user: JwtPayload },
    @Path() tournamentId: ObjectIdString,
    @Body() teamData: { name: string }
  ): Promise<Tournament> {
    this.setStatus(201);
    const creatorId = request.user.id;
    const teamName = teamData.name;

    return await this.service.addTeamToTournament(
      tournamentId,
      teamName,
      creatorId
    );
  }

  /*
   * Remove team from Team Round Robin tournament.
   */
  @Delete("{tournamentId}/remove-team")
  @Tags("Tournaments")
  @Security("jwt")
  public async removeTeamFromTournament(
    @Path() tournamentId: ObjectIdString,
    @Body() request: { teamId: string }
  ): Promise<Tournament> {
    this.setStatus(204);
    const updatedTournament = await this.service.removeTeamFromTournament(
      tournamentId,
      request.teamId
    );
    return updatedTournament;
  }
  /*
   * Join a team.
   */
  @Post("{tournamentId}/teams/{teamId}/join")
  @Tags("Teams")
  @Security("jwt")
  public async joinTeam(
    @Request() request: express.Request & { user: JwtPayload },
    @Path() tournamentId: string,
    @Path() teamId: string,
    @Body() body: { userId: string }
  ): Promise<void> {
    const userId = body.userId;

    await this.service.joinTeam(tournamentId, teamId, userId);
    this.setStatus(200);
  }

  /*
   * Leave a team.
   */
  @Delete("{tournamentId}/teams/{teamId}/leave")
  @Tags("Teams")
  @Security("jwt")
  public async leaveTeam(
    @Path() tournamentId: string,
    @Path() teamId: string,
    @Body() request: { userId: string }
  ): Promise<void> {
    this.setStatus(204);

    await this.service.leaveTeam(tournamentId, teamId, request.userId);
  }

  /*
   * Kick player from the team.
   */
  @Delete("{tournamentId}/teams/{teamId}/kickPlayer")
  public async kickPlayerFromTeam(
    @Path() tournamentId: string,
    @Path() teamId: string,
    @Body() request: { userId: string }
  ): Promise<void> {
    this.setStatus(204);

    await this.service.kickPlayerFromTeam(tournamentId, teamId, request.userId);
  }

  @Post("{tournamentId}/create-schedule")
  @Tags("Tournaments")
  @Security("jwt")
  public async createSchedule(
    @Path() tournamentId: ObjectIdString
  ): Promise<Tournament | undefined> {
    const result =
      await this.service.getTournamentAndCreateSchedule(tournamentId);
    if (result !== undefined) {
      this.setStatus(201);
    } else {
      this.setStatus(400);
    }
    return result;
  }

  @Put("{tournamentId}/sign-up")
  @Tags("Tournaments")
  @Security("jwt")
  public async signUpForTournament(
    @Path() tournamentId: ObjectIdString,
    @Body() requestBody: SignupForTournamentRequest
  ): Promise<void> {
    this.setStatus(204);
    await this.service.addPlayerToTournament(
      tournamentId,
      requestBody.playerId
    );
  }

  /*
   *  Remove a player from a tournament.
   */
  @Delete("{tournamentId}/cancel-signup")
  @Tags("Tournaments")
  @Security("jwt")
  public async cancelSignup(
    @Path() tournamentId: ObjectIdString,
    @Body() request: { playerId: ObjectIdString }
  ): Promise<void> {
    this.setStatus(204);
    await this.service.removePlayerFromTournament(
      tournamentId,
      request.playerId
    );
  }

  /*
   *  Add a match to a tournament.
   */
  @Put("{tournamentId}/manual-schedule")
  @Tags("Tournaments")
  @Security("jwt")
  public async manualSchedule(
    @Path() tournamentId: ObjectIdString,
    @Body() requestBody: UnsavedMatch
  ): Promise<Tournament> {
    const result = await this.service.addMatchToTournament(
      tournamentId,
      requestBody
    );
    this.setStatus(201);
    return result;
  }

  /*
   *  Update tournament details.
   */
  @Put("{tournamentId}/update")
  @Tags("Tournaments")
  @Security("jwt")
  public async updateTournament(
    @Request() request: express.Request & { user: JwtPayload },
    @Path() tournamentId: ObjectIdString,
    @Body() requestBody: EditTournamentRequest
  ): Promise<void> {
    const updaterId = request.user.id;

    this.setStatus(204);
    await this.service.updateTournamentById(
      tournamentId,
      requestBody,
      updaterId
    );
  }

  /*
   * Delete a tournament
   */
  @Delete("{tournamentId}/delete")
  @Tags("Tournaments")
  @Security("jwt")
  public async deleteTournament(
    @Path() tournamentId: ObjectIdString
  ): Promise<void> {
    this.setStatus(204);
    await this.service.deleteTournamentById(tournamentId);
  }

  @Put("{tournamentId}/mark-user-matches-lost")
  @Tags("Tournaments")
  @Security("jwt")
  public async markUserMatchesLost(
    @Request() request: express.Request & { user: JwtPayload },
    @Path() tournamentId: ObjectIdString,
    @Body() requestBody: { userId: string }
  ): Promise<void> {
    const creatorId = request.user.id;
    const userId = requestBody.userId;

    this.setStatus(204);
    await this.service.markUserMatchesLost(tournamentId, userId, creatorId);
  }

  private get service(): TournamentService {
    return new TournamentService();
  }
}
