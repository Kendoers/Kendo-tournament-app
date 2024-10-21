import { afterEach, before, beforeEach, describe } from "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import {
  CreateTournamentRequest,
  EditTournamentRequest
} from "../../src/models/requestModel";
import {
  Tournament,
  TournamentModel,
  TournamentType, UnsavedMatch
} from "../../src/models/tournamentModel";
import { TournamentService } from "../../src/services/tournamentService";
import { Types } from "mongoose";
import { UserService } from "../../src/services/userService";
import * as Helper from "../testHelpers";
import mongoose from "mongoose";
import UserModel, { User } from "../../src/models/userModel";
import MatchModel from "../../src/models/matchModel";


chai.use(chaiAsPromised);
const expect = chai.expect;

let now = new Date();
let tomorrow = new Date(new Date().setDate(now.getDate() + 1));
let theDayAfter = new Date(new Date().setDate(now.getDate() + 2));


let request_template: CreateTournamentRequest = {
  name: "test",
  location: "Tampere",
  startDate: tomorrow.toISOString(),
  endDate: theDayAfter.toISOString(),
  type: TournamentType.Swiss,
  maxPlayers: 2,
  organizerEmail: "test@example.com",
  organizerPhone: "12345678",
  description: "test tournament",
  matchTime: 180000,
  category: "championship",
  numberOfCourts: 2,
  differentOrganizer: true,
  paid: false
};

let request_template2: CreateTournamentRequest = {
  name: "test2",
  location: "Tampere",
  startDate: tomorrow.toISOString(),
  endDate: theDayAfter.toISOString(),
  type: TournamentType.Swiss,
  groupsSizePreference: 3,
  maxPlayers: 2,
  organizerEmail: "test@example.com",
  organizerPhone: "12345678",
  description: "test tournament",
  matchTime: 180000,
  category: "championship",
  numberOfCourts: 2,
  differentOrganizer: true,
  paid: false
};

