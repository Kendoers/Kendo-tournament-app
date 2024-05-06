import { describe, beforeEach, afterEach } from "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import MatchModel, { MatchPlayer } from "../../src/models/matchModel.ts";
import { MatchService } from "../../src/services/matchService.ts";
import NotFoundError from "../../src/errors/NotFoundError.ts";
import BadRequestError from "../../src/errors/BadRequestError.ts";
import { Types } from "mongoose";
import { CreateMatchRequest, AddPointRequest } from "../../src/models/requestModel.ts";
import { TournamentModel } from "../../src/models/tournamentModel.ts";
import { TournamentService } from "../../src/services/tournamentService.ts";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('MatchService', () => {
    let matchService: MatchService;

    beforeEach(() => {
        sinon.stub(TournamentService.prototype, 'emitTournamentUpdate').resolves();

        matchService = new MatchService();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('createMatch', () => {
        it('should create a match successfully', async () => {
            const matchRequest: CreateMatchRequest = {
                tournamentId: new Types.ObjectId().toString(),
                matchType: "group",
                players: [{id: new Types.ObjectId().toString(), color: "white"}, {id: new Types.ObjectId().toString(), color: "red"}],
                matchTime: 300000
            };
            const expectedMatch = {
                ...matchRequest,
                id: new Types.ObjectId(),
                toObject: () => ({ ...matchRequest }) // Ensuring toObject is present
            };

            sinon.stub(MatchModel, 'create').resolves(expectedMatch);

            const result = await matchService.createMatch(matchRequest);
            expect(result).to.include(matchRequest);
        });

        it('should throw an error when required fields are missing', async () => {
            const matchRequest: Partial<CreateMatchRequest> = {}; // Missing required fields
            sinon.stub(MatchModel, 'create').rejects(new Error("Required fields missing"));

            await expect(matchService.createMatch(matchRequest as CreateMatchRequest))
                .to.be.rejectedWith(Error);
        });
    });

    describe('getMatchById', () => {
        it('should return a match by ID', async () => {
            const matchId = new Types.ObjectId();
            const matchData = {
                id: matchId,
                type: "group",
                players: [],
                matchTime: 180000,
                toObject: () => ({ id: matchId })
            };

            sinon.stub(MatchModel, 'findById').returns({
                exec: sinon.stub().resolves(matchData) 
            });

            const result = await matchService.getMatchById(matchId.toString());
            expect(result).to.have.property('id').that.equals(matchId);
        });

        it('should throw NotFoundError if no match is found', async () => {
            const matchId = new Types.ObjectId();
            sinon.stub(MatchModel, 'findById').returns({
                exec: sinon.stub().resolves(null) 
            });

            await expect(matchService.getMatchById(matchId.toString()))
                .to.be.rejectedWith(NotFoundError);
        });
    });

    describe('deleteMatchById', () => {
        it('should delete a match successfully', async () => {
            const matchId = new Types.ObjectId();
            sinon.stub(MatchModel, 'deleteOne').returns({
                exec: sinon.stub().resolves({ deletedCount: 1 })
            });
    
            await expect(matchService.deleteMatchById(matchId.toString()))
                .to.eventually.be.fulfilled;
        });
    
        it('should throw NotFoundError when no match with that id exists', async () => {
            const matchId = new Types.ObjectId();
            sinon.stub(MatchModel, 'deleteOne').returns({
                exec: sinon.stub().resolves({ deletedCount: 0 })
            });
    
            await expect(matchService.deleteMatchById(matchId.toString()))
                .to.eventually.be.rejectedWith(NotFoundError);
        });
    });
    

    describe('startTimer', () => {
        it('should start the timer for an ongoing match', async () => {
            const matchId = new Types.ObjectId();
            const matchData = {
                id: matchId,
                type: "group",
                players: [],
                isTimerOn: false,
                startTimestamp: undefined,
                timerStartedTimestamp: null,
                elapsedTime: 0,
                matchTime: 300000,
                save: async () => {}, // Adding a mock save method
                toObject: () => ({ ...matchData, isTimerOn: true, startTimestamp: new Date(), timerStartedTimestamp: new Date()})
            };

            sinon.stub(MatchModel, 'findById').returns({
                exec: sinon.stub().resolves(matchData)
            });
            const saveStub = sinon.stub(matchData, 'save').resolves();

            const result = await matchService.startTimer(matchId.toString());
            expect(result.isTimerOn).to.be.true;
            expect(result.timerStartedTimestamp).to.not.be.null;
            expect(result.startTimestamp).to.not.be.undefined;
            expect(saveStub.calledOnce).to.be.true;
        });

        it('should throw BadRequestError if match is already finished', async () => {
            const matchId = new Types.ObjectId();
            const matchData = {
                id: matchId,
                winner: new Types.ObjectId(),
                timerStartedTimestamp: null
            };

            sinon.stub(MatchModel, 'findById').returns({
                exec: sinon.stub().resolves(matchData)
            });

            await expect(matchService.startTimer(matchId.toString()))
                .to.be.rejectedWith(BadRequestError);
        });


        it('should throw BadRequestError when timer is already started', async () => {
            const matchId = new Types.ObjectId();
            const matchData = {
                timerStartedTimestamp: new Date(),
                winner: undefined,
                elapsedTime: 100,
                save: async () => { return this; }
            };

            sinon.stub(MatchModel, 'findById').returns({
                exec: sinon.stub().resolves(matchData)
            });

            await expect(matchService.startTimer(matchId.toString()))
                .to.be.rejectedWith(BadRequestError, "Timer is already started for the match");
        });

        it('should throw NotFoundError for no match with id', async () => {
            const matchId = new Types.ObjectId();
            sinon.stub(MatchModel, 'findById').returns({
                exec: sinon.stub().resolves(null)
            });

            await expect(matchService.startTimer(matchId.toString()))
                .to.be.rejectedWith(NotFoundError);
        });
    });

    describe('stopTimer', () => {
        it('should stop the timer correctly', async () => {
            const matchId = new Types.ObjectId();
            const matchData = {
                id: matchId,
                isTimerOn: true,
                timerStartedTimestamp: new Date(),
                elapsedTime: 100,
                startTimestamp: new Date(),
                save: async () => { return this; },
                toObject: () => ({ ...matchData, isTimerOn: false, timerStartedTimestamp: null, elapsedTime: 123 })
            };
    
            sinon.stub(MatchModel, 'findById').returns({
                exec: sinon.stub().resolves(matchData)
            });
    
            const result = await matchService.stopTimer(matchId.toString());
            expect(result.isTimerOn).to.be.false;
            expect(result.timerStartedTimestamp).to.be.null;
            expect(result.elapsedTime).to.not.be.equal(0);
        });
    
        it('should throw BadRequestError trying to stop a timer that hasn’t been started', async () => {
            const matchId = new Types.ObjectId();
            const matchData = {
                isTimerOn: false,
                save: async () => { return this; }
            };
    
            sinon.stub(MatchModel, 'findById').returns({
                exec: sinon.stub().resolves(matchData)
            });
    
            await expect(matchService.stopTimer(matchId.toString()))
                .to.be.rejectedWith(BadRequestError, "Timer has not been started for the match");
        });
    
        it('should throw BadRequestError if match is already finished', async () => {
            const matchId = new Types.ObjectId();
            const matchData = {
                isTimerOn: false,
                winner: new Types.ObjectId(), // Indicating match is finished
                save: async () => { return this; }
            };
    
            sinon.stub(MatchModel, 'findById').returns({
                exec: sinon.stub().resolves(matchData)
            });
    
            await expect(matchService.stopTimer(matchId.toString()))
                .to.be.rejectedWith(BadRequestError, "Finished matches cannot be edited");
        });
    });

    describe('addPointToMatchById', () => {
        it('should throw NotFoundError if no match with id', async () => {
            const matchId = new Types.ObjectId();
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(null) });
    
            await expect(matchService.addTimeKeeperToMatch(matchId.toString(), new Types.ObjectId().toString()))
                .to.be.rejectedWith(NotFoundError);
        });

        it('should throw BadRequestError if match is already finished', async () => {
            const matchId = new Types.ObjectId();
            const pointRequest: AddPointRequest = {
                pointType: "men",
                pointColor: "red"
            };
            const matchData = {
                id: matchId,
                winner: new Types.ObjectId()
            };

            sinon.stub(MatchModel, 'findById').returns({
                exec: sinon.stub().resolves(matchData)
            });

            await expect(matchService.addPointToMatchById(matchId.toString(), pointRequest))
                .to.be.rejectedWith(BadRequestError);
        });

        it('should add a point to the match', async () => {
            const matchId = new Types.ObjectId();
            const pointRequest: AddPointRequest = {
                pointType: "men",
                pointColor: "red"
            };
            const player1Id = new Types.ObjectId();
            const player2Id = new Types.ObjectId();
            const points1 = [];
            const points2 = [];
            const matchData = {
                id: matchId,
                type: "group",
                winner: undefined,
                endTimestamp: undefined,
                players: [
                    { id: player1Id, points: points1, color: 'red' },
                    { id: player2Id, points: points2, color: 'white' }
                ],
                save: sinon.stub().resolves(),
                toObject: () => ({
                    players: [
                        { id: player1Id, points: [{ type: 'men', timestamp: new Date() }], color: 'red' },
                        { id: player2Id, points: [], color: 'white' }
                    ]
                })
            };

            sinon.stub(MatchModel, 'findById').returns({
                exec: sinon.stub().resolves(matchData)
            });

            const result = await matchService.addPointToMatchById(matchId.toString(), pointRequest);
            const player1 = result.players[0] as MatchPlayer;
            expect(player1.points).to.not.be.empty;
            expect(player1.points[0].type).to.equal(pointRequest.pointType);
            expect(matchData.winner).to.be.undefined;
            expect(matchData.endTimestamp).to.be.undefined;
        });

        it('should add a point to the match, game ending point', async () => {
            const matchId = new Types.ObjectId();
            const pointRequest: AddPointRequest = {
                pointType: "men",
                pointColor: "red"
            };
            const player1Id = new Types.ObjectId();
            const player2Id = new Types.ObjectId();
            const now = new Date();
            const points1 = [{type: 'tsuki', timestamp: new Date(now.getTime() - 5 * 60 * 1000)}];
            const points2 = [];
            const matchData = {
                id: matchId,
                type: "group",
                players: [
                    { id: player1Id, points: points1, color: 'red' },
                    { id: player2Id, points: points2, color: 'white' }
                ],
                save: sinon.stub().resolves(),
                toObject: () => ({
                    players: [
                        { id: player1Id, points: [points1, { type: 'men', timestamp: new Date() }], color: 'red' },
                        { id: player2Id, points: [], color: 'white' }
                    ],
                    winner: player1Id,
                    endTimestamp: new Date()
                })
            };

            sinon.stub(MatchModel, 'findById').returns({
                exec: sinon.stub().resolves(matchData)
            });

            const result = await matchService.addPointToMatchById(matchId.toString(), pointRequest);
            const player1 = result.players[0] as MatchPlayer;
            expect(player1.points).to.not.be.empty;
            expect(player1.points.length).to.equal(2);
            expect(player1.points[1].type).to.equal(pointRequest.pointType);
            expect(result.winner).to.not.be.undefined;
            expect(result.endTimestamp).to.not.be.undefined;
            expect(result.winner?.toString()).to.equal(player1Id.toString())
        });
    });

    describe('addTimeKeeperToMatch', () => {
        it('should throw NotFoundError if no match with id', async () => {
            const matchId = new Types.ObjectId();
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(null) });
    
            await expect(matchService.addTimeKeeperToMatch(matchId.toString(), new Types.ObjectId().toString()))
                .to.be.rejectedWith(NotFoundError);
        });
    
        it('should throw BadRequestError if match is already finished', async () => {
            const matchId = new Types.ObjectId();
            const finishedMatch = {
                winner: new Types.ObjectId(),
                save: sinon.stub().resolves()
            };
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(finishedMatch) });
    
            await expect(matchService.addTimeKeeperToMatch(matchId.toString(), new Types.ObjectId().toString()))
                .to.be.rejectedWith(BadRequestError, "Finished matches cannot be edited");
        });
    
        it('should add a timekeeper to match', async () => {
            const matchId = new Types.ObjectId();
            const timeKeeperId = new Types.ObjectId();
            const matchData = {
                save: sinon.stub().resolves(),
                toObject: () => ({ timeKeeper: timeKeeperId.toString() })
            };
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
    
            const result = await matchService.addTimeKeeperToMatch(matchId.toString(), timeKeeperId.toString());
            expect(result.timeKeeper).to.equal(timeKeeperId.toString());
        });
    });

    describe('addPointMakerToMatch', () => {
        it('should throw NotFoundError if no match with id', async () => {
            const matchId = new Types.ObjectId();
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(null) });
    
            await expect(matchService.addPointMakerToMatch(matchId.toString(), new Types.ObjectId().toString()))
                .to.be.rejectedWith(NotFoundError);
        });
    
        it('should throw BadRequestError if match is already finished', async () => {
            const matchId = new Types.ObjectId();
            const finishedMatch = {
                winner: new Types.ObjectId(),
                save: sinon.stub().resolves()
            };
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(finishedMatch) });
    
            await expect(matchService.addPointMakerToMatch(matchId.toString(), new Types.ObjectId().toString()))
                .to.be.rejectedWith(BadRequestError, "Finished matches cannot be edited");
        });
    
        it('should add a pointmaker to match', async () => {
            const matchId = new Types.ObjectId();
            const pointMakerId = new Types.ObjectId();
            const matchData = {
                save: sinon.stub().resolves(),
                toObject: () => ({ pointMaker: pointMakerId.toString() })
            };
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
    
            const result = await matchService.addPointMakerToMatch(matchId.toString(), pointMakerId.toString());
            expect(result.pointMaker).to.equal(pointMakerId.toString());
        });
    });

    describe('deleteTimeKeeperFromMatch', () => {
        it('should throw NotFoundError if no match with id', async () => {
            const matchId = new Types.ObjectId();
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(null) });
    
            await expect(matchService.deleteTimeKeeperFromMatch(matchId.toString()))
                .to.be.rejectedWith(NotFoundError);
        });
    
        it('should throw BadRequestError if match is already finished', async () => {
            const matchId = new Types.ObjectId();
            const finishedMatch = {
                winner: new Types.ObjectId(),
                save: sinon.stub().resolves()
            };
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(finishedMatch) });
    
            await expect(matchService.deleteTimeKeeperFromMatch(matchId.toString()))
                .to.be.rejectedWith(BadRequestError, "Finished matches cannot be edited");
        });
    
        it('should remove a timekeeper from match', async () => {
            const matchId = new Types.ObjectId();
            const matchData = {
                timeKeeper: new Types.ObjectId(),
                save: sinon.stub().resolves(),
                toObject: () => ({})
            };
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
    
            const result = await matchService.deleteTimeKeeperFromMatch(matchId.toString());
            expect(result.timeKeeper).to.be.undefined;
        });
    });

    describe('deletePointMakerFromMatch', () => {
        it('should throw NotFoundError if no match with id', async () => {
            const matchId = new Types.ObjectId();
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(null) });
    
            await expect(matchService.deletePointMakerFromMatch(matchId.toString()))
                .to.be.rejectedWith(NotFoundError);
        });
    
        it('should throw BadRequestError if match is already finished', async () => {
            const matchId = new Types.ObjectId();
            const finishedMatch = {
                winner: new Types.ObjectId(),
                save: sinon.stub().resolves()
            };
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(finishedMatch) });
    
            await expect(matchService.deletePointMakerFromMatch(matchId.toString()))
                .to.be.rejectedWith(BadRequestError, "Finished matches cannot be edited");
        });
    
        it('should remove a pointmaker from match', async () => {
            const matchId = new Types.ObjectId();
            const matchData = {
                pointMaker: new Types.ObjectId(),
                save: sinon.stub().resolves(),
                toObject: () => ({})
            };
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
    
            const result = await matchService.deletePointMakerFromMatch(matchId.toString());
            expect(result.pointMaker).to.be.undefined;
        });
    });

    describe('resetMatch', () => {
        it('should throw NotFoundError if no match with id', async () => {
            const matchId = new Types.ObjectId();
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(null) });
    
            await expect(matchService.resetMatch(matchId.toString()))
                .to.be.rejectedWith(NotFoundError);
        });
    
        it('should throw BadRequestError if match is already finished', async () => {
            const matchId = new Types.ObjectId();
            const finishedMatch = {
                winner: new Types.ObjectId(),
                save: sinon.stub().resolves()
            };
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(finishedMatch) });
    
            await expect(matchService.resetMatch(matchId.toString()))
                .to.be.rejectedWith(BadRequestError, "Finished matches cannot be edited");
        });
    
        it('should reset match details correctly', async () => {
            const matchId = new Types.ObjectId();
            const matchData = {
                players: [{ points: [{ type: 'men', timestamp: new Date() }] }],
                elapsedTime: 100,
                startTimestamp: new Date(),
                timerStartedTimestamp: new Date(),
                isTimerOn: true,
                save: sinon.stub().resolves(),
                toObject: () => ({
                    elapsedTime: 0,
                    startTimestamp: undefined,
                    timerStartedTimestamp: null,
                    isTimerOn: false,
                    players: [{ points: [] }]
                })
            };
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
    
            const result = await matchService.resetMatch(matchId.toString());
            expect(result.elapsedTime).to.equal(0);
            expect(result.startTimestamp).to.be.undefined;
            expect(result.timerStartedTimestamp).to.be.null;
            expect(result.isTimerOn).to.be.false;
            const player1 = result.players[0] as MatchPlayer
            expect(player1.points).to.be.empty;
        });
    });

    describe('resetRoles', () => {
        it('should throw NotFoundError if no match with id', async () => {
            const matchId = new Types.ObjectId();
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(null) });
    
            await expect(matchService.resetRoles(matchId.toString()))
                .to.be.rejectedWith(NotFoundError);
        });
    
        it('should throw BadRequestError if match is already finished', async () => {
            const matchId = new Types.ObjectId();
            const finishedMatch = {
                winner: new Types.ObjectId(),
                save: sinon.stub().resolves()
            };
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(finishedMatch) });
    
            await expect(matchService.resetRoles(matchId.toString()))
                .to.be.rejectedWith(BadRequestError, "Finished matches cannot be edited");
        });
    
        it('should clear roles correctly', async () => {
            const matchId = new Types.ObjectId();
            const matchData = {
                timeKeeper: new Types.ObjectId(),
                pointMaker: new Types.ObjectId(),
                isTimerOn: false, // Match is in progress
                timerStartedTimestamp: null,
                startTimestamp: undefined,
                save: sinon.stub().resolves(),
                toObject: () => ({
                    timeKeeper: undefined,
                    pointMaker: undefined
                })
            };
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
    
            const result = await matchService.resetRoles(matchId.toString());
            expect(result.timeKeeper).to.be.undefined;
            expect(result.pointMaker).to.be.undefined;
        });
    
        it('should throw BadRequestError for a match that is currently in progress', async () => {
            const matchId = new Types.ObjectId();
            const matchData = {
                timeKeeper: new Types.ObjectId(),
                pointMaker: new Types.ObjectId(),
                isTimerOn: true, // Match is in progress
                timerStartedTimestamp: new Date(),
                startTimestamp: new Date(),
                save: sinon.stub().resolves(),
                toObject: sinon.stub()
            };
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
    
            await expect(matchService.resetRoles(matchId.toString()))
                .to.be.rejectedWith(BadRequestError, "Cannot reset roles for a match that has started");
        });
    });
    
    describe('checkForTie', () => {
        it('should throw NotFoundError for no match with id', async () => {
            const matchId = new Types.ObjectId();
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(null) });
        
            await expect(matchService.checkForTie(matchId.toString()))
                .to.be.rejectedWith(NotFoundError);
        });

        describe('Group Match Type', () => {        
            it('should result in no winner and set endtimestamp when scores are the same', async () => {
                const matchId = new Types.ObjectId();
                const pointsForPlayer1 = [
                    { type: "men", timestamp: new Date() }, 
                ];
                const pointsForPlayer2 = [
                    { type: "do", timestamp: new Date() },
                ];
                const matchData = {
                    id: matchId,
                    type: 'group',
                    players: [
                        { id: new Types.ObjectId(), points: pointsForPlayer1, color: "red" },
                        { id: new Types.ObjectId(), points: pointsForPlayer2, color: "white" }
                    ],
                    save: sinon.stub().resolves(),
                    toObject: () => ({
                        winner: undefined,
                        endTimestamp: new Date(),
                        isOvertime: false
                    })
                };
                sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
                
                const result = await matchService.checkForTie(matchId.toString());
                expect(result.winner).to.be.undefined;
                expect(result.endTimestamp).to.not.be.undefined;
                expect(result.isOvertime).to.be.false;
            });
        
            it('should result in a winner and set endtimestamp when scores are different', async () => {
                const matchId = new Types.ObjectId();
                const pointsForPlayer1 = [
                    { type: "men", timestamp: new Date() }, 
                    { type: "kote", timestamp: new Date() }
                ];
                const pointsForPlayer2 = [
                    { type: "do", timestamp: new Date() },
                ];
                const matchData = {
                    id: matchId,
                    type: 'group',
                    players: [
                        { id: new Types.ObjectId(), points: pointsForPlayer1, color: "red" },
                        { id: new Types.ObjectId(), points: pointsForPlayer2, color: "white" }
                    ],
                    save: sinon.stub().resolves(),
                    toObject: () => ({
                        winner: new Types.ObjectId(),
                        endTimestamp: new Date(),
                        isOvertime: false
                    })                 };
                sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
            
                const result = await matchService.checkForTie(matchId.toString());
                expect(result.winner).to.not.be.undefined;
                expect(result.endTimestamp).to.not.be.undefined;
                expect(result.isOvertime).to.be.false;
            });
        });

        describe('Playoff Match Type', () => {
            it('should result in no winner and set overtime when scores are the same', async () => {
                const matchId = new Types.ObjectId();
                const pointsForPlayer1 = [
                    { type: "men", timestamp: new Date() }, 
                ];
                const pointsForPlayer2 = [
                    { type: "do", timestamp: new Date() },
                ];
                const matchData = {
                    id: matchId,
                    type: 'playoff',
                    players: [
                        { id: new Types.ObjectId(), points: pointsForPlayer1, color: "red" },
                        { id: new Types.ObjectId(), points: pointsForPlayer2, color: "white" }
                    ],
                    save: sinon.stub().resolves(),
                    toObject: () => ({
                        winner: undefined,
                        endTimestamp: undefined,
                        isOvertime: true
                    })                 };
                sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
                    
                const result = await matchService.checkForTie(matchId.toString());
                expect(result.winner).to.be.undefined;
                expect(result.endTimestamp).to.be.undefined;
                expect(result.isOvertime).to.be.true;
            });
        
            it('should result in a winner and no overtime when scores are different', async () => {
                const matchId = new Types.ObjectId();
                const tournamentId = new Types.ObjectId();
                const winnerId = new Types.ObjectId();
        
                const tournamentData = {
                    id: tournamentId,
                    type: "PreliminaryPlayoff",
                    matchSchedule: [{
                        id: matchId,
                        tournamentRound: 1,
                        winner: winnerId,
                        players: [
                            { id: winnerId, points: [], color: "white" },
                            { id: new Types.ObjectId(), points: [], color: "red" }
                        ],
                        type: "playoff"
                    }],
                    matchTime: 300000,
                    numberOfCourts: 1,
                    save: sinon.stub().resolves(),
                    toObject: () => ({})
                };

                sinon.stub(TournamentModel, 'findOne').withArgs({ matchSchedule: matchId }).returns({
                    populate: sinon.stub().returns({
                        exec: sinon.stub().resolves(tournamentData)
                    })
                });

                sinon.stub(TournamentModel, 'findById').withArgs(tournamentId).returns({
                    exec: sinon.stub().resolves(tournamentData)
                });
                
                const pointsForPlayer1 = [{ type: "men", timestamp: new Date() }];
                const pointsForPlayer2 = [];  // Empty points to ensure a different score
                const matchData = {
                    id: matchId,
                    type: 'playoff',
                    players: [
                        { id: new Types.ObjectId(), points: pointsForPlayer1, color: "red" },
                        { id: new Types.ObjectId(), points: pointsForPlayer2, color: "white" }
                    ],
                    tournamentId: tournamentId,
                    tournamentRound: 1,
                    save: sinon.stub().resolves(),
                    toObject: sinon.stub().returns({
                        winner: new Types.ObjectId(),
                        endTimestamp: new Date(),
                        isOvertime: false
                    })
                };
                
                sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
        
                const result = await matchService.checkForTie(matchId.toString());
                expect(result.winner).to.not.be.undefined;
                expect(result.endTimestamp).to.not.be.undefined;
                expect(result.isOvertime).to.be.false;
            });
        }); 
    });

    describe('deleteRecentPoint', () => {
        it('should throw NotFoundError if no match with id', async () => {
            const matchId = new Types.ObjectId();
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(null) });
            await expect(matchService.deleteRecentPoint(matchId.toString()))
                .to.be.rejectedWith(NotFoundError);
        });
    
        it('should delete the most recent point correctly and delete winner', async () => {
            const matchId = new Types.ObjectId();
            const playerId = new Types.ObjectId();
            const now = new Date();
            const points = [{ type: 'men', timestamp: new Date(now.getTime() - 5 * 60 * 1000) }, { type: 'do', timestamp: new Date() }];
            const matchData = {
                players: [{ id: playerId, points, color: 'red' }],
                winner: playerId,
                type: 'group',
                endTimestamp: new Date(),
                save: sinon.stub().resolves(),
                toObject: () => ({ players: [{ id: playerId, points: [points[0]], color: 'red' }], winner: undefined, endTimestamp: undefined })
            };
    
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
    
            const result = await matchService.deleteRecentPoint(matchId.toString());
            const player1 = result.players[0] as MatchPlayer;
            expect(player1.points.length).to.equal(1);
            expect(player1.points[0].type).to.equal('men');
            expect(result.winner).to.be.undefined;
            expect(result.endTimestamp).to.be.undefined;
        });

        it('should delete the most recent point correctly', async () => {
            const matchId = new Types.ObjectId();
            const playerId = new Types.ObjectId();
            const points = [{ type: 'men', timestamp: new Date() }];
            const matchData = {
                players: [{ id: playerId, points, color: 'red' }],
                type: 'group',
                save: sinon.stub().resolves(),
                toObject: () => ({ players: [{ id: playerId, points: [], color: 'red' }], winner: undefined, endTimestamp: undefined })
            };
    
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
    
            const result = await matchService.deleteRecentPoint(matchId.toString());
            const player1 = result.players[0] as MatchPlayer;
            expect(player1.points.length).to.equal(0);
            expect(result.winner).to.be.undefined;
            expect(result.endTimestamp).to.be.undefined;
        });
    
        it('should handle cases where there are no points to delete', async () => {
            const matchId = new Types.ObjectId();
            const playerId = new Types.ObjectId();
            const matchData = {
                players: [{ id: playerId, points: [], color: 'red' }],
                save: sinon.stub().resolves(),
                toObject: sinon.stub()
            };
    
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
    
            await expect(matchService.deleteRecentPoint(matchId.toString()))
                .to.be.rejectedWith(BadRequestError, "No points to delete.");
        });
    
        it('should throw BadRequestError if no players are found in the match', async () => {
            const matchId = new Types.ObjectId();
            const matchData = {
                players: [],
                save: sinon.stub().resolves(),
                toObject: sinon.stub()
            };
    
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
    
            await expect(matchService.deleteRecentPoint(matchId.toString()))
                .to.be.rejectedWith(BadRequestError, "No players in match.");
        });
    });
    
    describe('modifyRecentPoint', () => {
        it('should throw NotFoundError if no match with id', async () => {
            const matchId = new Types.ObjectId();
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(null) });
            await expect(matchService.modifyRecentPoint(matchId.toString(), 'men'))
                .to.be.rejectedWith(NotFoundError);
        });
    
        it('should modify the most recent point and check for match outcome', async () => {
            const matchId = new Types.ObjectId();
            const player1Id = new Types.ObjectId();
            const player2Id = new Types.ObjectId();
            const now = new Date();
            const points1 = [{ type: 'tsuki', timestamp: new Date(now.getTime() - 5 * 60 * 1000) }, { type: 'hansoku', timestamp: now.getTime() - 3 * 60 * 1000 }];
            const points2 = [];
            const newType = 'men';
            const matchData = {
                players: [
                    { id: player1Id, points: points1, color: 'red' },
                    { id: player2Id, points: points2, color: 'white' }
                ],
                save: sinon.stub().resolves(),
                toObject: () => ({
                    players: [
                        { id: player1Id, points: [{ ...points1[0], type: points1[0].type }, { ...points1[1], type: newType }], color: 'red' },
                        { id: player2Id, points: [], color: 'white' }
                    ],
                    winner: player1Id,
                    endTimestamp: new Date()
                })
            };
    
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
    
            const result = await matchService.modifyRecentPoint(matchId.toString(), newType);
            const player1 = result.players[0] as MatchPlayer;
            expect(player1.points.length).to.equal(2);
            expect(player1.points[1].type).to.equal(newType);
            expect(result.winner?.toString()).to.equal(player1Id.toString());
            expect(result.endTimestamp).to.not.be.undefined;
        });

        it('should modify the most recent point, no need to check match outcome', async () => {
            const matchId = new Types.ObjectId();
            const player1Id = new Types.ObjectId();
            const player2Id = new Types.ObjectId();
            const now = new Date();
            const points1 = [{ type: 'tsuki', timestamp: new Date(now.getTime() - 5 * 60 * 1000) }];
            const points2 = [];
            const newType = 'men';
            const matchData = {
                players: [
                    { id: player1Id, points: points1, color: 'red' },
                    { id: player2Id, points: points2, color: 'white' }
                ],
                save: sinon.stub().resolves(),
                toObject: () => ({
                    players: [
                        { id: player1Id, points: [{ ...points1[0], type: newType }], color: 'red' },
                        { id: player2Id, points: [], color: 'white' }
                    ]
                })
            };
    
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
    
            const result = await matchService.modifyRecentPoint(matchId.toString(), newType);
            const player1 = result.players[0] as MatchPlayer;
            expect(player1.points.length).to.equal(1);
            expect(player1.points[0].type).to.equal(newType);
            expect(result.winner).to.be.undefined
            expect(result.endTimestamp).to.be.undefined;
        });
    
        it('should throw BadRequestError if there are no points to modify', async () => {
            const matchId = new Types.ObjectId();
            const playerId = new Types.ObjectId();
            const matchData = {
                players: [{ id: playerId, points: [], color: 'red' }],
                save: sinon.stub().resolves(),
                toObject: sinon.stub()
            };
    
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
    
            await expect(matchService.modifyRecentPoint(matchId.toString(), 'men'))
                .to.be.rejectedWith(BadRequestError, "No points found to modify.");
        });
    
        it('should throw BadRequestError if no players are found in the match', async () => {
            const matchId = new Types.ObjectId();
            const matchData = {
                players: [],
                save: sinon.stub().resolves(),
                toObject: sinon.stub()
            };
    
            sinon.stub(MatchModel, 'findById').returns({ exec: sinon.stub().resolves(matchData) });
    
            await expect(matchService.modifyRecentPoint(matchId.toString(), 'men'))
                .to.be.rejectedWith(BadRequestError, "No players in match.");
        });
    });
    

});
