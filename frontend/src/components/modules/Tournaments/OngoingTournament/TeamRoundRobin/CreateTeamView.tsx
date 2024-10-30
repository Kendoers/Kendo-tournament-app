import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, FormProvider, TextFieldElement } from "react-hook-form-mui";
import { Box, Button, Container, Typography } from "@mui/material";
import useToast from "hooks/useToast";
import api from "api/axios";
import { useTranslation } from "react-i18next";
import Loader from "components/common/Loader";

interface CreateTeamFormData {
  teamName: string;
}

const defaultValues: CreateTeamFormData = {
  teamName: ""
};

const CreateTeam: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const showToast = useToast();

  const [isLoading, setIsLoading] = useState(false);

  const formContext = useForm<CreateTeamFormData>({
    defaultValues,
    mode: "onBlur"
  });

  const onSubmit = async (data: CreateTeamFormData): Promise<void> => {
    setIsLoading(true);
    try {
      if (tournamentId !== null && tournamentId !== undefined) {
        await api.tournaments.addTeamToTournament(tournamentId, data.teamName);
        showToast(t("messages.team_created_success"), "success");
        navigate(`/tournament/${tournamentId}`);
      } else {
        showToast(t("messages.invalid_tournament_id"), "error");
      }
    } catch (error) {
      showToast(error, "error"); // Pass the entire error object to showToast
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        marginTop={4}
      >
        <Typography component="h1" variant="h5">
          {t("titles.create_team_title")}
        </Typography>

        <FormProvider {...formContext}>
          <form
            onSubmit={formContext.handleSubmit(onSubmit)}
            style={{ width: "100%", marginTop: "20px" }}
          >
            <TextFieldElement
              required
              name="teamName"
              label={t("create_team_form.team_name_label")}
              fullWidth
              margin="normal"
              validation={{
                required: t("messages.team_name_requirement")
              }}
            />

            <Box display="flex" justifyContent="center" marginTop={4}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!formContext.formState.isValid}
              >
                {t("buttons.create_team_button")}
              </Button>
            </Box>
          </form>
        </FormProvider>
      </Box>
    </Container>
  );
};

export default CreateTeam;
