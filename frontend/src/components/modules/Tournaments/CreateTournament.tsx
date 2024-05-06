import React, { useState } from "react";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { isValidPhone } from "utils/form-validators";
import api from "api/axios";
import useToast from "hooks/useToast";
import { useNavigate } from "react-router-dom";
import {
  type TournamentType,
  type MatchTime,
  type Category
} from "types/models";
import { useTranslation } from "react-i18next";
import {
  Typography,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Box,
  useMediaQuery
} from "@mui/material";
import updateLocale from "dayjs/plugin/updateLocale";

// Readily defined components from the react-hook-form-mui library.
import {
  CheckboxElement,
  DateTimePickerElement,
  FormContainer,
  SelectElement,
  TextFieldElement,
  useForm,
  useWatch
} from "react-hook-form-mui";

import routePaths from "routes/route-paths";

const MIN_PLAYER_AMOUNT = 3;
const MIN_GROUP_SIZE = 3;
const now = dayjs();

export interface CreateTournamentFormData {
  name: string;
  location: string;
  startDate: Dayjs;
  endDate: Dayjs;
  description: string;
  type: TournamentType;
  maxPlayers: number;
  differentOrganizer: boolean;
  organizerEmail?: string;
  organizerTel?: string;
  playersToPlayoffsPerGroup?: number;
  groupsSizePreference?: number;
  matchTime: MatchTime;
  category: Category;
  paid: boolean;
  linkToPay?: string;
  linkToSite?: string;
  numberOfCourts: number;
  swissRounds?: number;
}

const defaultValues: CreateTournamentFormData = {
  name: "",
  location: "",
  startDate: now,
  endDate: now.add(1, "week"),
  description: "",
  type: "Round Robin",
  maxPlayers: MIN_PLAYER_AMOUNT,
  differentOrganizer: false,
  matchTime: 300000,
  category: "hobby",
  paid: false,
  linkToPay: "",
  linkToSite: "",
  numberOfCourts: 1
};

// Make monday the first day of the week
dayjs.extend(updateLocale);
dayjs.updateLocale("en", {
  weekStart: 1
});

