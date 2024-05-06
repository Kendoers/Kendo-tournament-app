import type {
  Tournament,
  TournamentType,
  Category,
  PointType,
  Match
} from "types/models";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

export const filterByTime = (
  tournaments: Tournament[],
  startingFrom: Dayjs | null,
  endingAt: Dayjs | null
): Tournament[] => {
  return tournaments.filter((tournament) => {
    const starts = dayjs(tournament.startDate).startOf("day");
    const ends = dayjs(tournament.endDate).startOf("day");

    if (startingFrom === null && endingAt === null) {
      return true; // Include all tournaments when both criteria are null
    }
    // Filter tournaments that are happening / have happened within given dates
    if (startingFrom !== null && endingAt !== null) {
      return (
        (starts.isBefore(endingAt) || starts.isSame(endingAt)) &&
        (ends.isAfter(startingFrom) || ends.isSame(startingFrom))
      );
    }
    // If only one date is given, find tournaments that happen on or after/on or before the given date
    if (startingFrom !== null && endingAt === null) {
      return (
        (starts.isBefore(startingFrom) ||
          starts.isAfter(startingFrom) ||
          starts.isSame(startingFrom)) &&
        (ends.isSame(startingFrom) || ends.isAfter(startingFrom))
      );
    }

    if (startingFrom === null && endingAt !== null) {
      return (
        (starts.isBefore(endingAt) || starts.isSame(endingAt)) &&
        (ends.isBefore(endingAt) ||
          ends.isAfter(endingAt) ||
          ends.isSame(endingAt))
      );
    }

    return false; // Exclude the tournament if none of the conditions match
  });
};

// Filter tournaments the user participates/has participated in
export const filterByParticipation = (
  tournaments: Tournament[],
  userId: string
): Tournament[] => {
  const filtered = tournaments.filter((tournament) =>
    tournament.players.some((player) => player.id === userId)
  );
  return filtered;
};

export const filterByTournamentType = (
  tournaments: Tournament[],
  typesOfTournament: TournamentType[]
): Tournament[] => {
  const filtered = tournaments.filter((tournament) =>
    typesOfTournament.includes(tournament.type)
  );
  return filtered;
};

export const filterByCategory = (
  tournaments: Tournament[],
  categoriesOfTournament: Category[]
): Tournament[] => {
  const filtered = tournaments.filter((tournament) =>
    categoriesOfTournament.includes(tournament.category)
  );
  return filtered;
};

export const filterByLocation = (
  tournaments: Tournament[],
  locationOfTournament: string
): Tournament[] => {
  const filtered = tournaments.filter(
    (tournament) => tournament.location === locationOfTournament
  );
  return filtered;
};

// Filter a certain user's matches based on point type(s)
export const filterByPointType = (
  tournaments: Tournament[],
  pointTypes: PointType[],
  userId: string
): Tournament[] => {
  const filtered = tournaments
    .map((tournament) => {
      const filteredMatchSchedule = tournament.matchSchedule
        .map((match) => {
          const filteredPlayers = match.players.filter(
            (player) =>
              player.id === userId &&
              player.points.some((point) => pointTypes.includes(point.type))
          );
          return filteredPlayers.length > 0 ? match : null;
        })
        .filter((match) => match !== null) as Match[];

      return {
        ...tournament,
        matchSchedule: filteredMatchSchedule
      };
    })
    .filter((tournament) => tournament.matchSchedule.length > 0);

  return filtered;
};
