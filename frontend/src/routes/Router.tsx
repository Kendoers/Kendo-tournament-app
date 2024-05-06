import React from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route
} from "react-router-dom";

import Layout from "layouts/Main/Layout";
import LoginForm from "components/modules/Login/Login";
import Profile from "components/modules/Profile/Profile";
import RegisterForm from "components/modules/Registeration/Registration";
import TermsAndConditions from "components/modules/Legal/TermsAndConditions";
import { AuthenticationGuard } from "components/common/AuthenticationGuard";
import CreateTournamentForm from "components/modules/Tournaments/CreateTournament";
import Signup from "components/modules/Tournaments/Signup/Signup";
import TournamentDetails from "components/modules/Tournaments/TournamentDetails";
import TournamentList from "components/modules/Tournaments/TournamentListing/TournamentsList";
import PastTournamentMatches from "components/modules/Tournaments/PastTournamentMatches";
import { TournamentsProvider } from "context/TournamentsContext";
import { TournamentProvider } from "context/TournamentContext";
import RootRoute from "./RootRoute";
import routePaths from "./route-paths";
import { SocketProvider } from "context/SocketContext";
import GameInterface from "components/modules/GameInterface/GameInterface";
import PasswordControl from "components/modules/PasswordControl/PasswordControl";
import PrivacyPolicy from "components/modules/Legal/PrivacyPolicy";
import CancelSignup from "components/modules/Tournaments/Signup/CancelSignup";
import EditTournametInfo from "components/modules/Tournaments/EditTournament/EditInfo";
import OwnTournament from "components/modules/Tournaments/OwnTournament";
import UpdateMatchPairsView from "components/modules/Tournaments/UpdatePairings/UpdateMatchPairsView";
import UpdateGroupsView from "components/modules/Tournaments/UpdatePairings/UpdateGroupsView";
import Help from "components/modules/Help/Help";

const routes = createRoutesFromElements(
  <Route element={<RootRoute />}>
    <Route element={<Layout />}>
      <Route path={routePaths.tournaments} element={<TournamentsProvider />}>
        <Route index element={<TournamentList />} />

        <Route
          path="past-tournament/:tournamentId"
          element={<PastTournamentMatches />}
        />

        <Route element={<AuthenticationGuard />}>
          <Route path="new-tournament" element={<CreateTournamentForm />} />
        </Route>

        <Route
          path="edit-tournament-info/:tournamentId"
          element={<EditTournametInfo />}
        />
        <Route
          path="own-tournament/:tournamentId"
          element={<OwnTournament />}
        />

        <Route
          path=":id"
          element={
            <SocketProvider>
              <TournamentProvider />
            </SocketProvider>
          }
        >
          <Route index element={<TournamentDetails />} />
          <Route element={<AuthenticationGuard />}>
            <Route path="sign-up" element={<Signup />} />
            <Route
              path="match/:matchId"
              element={<SocketProvider>{<GameInterface />}</SocketProvider>}
            ></Route>
            <Route path="modify-pairs" element={<UpdateMatchPairsView />} />
            <Route path="modify-groups" element={<UpdateGroupsView />} />
            <Route path="cancel-sign-up" element={<CancelSignup />} />
          </Route>
          <Route
            path="match/:matchId"
            element={<SocketProvider>{<GameInterface />}</SocketProvider>}
          />
        </Route>
      </Route>

      <Route element={<AuthenticationGuard guardType="unauthenticated" />}>
        <Route path={routePaths.login} element={<LoginForm />} />
      </Route>

      <Route element={<AuthenticationGuard guardType="unauthenticated" />}>
        <Route path={routePaths.register} element={<RegisterForm />} />
      </Route>

      <Route
        path={routePaths.termsAndConditions}
        element={<TermsAndConditions />}
      />

      <Route path={routePaths.privacy} element={<PrivacyPolicy />} />

      <Route path={routePaths.help} element={<Help />} />

      <Route element={<AuthenticationGuard />}>
        <Route path={routePaths.profile} element={<Profile />} />
      </Route>

      <Route path={routePaths.passwordReset} element={<PasswordControl />} />

      {/* Redirect from other routes */}
      <Route
        path="*"
        element={<Navigate to={routePaths.homeRoute} replace />}
      />
    </Route>
  </Route>
);

export const router = createBrowserRouter(routes);
