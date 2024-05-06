import React from "react";
import PlayoffTournamentView from "./OngoingTournament/Playoff/PlayoffTournamentView";
import RoundRobinTournamentView from "./OngoingTournament/RoundRobin/RoundRobinTournamentView";
import PreliminaryPlayoffView from "./OngoingTournament/PremPlayoff/PreliminaryPlayoffView";
import UpcomingTournamentView from "./UpcomingTournamentView";
import ErrorModal from "components/common/ErrorModal";
import { type Tournament } from "types/models";
import { useTournament } from "context/TournamentContext";
import { useNavigate } from "react-router-dom";
import routePaths from "routes/route-paths";
import { useTranslation } from "react-i18next";
import SwissTournamentView from "./OngoingTournament/Swiss/SwissTournamentView";

const getTournamentComponent = (
  tournament: Tournament
): React.ReactElement | undefined => {
  switch (tournament.type) {
    case "Round Robin":
      return <RoundRobinTournamentView />;
    case "Playoff":
      return <PlayoffTournamentView />;
    case "Preliminary Playoff":
      return <PreliminaryPlayoffView />;
    case "Swiss":
      return <SwissTournamentView />;
    default:
      return undefined;
  }
};

const TournamentDetails: React.FC = (): React.ReactElement => {
  const tournament = useTournament();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tournamentComponent = getTournamentComponent(tournament);

  if (tournamentComponent === undefined) {
    return (
      <ErrorModal
        open={true}
        onClose={() => {
          navigate(routePaths.homeRoute);
        }}
        errorMessage={t("messages.invalid_tournament_error", {
          organizerEmail: tournament.organizerEmail
        })}
      />
    );
  }

  /* If the tournament has not yet begun, then it is an upcoming tournament */
  return new Date(tournament.startDate).getTime() > Date.now() ? (
    <UpcomingTournamentView />
  ) : (
    tournamentComponent
  );
};

export default TournamentDetails;
