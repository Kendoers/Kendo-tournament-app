export interface User {
  id: string;
  email: string;
  password: string;
  userName?: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  nationality: string;
  inNationalTeam: boolean;
  suomisportId: string;
  clubName: string;
  danRank: string;
  underage: boolean;
  guardiansEmail?: string;
}

export type PlayerColor = "red" | "white";

export type PointType = "men" | "kote" | "do" | "tsuki" | "hansoku";

export type MatchType = "group" | "playoff" | "pre playoff";

export type MatchTime = 180000 | 240000 | 300000;

export interface MatchPoint {
  type: PointType;
  timestamp: Date;
}

export interface MatchPlayer {
  id: string;
  points: MatchPoint[];
  color: PlayerColor;
}
export interface Match {
  id: string;
  startTimestamp?: Date;
  timerStartedTimestamp: Date | null;
  elapsedTime: number;
  endTimestamp?: Date;
  scheduledTime: string;
  type: MatchType;
  players: MatchPlayer[];
  winner?: string;
  comment?: string;
  tournamentId: string;
  officials: string[];
  tournamentRound: number;
  timeKeeper?: string;
  pointMaker?: string;
  isTimerOn: boolean;
  isOvertime: boolean;
  player1Score: number;
  player2Score: number;
  matchTime: MatchTime;
  courtNumber: number;
}

export interface Tournament {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
  type: TournamentType;
  maxPlayers: number;
  groups?: string[][];
  creator: User;
  organizerEmail?: string;
  organizerPhone?: string;
  players: User[];
  matchSchedule: Match[];
  playersToPlayoffsPerGroup?: number;
  matchTime: MatchTime;
  category: Category;
  linkToPay?: string;
  linkToSite?: string;
  numberOfCourts: number;
  swissRounds?: number;
  passwordEnabled: boolean;
  password?: string;

  numberOfTeams?: number;
  playersPerTeam?: number;
  teams?: Array<{
    id: string;
    name: string;
    players: User[];
  }>;
}

export type TournamentType =
  | "Round Robin"
  | "Team Round Robin"
  | "Playoff"
  | "Preliminary Playoff"
  | "Swiss";

export type Category = "championship" | "league" | "hobby";