describe("TournamentService", () => {

  let tournamentService: TournamentService;

  let testPlayerId: string;
  let testPlayer2Id: string;
  let testPlayer3Id: string;

  before(async () => {
    // these should already be in the test db
    //  -> see initializeTestDb() in testHelpers.ts
    let testPlayer = await UserModel.findOne({userName: 'testUser'}).exec();
    let testPlayer2 = await UserModel.findOne({userName: 'testUser2'}).exec();
    testPlayerId = testPlayer.id;
    testPlayer2Id = testPlayer2.id;

    testPlayer3Id = (await UserModel.create(Helper.testUser3)).id;

  });

  beforeEach(async () => {
    // prevent emitting updates
    sinon.stub(TournamentService.prototype, 'emitTournamentUpdate').resolves();

    // add test users to db
    // await UserModel.create([Helper.testUser, Helper.testUser2, Helper.testUser3]);

    tournamentService = new TournamentService();
  });

  afterEach(async () => {
    sinon.restore();

    // clear db of tournaments
    await TournamentModel.deleteMany({});
    await MatchModel.deleteMany({});
  });

  // TODO: validation tests for different tournament types
  describe("createTournament", () => {

    // TODO: tournament with diff organizer false

    it("should add the tournament to the database", async () => {
      let request: CreateTournamentRequest = {...request_template};
      let id: string = new Types.ObjectId().toString();

      let res = await tournamentService.createTournament(request, id);
      let res2 = await tournamentService.getAllTournaments();
      expect(res2.length).to.equal(1);
      expect(res).to.equal(res2.at(0));

    });


    it("should be rejected when start date is not before end date", async () => {
      let request: CreateTournamentRequest = {...request_template};
      let id: string = new Types.ObjectId().toString();

      // start later than end
      request.startDate = "2021-01-04T00:00:00.000Z";
      request.endDate = "2021-01-03T00:00:00.000Z";
      await expect(tournamentService.createTournament(request, id)).to.be.rejectedWith(
        "Invalid tournament dates. The start date must be before the end date.");

      // start equal to end
      request.startDate = request.endDate;
      await expect(tournamentService.createTournament(request, id)).to.be.rejectedWith(
        "Invalid tournament dates. The start date must be before the end date.");
    });

    it("should be rejected when one of the dates is not a valid date", async () => {
      let request: CreateTournamentRequest = {...request_template};
      let id: string = new Types.ObjectId().toString();

      request.startDate = "2021-01-50T00:00:00.000Z";
      await expect(tournamentService.createTournament(request, id)).to.be.rejectedWith(
        "Invalid tournament dates.");

      request.startDate = "invalid date";
      await expect(tournamentService.createTournament(request, id)).to.be.rejectedWith(
        "Invalid tournament dates.");

      request.endDate = "invalid date";
      await expect(tournamentService.createTournament(request, id)).to.be.rejectedWith(
        "Invalid tournament dates.");
    });
  });

  describe("addPlayerToTournament", () => {
    let testTournamentId: string;

    beforeEach(async () => {
      let creatorId = new Types.ObjectId().toString();
      let tournament = await TournamentModel.create({
        ...request_template,
        creator: creatorId
      });
      testTournamentId = tournament.id;
    });

    it("should add the player to the tournament", async () => {

      await tournamentService.addPlayerToTournament(testTournamentId, testPlayerId);

      let tournament: Tournament = await TournamentModel
        .findById(testTournamentId);

      expect(tournament.players.length).to.equal(1);
      expect(tournament.players.at(0).toString()).to.equal(testPlayerId);
    });

    it("should not add the same player twice", async () => {

      await tournamentService.addPlayerToTournament(testTournamentId, testPlayerId);
      await expect(tournamentService.addPlayerToTournament(testTournamentId, testPlayerId))
        .to.be.rejectedWith("Player already registered in the tournament");

      let tournament: Tournament = await TournamentModel
        .findById(testTournamentId);

      expect(tournament.players.length).to.equal(1);
    });

    it("should add multiple players", async () => {

      await tournamentService.addPlayerToTournament(testTournamentId, testPlayerId);
      await tournamentService.addPlayerToTournament(testTournamentId, testPlayer2Id);

      let tournament: Tournament = await TournamentModel
        .findById(testTournamentId);

      expect(tournament.players.length).to.equal(2);
      expect(tournament.players).to.contain(new Types.ObjectId(testPlayerId));
      expect(tournament.players).to.contain(new Types.ObjectId(testPlayer2Id));
    });

    it("should not add players past maximum", async () => {

      await tournamentService.addPlayerToTournament(testTournamentId, testPlayerId);
      await tournamentService.addPlayerToTournament(testTournamentId, testPlayer2Id);
      await expect(tournamentService.addPlayerToTournament(testTournamentId, testPlayer3Id))
        .to.be.rejectedWith("Tournament has reached its maximum number of players");

      let tournament: Tournament = await TournamentModel
        .findById(testTournamentId);

      expect(tournament.players.length).to.equal(2);
    });

    // TODO: removePlayerFromTournament()
    // TODO: addMatchToTournament()
    // TODO: updateTournamentById()
    // TODO: deleteTournamentById()
    // TODO: markUserMatchesLost()
    // TODO: getTournamentAndCreateSchedule()
  });

  // TODO: paremeterize
  describe("removePlayerFromTournament", () => {

    let testTournamentId: string;

    beforeEach(async () => {
      let creatorId = new Types.ObjectId().toString();
      let tournament = await TournamentModel.create({
        ...request_template,
        creator: creatorId
      });
      testTournamentId = tournament.id;
    });

    it("should remove the player from the tournament", async () => {
      let tournament = await TournamentModel.findById(testTournamentId).exec();
      tournament.players.push(new Types.ObjectId(testPlayerId));
      tournament.players.push(new Types.ObjectId(testPlayer2Id));
      await tournament.save();

      await tournamentService.removePlayerFromTournament(testTournamentId, testPlayerId);

      tournament = await TournamentModel.findById(testTournamentId).exec();
      expect(tournament.players).not.to.contain(new Types.ObjectId(testPlayerId));
      expect(tournament.players).to.contain(new Types.ObjectId(testPlayer2Id));

      await tournamentService.removePlayerFromTournament(testTournamentId, testPlayer2Id);

      tournament = await TournamentModel.findById(testTournamentId).exec();
      expect(tournament.players).not.to.contain(new Types.ObjectId(testPlayer2Id));
      expect(tournament.players.length).to.equal(0);
    });

    it("should not remove a player who is not in the tournament", async () => {
      let tournament = await TournamentModel.findById(testTournamentId).exec();
      tournament.players.push(new Types.ObjectId(testPlayerId));
      tournament.players.push(new Types.ObjectId(testPlayer2Id));
      await tournament.save();

      tournament = await TournamentModel.findById(testTournamentId).exec();

      // TODO:
      // at the moment this does not remove any players but does trigger an
      // unnecessary recalculation of the tournament schedule
      await expect(tournamentService.removePlayerFromTournament(testTournamentId, testPlayer3Id))
        .to.not.be.rejected; // TODO: message not defined

      let tournament_new = await TournamentModel.findById(testTournamentId).exec();
      expect(tournament_new).to.deep.equal(tournament);
      // expect(tournament.players.length).to.equal(2);
    });

    it("should behave correctly when trying to remove from an empty tournament", async () => {

      let tournament = await TournamentModel.findById(testTournamentId).exec();

      await expect(tournamentService.removePlayerFromTournament(testTournamentId, testPlayerId))
        .to.be.rejected; // TODO: message not defined

      let tournament_new = await TournamentModel.findById(testTournamentId).exec();

      expect(tournament_new).to.deep.equal(tournament);
    });
  });

  describe("deleteTournamentById", () => {

    let testTournamentId: string;

    beforeEach(async () => {
      let creatorId = new Types.ObjectId().toString();
      let tournament = await TournamentModel.create({
        ...request_template,
        creator: creatorId
      });
      testTournamentId = tournament.id;
    });

    it("should delete the tournament", async () => {
      await tournamentService.deleteTournamentById(testTournamentId);
      let res = await TournamentModel.findById(testTournamentId).exec();
      expect(res).to.equal(null);
    });

    it("should reject when tournament does not exist", async () => {
      let id = new Types.ObjectId().toString();
      await expect(tournamentService.deleteTournamentById(id))
        .to.be.rejectedWith("Tournament not found or already deleted");

      let res = await TournamentModel.findById(testTournamentId).exec();
      expect(res).to.not.equal(null);
    });
  });

  // TODO: how is this even supposed to be used?
  // There is a mention of manual tournament schedule,
  // how is that done?
  // is it possible to delete the matches of the automatically created schedule?
  // new tournament type? (does not currently exist)
  describe("addMatchToTournament", () => {
    let testTournamentId: string;
    let match: UnsavedMatch;

    beforeEach(async () => {

      let creatorId = new Types.ObjectId().toString();
      let tournament = await TournamentModel.create({
        ...request_template,
        creator: creatorId
      });
      testTournamentId = tournament.id;

      match = {
        players: [new  Types.ObjectId(testPlayerId), new  Types.ObjectId(testPlayer2Id)],
        type: "group",
        elapsedTime: 0,
        matchTime: 300000,
        tournamentId: new Types.ObjectId(testTournamentId),
        tournamentRound: 1,
        timerStartedTimestamp: new Date()
      }
    });

    it("should add the match", async () => {
      // TODO:
      // Fails with error: Path 'color' is required.
      // Investigate why it fails with this but not when autogenerating
      // schedule during addPlayerToTournament().
      //
      // TODO: create MatchPlayers instead of users

      await tournamentService.addPlayerToTournament(testTournamentId, testPlayerId);
      await tournamentService.addPlayerToTournament(testTournamentId, testPlayer2Id);
      await tournamentService.addMatchToTournament(testTournamentId, match);

      let tournament = await TournamentModel.findById(testTournamentId).exec();
      expect(tournament.matchSchedule.length).to.equal(1);
    });
  });

  describe("getAllTournaments", () => {
    it("should return all the tournaments", async () => {
      let creatorId = new Types.ObjectId().toString();
      let tournament: Tournament = (await TournamentModel.create({
        ...request_template,
        creator: creatorId
      })).toObject();
      let tournament2: Tournament = (await TournamentModel.create({
        ...request_template2,
        creator: creatorId
      })).toObject();

      let res = await tournamentService.getAllTournaments();

      let has_t1 = res.some(t => t.id.toString() === tournament.id.toString());
      expect(has_t1).to.be.true;

      let has_t2 = res.some(t => t.id.toString() === tournament2.id.toString());
      expect(has_t2).to.be.true;

      expect(res.length).to.equal(2);
    });

    it("should behave correctly when there are no tournaments", async () => {
      expect(tournamentService.getAllTournaments())
        .to.be.rejectedWith("No tournaments found");
    });
  });

  describe("getTournamentById", () => {
    it("should return the tournament", async () => {
      let creatorId = new Types.ObjectId().toString();
      let tournament: Tournament = (await TournamentModel.create({
        ...request_template,
        creator: creatorId
      })).toObject();

      let res = await tournamentService.getTournamentById(tournament.id.toString());

      expect(res.id.toString()).to.equal(tournament.id.toString());
    });

    it("should reject when tournament does not exist", async () => {
      expect(tournamentService.getTournamentById(new Types.ObjectId().toString()))
        .to.rejectedWith("Tournament not found");
    });
  });

  describe("updateTournamentById", () => {
    let request: EditTournamentRequest = {
      name: "updated"
    };
  });
});

