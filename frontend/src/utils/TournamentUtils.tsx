import {
  type Match,
  type MatchPlayer,
  type User,
  type Tournament
} from "types/models";

// [playerId, victoryPoints, ippons]
type rankingStruct = [string, number, number];

export const allMatchesPlayed = (tournament: Tournament): boolean => {
  const matches = tournament.matchSchedule;

  let played = 0;

  for (const match of tournament.matchSchedule) {
    if (match.endTimestamp !== undefined || match.winner !== undefined) {
      played++;
    }
  }

  if (played === matches.length && matches.length > 0) {
    return true;
  }
  return false;
};

const findLastMatch = (tournament: Tournament): Match | null => {
  let lastRound = 0;
  let lastMatch = null;
  for (const match of tournament.matchSchedule) {
    if (match.tournamentRound > lastRound) {
      lastRound = match.tournamentRound;
      lastMatch = match;
    }
  }
  return lastMatch;
};

const calculateScores = (tournament: Tournament): rankingStruct[] => {
  const rankingMap = new Map<string, number[]>();
  for (const match of tournament.matchSchedule) {
    for (let j = 0; j < match.players.length; j++) {
      const matchPlayer: MatchPlayer = match.players[j];
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
          match.winner.toString() === matchPlayerId &&
          match.players.length > 1
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
          match.winner.toString() === matchPlayerId &&
          match.players.length > 1
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
  const playerScores: rankingStruct[] = [];
  for (const player of rankingMap) {
    // [playerId, victoryPoints, ippons]
    playerScores.push([player[0], player[1][0], player[1][1]]);
  }
  return playerScores;
};

const findUserInTournamentById = (
  id: string | undefined,
  tournament: Tournament
): User | undefined => {
  for (const user of tournament.players) {
    if (user.id === id) {
      return user;
    }
  }
  return undefined;
};

export const findTournamentWinner = (
  tournament: Tournament
): string | undefined => {
  if (
    tournament.type === "Playoff" ||
    tournament.type === "Preliminary Playoff"
  ) {
    const lastMatch = findLastMatch(tournament);
    if (lastMatch !== null) {
      const winner = findUserInTournamentById(lastMatch.winner, tournament);
      if (winner !== undefined) {
        return winner.firstName;
      }
    }
  } else {
    const playerScores = calculateScores(tournament);
    // sort players according to victory points and ippons
    playerScores.sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return b[2] - a[2];
    });

    const winner = findUserInTournamentById(playerScores[0][0], tournament);
    if (winner !== undefined) {
      return winner.firstName;
    }
  }

  return undefined;
};
