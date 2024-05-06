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

  const ongoing = sortedTournaments.filter(
    (tournament) =>
      (new Date(tournament.startDate) <= currentDate &&
        new Date(tournament.endDate) > currentDate) ||
      (new Date(tournament.startDate) <= currentDate &&
        !allMatchesPlayed(tournament))
  );

  const upcoming = sortedTournaments.filter(
    (tournament) => new Date(tournament.startDate) > currentDate
  );

  const past = sortedTournaments.filter(
    (tournament) =>
      new Date(tournament.endDate) <= currentDate &&
      allMatchesPlayed(tournament)
  );

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

  useEffect(() => {
    const doRefresh = (): void => {
      setShouldRefresh(true);
    };
    const getAllTournaments = async (): Promise<void> => {
      try {
        const { past, ongoing, upcoming } = await getSortedTournaments();
        setValue((prevValue) => ({
          ...prevValue,
          isLoading: false,
          past,
          ongoing,
          upcoming,
          doRefresh
        }));
        setShouldRefresh(false);
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
  }, [shouldRefresh]);

  if (value.isLoading) {
    return <Loader />;
  }

  return <Outlet context={value} />;
};

export const useTournaments = (): ITournamentsContext =>
  useOutletContext<ITournamentsContext>();
