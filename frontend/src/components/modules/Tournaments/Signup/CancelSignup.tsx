import React, { type ReactElement } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";

import useToast from "hooks/useToast";
import api from "api/axios";
import { useAuth } from "context/AuthContext";
import { useTournament } from "context/TournamentContext";
import { useTranslation } from "react-i18next";

import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import routePaths from "routes/route-paths";
import { Link } from "@mui/material";

const CancelSignup: React.FC = (): ReactElement => {
  const { userId } = useAuth();
  const showToast = useToast();
  const tournament = useTournament();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (): Promise<void> => {
    try {
      if (userId !== undefined) {
        await api.tournaments.cancelSignup(tournament.id, userId);
        showToast(
          t("messages.cancel_success", { name: tournament.name }),
          "success"
        );
        navigate(routePaths.homeRoute, {
          replace: true,
          state: { refresh: true }
        });
      }
    } catch (error) {
      showToast(error, "error");
    }
  };

  return (
    <Container
      component="main"
      sx={{ display: "flex", flexDirection: "column", gap: "24px" }}
    >
      <Box className="sign-up-header">
        <Typography
          variant="h5"
          className="header"
          fontWeight="bold"
          marginBottom="12px"
        >
          {t("signup_labels.cancel")} {tournament.name}
        </Typography>

        <Typography variant="body1" className="dates">
          {new Date(tournament.startDate).toLocaleString("fi", {
            // dont show seconds
            dateStyle: "short",
            timeStyle: "short"
          })}{" "}
          -{" "}
          {new Date(tournament.endDate).toLocaleString("fi", {
            dateStyle: "short",
            timeStyle: "short"
          })}
        </Typography>
      </Box>

      <Box className="sign-up-body">
        <Typography variant="body1" className="subtext">
          {t("signup_labels.want_more_info")}{" "}
          <Link
            component={RouterLink}
            to={`${routePaths.homeRoute}/${tournament.id}`}
          >
            {t("signup_labels.click_here")}
          </Link>
        </Typography>
      </Box>

      <Box display="flex">
        <Button
          variant="contained"
          color="primary"
          id="btnCancelSignup"
          onClick={async () => {
            await handleSubmit();
          }}
          disabled={userId === undefined}
        >
          {t("buttons.cancel_sign_up")}
        </Button>
      </Box>
    </Container>
  );
};

export default CancelSignup;
