import React, { useEffect, useState, type ReactElement, useRef } from "react";
import { type Tournament } from "types/models";
import useToast from "hooks/useToast";
import api from "api/axios";
import { Outlet, useLocation, useOutletContext } from "react-router-dom";
import Loader from "components/common/Loader";
import { type LocationState } from "types/global";
import { useTranslation } from "react-i18next";
import { allMatchesPlayed } from "utils/TournamentUtils";

interface ITournamentsContext {
  isLoading: boolean;
  isError: boolean;
  past: Tournament[];
  ongoing: Tournament[];
  upcoming: Tournament[];
  doRefresh: () => void;
}

const initialContextValue: ITournamentsContext = {
  isLoading: true,
  isError: false,
  past: [],
  ongoing: [],
  upcoming: [],
  doRefresh: () => {}
};

interface SortedTournaments {
  readonly past: Tournament[];
  readonly ongoing: Tournament[];
  readonly upcoming: Tournament[];
}

const getSortedTournaments = async (): Promise<SortedTournaments> => {
  const tournaments = await api.tournaments.getAll();
  const currentDate = new Date();

  // Sort tournaments by start date in descending order
  const sortedTournaments = tournaments.sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);

    return dateB.getTime() - dateA.getTime();
  });

  // Define ongoing and past criteria
  const ongoing = sortedTournaments.filter((tournament) => {
    const tournamentHasStarted =
      new Date(tournament.startDate) <= currentDate &&
      new Date(tournament.endDate) > currentDate;

    const matchesNotPlayed = !allMatchesPlayed(tournament);
    const hasFewerThanTwoPlayers = tournament.players.length < 2;

    // Ongoing if the tournament has started but not ended and has at least 2 players
    return (
      tournamentHasStarted && matchesNotPlayed && !hasFewerThanTwoPlayers // Consider ongoing if there are matches left or more than 1 player
    );
  });

  const upcoming = sortedTournaments.filter(
    (tournament) => new Date(tournament.startDate) > currentDate
  );

  const past = sortedTournaments.filter((tournament) => {
    const tournamentHasEnded = new Date(tournament.endDate) <= currentDate;
    const hasFewerThanTwoPlayers = tournament.players.length < 2;
    const tournamentHasStarted = new Date(tournament.startDate) <= currentDate;

    // Consider past if all matches are played or the tournament has started with less than 2 players
    return (
      tournamentHasEnded ||
      allMatchesPlayed(tournament) ||
      (tournamentHasStarted && hasFewerThanTwoPlayers)
    );
  });

  return { past, ongoing, upcoming } as const;
};

export const TournamentsProvider = (): ReactElement => {
  const showToast = useToast();
  const { t } = useTranslation();
  const [value, setValue] = useState<ITournamentsContext>(initialContextValue);
  const location = useLocation() as LocationState;
  const [shouldRefresh, setShouldRefresh] = useState(
    location.state?.refresh ?? false
  );

  const isInitialRender = useRef(true);

  const doRefresh = (): void => {
    setShouldRefresh(true); // Use state setter to trigger re-fetching
  };

  useEffect(() => {
    const getAllTournaments = async (): Promise<void> => {
      try {
        const { past, ongoing, upcoming } = await getSortedTournaments();
        setValue((prevValue) => ({
          ...prevValue,
          isLoading: false,
          past,
          ongoing,
          upcoming,
          doRefresh // This function can be passed to children to trigger refresh
        }));
        setShouldRefresh(false); // Reset shouldRefresh after fetching
      } catch (error) {
        showToast(t("messages.could_not_fetch_tournaments"), "error");
        setValue((prevValue) => ({
          ...prevValue,
          isLoading: false,
          isError: true,
          doRefresh
        }));
        setShouldRefresh(false);
      }
    };

    // Fetch tournaments on initial render or when shouldRefresh is true
    if (isInitialRender.current || shouldRefresh) {
      void getAllTournaments();
      isInitialRender.current = false;
    }

    // Clean up location state without mutating it directly
    if (location.state?.refresh) {
      setShouldRefresh(true);
    }
  }, [shouldRefresh, location.state]);

  if (value.isLoading) {
    return <Loader />;
  }

  return <Outlet context={value} />;
};

export const useTournaments = (): ITournamentsContext =>
  useOutletContext<ITournamentsContext>();