const CreateTournamentForm: React.FC = () => {
  const showToast = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const formContext = useForm<CreateTournamentFormData>({
    defaultValues,
    mode: "onBlur"
  });
  const { differentOrganizer, startDate, type, paid } =
    useWatch<CreateTournamentFormData>(formContext);
  const [isConfirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const mobile = useMediaQuery("(max-width:600px)");

  const onSubmit = async (data: CreateTournamentFormData): Promise<void> => {
    try {
      // Round dates to the nearest minute down
      const roundedStartDate = data.startDate.startOf("minute");
      const roundedEndDate = data.endDate.startOf("minute");

      await api.tournaments.createNew({
        ...data,
        startDate: roundedStartDate.toString(),
        endDate: roundedEndDate.toString()
      });
      showToast(
        t("messages.creations_success", { name: data.name }),
        "success"
      );
      navigate(routePaths.homeRoute, {
        replace: true,
        state: { refresh: true }
      });
    } catch (error) {
      showToast(error, "error");
    }
  };

  const handleConfirm = async (): Promise<void> => {
    setConfirmationDialogOpen(false);
    await formContext.handleSubmit(onSubmit)();
  };

  const renderTournamentTypeSpecificFields = (): JSX.Element | null => {
    if (type === "Preliminary Playoff") {
      return (
        <React.Fragment>
          <TextFieldElement
            required
            name="groupsSizePreference"
            type="number"
            label={t("create_tournament_form.groups_size_preference")}
            fullWidth
            margin="normal"
            validation={{
              validate: (value: number) => {
                return (
                  value >= MIN_GROUP_SIZE ||
                  `${t("messages.minimum_groupsize_error")}${MIN_GROUP_SIZE}`
                );
              }
            }}
          />
          <TextFieldElement
            required
            name="playersToPlayoffsPerGroup"
            type="number"
            label={t("create_tournament_form.players_to_playoffs_per_group")}
            fullWidth
            margin="normal"
            validation={{
              validate: (value: number) => {
                return (
                  value > 0 || `${t("messages.minimum_player_to_playoff")}`
                );
              }
            }}
          />
        </React.Fragment>
      );
    }
    if (type === "Swiss") {
      return (
        <React.Fragment>
          <TextFieldElement
            required
            name="swissRounds"
            type="number"
            label={t("create_tournament_form.swiss_rounds")}
            fullWidth
            margin="normal"
            validation={{
              validate: (value: number) => {
                return value >= 1 || `${t("messages.swiss_rounds_error")}`;
              }
            }}
          />
        </React.Fragment>
      );
    }
    return null;
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box display="flex" flexDirection="column" gap="5px" width="100%">
        <Typography variant="h5" className="header" fontWeight="bold">
          {t("titles.create_tournament")}
        </Typography>
        <Typography variant="subtitle1" className="subtext">
          {t("create_tournament_form.info")}
        </Typography>
      </Box>
      <FormContainer defaultValues={defaultValues} formContext={formContext}>
        <TextFieldElement
          required
          name="name"
          label={t("create_tournament_form.tournament_name")}
          fullWidth
          margin="normal"
          validation={{
            required: t("create_tournament_form.required_text")
          }}
        />

        <TextFieldElement
          required
          name="location"
          label={t("create_tournament_form.location")}
          fullWidth
          margin="normal"
          validation={{
            required: t("create_tournament_form.required_text")
          }}
        />

        <Stack spacing={2} marginY={2}>
          <DateTimePickerElement
            required
            name="startDate"
            label={t("create_tournament_form.start_date_time")}
            minDateTime={now}
            format="DD/MM/YYYY HH:mm"
            ampm={false}
            {...(!mobile && {
              // Only text input on desktop
              viewRenderers: {
                hours: null,
                minutes: null,
                seconds: null
              }
            })}
          />
          <DateTimePickerElement
            required
            name="endDate"
            label={t("create_tournament_form.end_date_time")}
            minDateTime={startDate}
            format="DD/MM/YYYY HH:mm"
            ampm={false}
            {...(!mobile && {
              // Only text input on desktop
              viewRenderers: {
                hours: null,
                minutes: null,
                seconds: null
              }
            })}
          />
        </Stack>

        <TextFieldElement
          required
          multiline
          name="description"
          label={t("create_tournament_form.description")}
          fullWidth
          margin="normal"
          validation={{
            required: t("create_tournament_form.required_text")
          }}
        />

        <TextFieldElement
          name="linkToSite"
          type="url"
          label={t("create_tournament_form.site_link")}
          fullWidth
          margin="normal"
        />

        <CheckboxElement
          name="paid"
          label={t("create_tournament_form.paid")}
          onChange={(e) => {
            formContext.resetField("linkToPay");
            formContext.setValue("paid", e.target.checked);
          }}
        />

        {paid !== undefined && paid && (
          <React.Fragment>
            <TextFieldElement
              required
              name="linkToPay"
              type="url"
              label={t("create_tournament_form.payment_link")}
              fullWidth
              margin="normal"
              validation={{
                required: t("create_tournament_form.required_text")
              }}
            />
          </React.Fragment>
        )}

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
            },
            {
              id: "Swiss",
              label: t("create_tournament_form.swiss")
            }
          ]}
          fullWidth
          margin="normal"
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
        />

        {renderTournamentTypeSpecificFields()}

        <TextFieldElement
          required
          name="numberOfCourts"
          type="number"
          label={t("create_tournament_form.number_of_courts")}
          fullWidth
          margin="normal"
          validation={{
            validate: (value: number) => {
              return value >= 1 || `${t("messages.number_of_courts_error")}`;
            }
          }}
        />

        <TextFieldElement
          required
          name="maxPlayers"
          type="number"
          label={t("create_tournament_form.max_players")}
          fullWidth
          margin="normal"
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
          onChange={(e) => {
            formContext.resetField("organizerEmail");
            formContext.resetField("organizerTel");
            formContext.setValue("differentOrganizer", e.target.checked);
          }}
        />

        {differentOrganizer !== undefined && differentOrganizer && (
          <React.Fragment>
            <TextFieldElement
              required
              name="organizerEmail"
              type="email"
              label={t("create_tournament_form.organizer_email")}
              fullWidth
              margin="normal"
              validation={{
                required: t("create_tournament_form.required_text")
              }}
            />

            <TextFieldElement
              required
              name="organizerTel"
              type="tel"
              label={t("create_tournament_form.organizer_phone_number")}
              fullWidth
              margin="normal"
              validation={{
                validate: (value: string) => {
                  return (
                    isValidPhone(value) || t("messages.phonenumber_validation")
                  );
                }
              }}
            />
          </React.Fragment>
        )}
        <Box textAlign="center">
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setConfirmationDialogOpen(true);
            }}
            disabled={!formContext.formState.isValid}
            fullWidth
            sx={{ mt: 3, mb: 2 }}
          >
            {t("buttons.create_button")}
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
            {t("titles.confirm_tournament_creation")}
          </DialogTitle>
          <DialogContent>
            <Typography>
              {t("create_tournament_form.confirmation_message")}
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

export default CreateTournamentForm;
