import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useToast from "hooks/useToast";
import api from "api/axios";
import ErrorModal from "components/common/ErrorModal";
import routePaths from "routes/route-paths";
import { useAuth } from "context/AuthContext";
import type { Tournament } from "types/models";
import { useTranslation } from "react-i18next";
import {
  CheckboxElement,
  DateTimePickerElement,
  FormContainer,
  SelectElement,
  TextFieldElement,
  useForm,
  useWatch
} from "react-hook-form-mui";

import {
  Typography,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Box
} from "@mui/material";

import type { EditTournamentRequest } from "types/requests";

import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import Loader from "components/common/Loader";
const MIN_PLAYER_AMOUNT = 3;
const MIN_GROUP_SIZE = 3;
const now = dayjs();

const defaultValues: EditTournamentRequest = {
  name: "",
  location: "",
  startDate: now.toString(), // ?
  endDate: now.add(1, "week").toString(), // ?
  description: "",
  type: "Round Robin",
  maxPlayers: MIN_PLAYER_AMOUNT,
  matchTime: 300000,
  category: "hobby",
  linkToPay: "",
  linkToSite: ""
};

const EditInfo: React.FC = () => {
  const navigate = useNavigate();
  const showToast = useToast();
  const { tournamentId } = useParams();
  const { t } = useTranslation();
  const { userId } = useAuth();

  const [tournament, setTournament] = useState<Tournament | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [editingEnabled, setEditingEnabled] = useState<boolean>(false);
  const formContext = useForm<EditTournamentRequest>({
    defaultValues,
    mode: "onBlur",
    disabled: !editingEnabled
  });
  const {startDate, endDate} = useWatch<EditTournamentRequest>(formContext);
  const [isConfirmationDialogOpen, setConfirmationDialogOpen] = useState(false);

  useEffect(() => {
    console.log("Received tournament ID:", tournamentId);
    const fetchTournaments = async (): Promise<void> => {
      try {
        const tournamentsData = await api.tournaments.getAll();
        const selectedTournament = tournamentsData.find(
          (tournament) => tournament.id === tournamentId
        );
        if (selectedTournament) {
          // Change Dayjs to strings on dates
          const tournamentData = {
            ...selectedTournament,
            startDate: selectedTournament.startDate.toString(), // ?
            endDate: selectedTournament.endDate.toString() // ?
          };
          setTournament(tournamentData);
          formContext.reset(tournamentData);
          // Check if the current user is the creator of the tournament
          const isUserTheCreator = tournamentData.creator.id === userId;
          if (!isUserTheCreator) {
            // Redirect user to home page if not the creator
            navigate(routePaths.homeRoute);
          }
        } else {
          setTournament(undefined);
        }
      } catch (error) {
        setIsError(true);
        showToast(error, "error");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTournaments();
  }, [tournamentId, formContext.reset]);

  if (isLoading || tournamentId === undefined) {
    return <Loader />;
  }

  // Redirect the user back in case of an error
  if (isError) {
    return (
      <ErrorModal
        open={true}
        onClose={() => {
          navigate(routePaths.homeRoute);
        }}
        errorMessage={t("messages.error_retrieving_info")}
      />
    );
  }

  const onSubmit = async (data: EditTournamentRequest): Promise<void> => {
    // Submit form data to update tournament
    try {
      await api.tournaments.update(tournamentId, {
        ...data,
        startDate: data.startDate?.toString(),
        endDate: data.endDate?.toString()
      });
      showToast(t("messages.update_success"), "success");
    } catch (error) {
      // Handle errors during form submission
      showToast(error, "error");
    }
  };

  const handleConfirm = async (): Promise<void> => {
    // Confirm tournament editing and submit form data
    setConfirmationDialogOpen(false);
    await formContext.handleSubmit(onSubmit)();
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box display="flex" flexDirection="column" gap="5px" width="100%">
        <Typography variant="h5" className="header" fontWeight="bold">
          Muokkaa Turnausta
        </Typography>
      </Box>
      <FormContainer
        defaultValues={defaultValues}
        formContext={formContext}
        onSuccess={onSubmit}
      >
        <TextFieldElement
          required
          name="name"
          label={t("create_tournament_form.tournament_name")}
          fullWidth
          margin="normal"
          disabled={!editingEnabled}
        />

        <TextFieldElement
          required
          name="location"
          label={t("create_tournament_form.location")}
          fullWidth
          margin="normal"
          disabled={!editingEnabled}
        />

    {/*    <Stack spacing={2} marginY={2}>
          <DateTimePickerElement
            required
            name="startDate"
            label={t("create_tournament_form.start_date_time")}
            minDateTime={now}
            format="DD/MM/YYYY HH:mm"
            ampm={false}
            viewRenderers={{
              hours: null,
              minutes: null,
              seconds: null
            }}
          />
          <DateTimePickerElement
            required
            name="endDate"
            label={t("create_tournament_form.end_date_time")}
            minDateTime={startDate}
            format="DD/MM/YYYY HH:mm"
            ampm={false}
            viewRenderers={{
              hours: null,
              minutes: null,
              seconds: null
            }}
          />
          </Stack> */}

        <TextFieldElement
          required
          multiline
          name="description"
          label={t("create_tournament_form.description")}
          fullWidth
          margin="normal"
          disabled={!editingEnabled}
        />

        <TextFieldElement
          name="linkToSite"
          type="url"
          label={t("create_tournament_form.site_link")}
          fullWidth
          margin="normal"
          disabled={!editingEnabled}
        />

        <SelectElement
          required
          label={t("create_tournament_form.match_time")}
          name="matchTime"
          options={[
            {
              id: "180000",
              label: t("create_tournament_form.3_min")
            },
            {
              id: "240000",
              label: t("create_tournament_form.4_min")
            },
            {
              id: "300000",
              label: t("create_tournament_form.5_min")
            }
          ]}
          fullWidth
          margin="normal"
          disabled={!editingEnabled}
        />

        <SelectElement
          required
          label={t("create_tournament_form.select_tournament_type")}
          name="type"
          options={[
            {
              id: "Round Robin",
              label: t("create_tournament_form.round_robin")
            },
            { id: "Playoff", label: t("create_tournament_form.playoff") },
            {
              id: "Preliminary Playoff",
              label: t("create_tournament_form.preliminary_playoff")
            }
          ]}
          fullWidth
          margin="normal"
          disabled={!editingEnabled}
        />

        <SelectElement
          required
          label={t("create_tournament_form.category")}
          name="category"
          options={[
            {
              id: "hobby",
              label: t("create_tournament_form.hobby")
            },
            {
              id: "championship",
              label: t("create_tournament_form.championship")
            },
            {
              id: "league",
              label: t("create_tournament_form.league")
            }
          ]}
          fullWidth
          margin="normal"
          disabled={!editingEnabled}
        />

        <TextFieldElement
          required
          name="maxPlayers"
          type="number"
          label={t("create_tournament_form.max_players")}
          fullWidth
          margin="normal"
          disabled={!editingEnabled}
          validation={{
            validate: (value: number) => {
              return (
                value >= MIN_PLAYER_AMOUNT ||
                `${t("messages.minimum_players_error")}${MIN_PLAYER_AMOUNT}`
              );
            }
          }}
        />

        <CheckboxElement
          name="differentOrganizer"
          label={t("create_tournament_form.different_organizer_info")}
          disabled={!editingEnabled}
          onChange={(e) => {
            formContext.resetField("organizerEmail");
          }}
        />

        <Box
          display="flex"
          justifyContent="space-evenly"
          flexWrap="wrap"
          gap="10px"
        >
          {!editingEnabled ? (
            <Button
              type="button"
              variant="outlined"
              color="primary"
              sx={{ mt: 3, mb: 2 }}
              onClick={() => {
                setEditingEnabled(true);
              }}
            >
              {t("buttons.edit_info_button")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outlined"
              color="primary"
              onClick={() => {
                setEditingEnabled(() => {
                  formContext.reset();
                  return false;
                });
              }}
              sx={{ mt: 3, mb: 2 }}
            >
              {t("buttons.cancel_button")}
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setConfirmationDialogOpen(true);
            }}
            disabled={!editingEnabled || !formContext.formState.isDirty}
            sx={{ mt: 3, mb: 2 }}
          >
            {t("buttons.save_changes_button")}
          </Button>
        </Box>

        <Dialog
          open={isConfirmationDialogOpen}
          onClose={() => {
            setConfirmationDialogOpen(false);
          }}
          aria-labelledby="confirmation-dialog-title"
          aria-describedby="confirmation-dialog-description"
        >
          <DialogTitle id="confirmation-dialog-title">
            {t("titles.confirm_tournament_editing")}
          </DialogTitle>
          <DialogContent>
            <Typography>
              {t("edit_tournament_form.confirmation_message")}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                setConfirmationDialogOpen(false);
              }}
            >
              {t("buttons.cancel_button")}
            </Button>
            <Button
              type="submit"
              onClick={handleConfirm}
              variant="contained"
              color="success"
            >
              {t("buttons.confirm_button")}
            </Button>
          </DialogActions>
        </Dialog>
      </FormContainer>
    </Container>
  );
};

export default EditInfo;
