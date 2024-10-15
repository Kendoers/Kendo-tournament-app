import { afterEach, beforeEach, describe } from "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import { CreateTournamentRequest } from "../../src/models/requestModel";
import { TournamentType } from "../../src/models/tournamentModel";
import { TournamentService } from "../../src/services/tournamentService";
import { Types } from "mongoose";


chai.use(chaiAsPromised);
const expect = chai.expect;


describe("TournamentService", () => {

  beforeEach(() => {
    // prevent emitting updates
    sinon.stub(TournamentService.prototype, 'emitTournamentUpdate').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("createTournament", () => {

    let request_template: CreateTournamentRequest = {
      name: "test",
      location: "Tampere",
      startDate: "2021-01-02T00:00:00.000Z",
      endDate: "2021-01-03T00:00:00.000Z",
      type: TournamentType.Playoff,
      maxPlayers: 8,
      organizerEmail: "test@example.com",
      organizerPhone: "12345678",
      description: "test tournament",
      matchTime: 180000,
      category: "championship",
      numberOfCourts: 2,
      differentOrganizer: true,
      paid: false
    };

    let id: string = new Types.ObjectId().toString();

    it("should add the tournament to the database", async () => {
      let tournamentService: TournamentService = new TournamentService();
      let request: CreateTournamentRequest = {...request_template};

      let res = await tournamentService.createTournament(request, id);
      let res2 = await tournamentService.getAllTournaments();
      expect(res2.length).to.equal(1);
      expect(res).to.equal(res2.at(0));

    });

    it("should be rejected when start date is not before end date", async () => {
      let tournamentService: TournamentService = new TournamentService();
      let request: CreateTournamentRequest = {...request_template};

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

    it("should be rejected when dates are not valid dates", async () => {
      let tournamentService: TournamentService = new TournamentService();
      let request: CreateTournamentRequest = {...request_template};

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
});

