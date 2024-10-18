import { afterEach, before, beforeEach, describe } from "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import { CreateTournamentRequest } from "../../src/models/requestModel";
import {
  Tournament,
  TournamentModel,
  TournamentType
} from "../../src/models/tournamentModel";
import { TournamentService } from "../../src/services/tournamentService";
import { Types } from "mongoose";
import { UserService } from "../../src/services/userService";
import * as Helper from "../testHelpers";
import mongoose from "mongoose";
import UserModel, { User } from "../../src/models/userModel";


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
  type: TournamentType.Playoff,
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

  let userService: UserService;
  let tournamentService: TournamentService;

  beforeEach(async () => {
    // prevent emitting updates
    sinon.stub(TournamentService.prototype, 'emitTournamentUpdate').resolves();

    // add test users to db
    // await UserModel.create([Helper.testUser, Helper.testUser2, Helper.testUser3]);

    userService = new UserService();
    tournamentService = new TournamentService();
  });

  afterEach(async () => {
    sinon.restore();

    // clear db of tournaments
    await TournamentModel.deleteMany({});
  });

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
    let testPlayerId: string;
    let testPlayer2Id: string;
    let testPlayer3Id: string;
    let testTournamentId: string;

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
});

