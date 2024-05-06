import React, { Fragment, useEffect, useState } from "react";
import TournamentCard from "./TournamentCard";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTournaments } from "context/TournamentsContext";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Select from "@mui/material/Select";
import type { Tournament } from "types/models";
import { useTranslation } from "react-i18next";
import type { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import {
  sortTournamentsByMostRecent,
  sortTournamentsByOldest,
  sortTournamentsByName,
  sortTournamentsByDescName,
  sortTournamentsByLocation
} from "utils/sorters";
import useMediaQuery from "@mui/material/useMediaQuery";
import FilterTournaments from "../FilterTournaments";

const TournamentList: React.FC = () => {
  const navigate = useNavigate();
  const { past, upcoming, ongoing } = useTournaments();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const tabTypes = ["past", "ongoing", "upcoming"] as const;

  // Set the initial tab based on whether there are ongoing tournaments
  const initialTab = ongoing.length > 0 ? "ongoing" : "upcoming";

  const defaultTab = initialTab;
  const currentTab = searchParams.get("tab") ?? defaultTab;

  const mobile = useMediaQuery("(max-width:600px)");
  // State to keep track if filters have been applied
  const [filtersApplied, setFiltersApplied] = useState(false);
  // State for storing possible filtered tournaments
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>(
    []
  );

  // If nothing filtered, get right tournaments again
  useEffect(() => {
    if (filteredTournaments.length === 0) {
      tournamentsToRender();
    }
  }, [filtersApplied]);

  // State variables for sorting
  const [sortBy, setSortBy] = useState<
    "mostRecent" | "oldest" | "name" | "nameDesc" | "location"
  >("mostRecent");

  // Event handler for sorting change
  const handleSortChange = (
    event: SelectChangeEvent<
      "mostRecent" | "oldest" | "name" | "nameDesc" | "location"
    >
  ): void => {
    setSortBy(event.target.value as typeof sortBy);
  };

  // Function to receive filtered tournaments from FilterTournaments
  const handleFilteredTournaments = (
    tournaments: Tournament[],
    areFiltersApplied: boolean
  ): void => {
    setFiltersApplied(areFiltersApplied);
    setFilteredTournaments(tournaments);
  };

  useEffect(() => {
    if (currentTab === null || !tabTypes.some((tab) => tab === currentTab)) {
      setSearchParams((params) => {
        params.set("tab", defaultTab);
        return params;
      });
    }
  }, [currentTab]);

  const tournamentsToRender = (): Tournament[] => {
    let tournaments: Tournament[];

    switch (currentTab) {
      case "past":
        tournaments = [...past]; // a copy not to mutate original data
        break;
      case "ongoing":
        tournaments = [...ongoing];
        break;
      case "upcoming":
        tournaments = [...upcoming];
        break;
      default:
        tournaments = [...ongoing];
    }

    if (filtersApplied) {
      // Sort tournaments based on chosen sorting criteria
      switch (sortBy) {
        case "mostRecent":
          sortTournamentsByMostRecent(filteredTournaments);
          break;
        case "oldest":
          sortTournamentsByOldest(filteredTournaments);
          break;
        case "name":
          sortTournamentsByName(filteredTournaments);
          break;
        case "nameDesc":
          sortTournamentsByDescName(filteredTournaments);
          break;
        case "location":
          sortTournamentsByLocation(filteredTournaments);
          break;
      }
    } else {
      // Sort tournaments based on chosen sorting criteria
      switch (sortBy) {
        case "mostRecent":
          sortTournamentsByMostRecent(tournaments);
          break;
        case "oldest":
          sortTournamentsByOldest(tournaments);
          break;
        case "name":
          sortTournamentsByName(tournaments);
          break;
        case "nameDesc":
          sortTournamentsByDescName(tournaments);
          break;
        case "location":
          sortTournamentsByLocation(tournaments);
          break;
      }
    }
    // Show filtered tournaments if filters are applied
    if (filtersApplied) {
      return filteredTournaments;
    } else {
      return tournaments;
    }
  };

  const handleTabChange = (tab: string): void => {
    setSearchParams((params) => {
      params.set("tab", tab);
      return params;
    });

    // Reset filter state when switching tabs
    setFiltersApplied(false);
    setFilteredTournaments([]);

    // On tab change clear selections
    sessionStorage.clear();
  };

  const getNoTournamentsMessage = (): string => {
    if (filtersApplied) {
      return t("frontpage_labels.no_tournaments_found");
    }

    switch (currentTab) {
      case "ongoing":
        return t("frontpage_labels.no_ongoing");
      case "upcoming":
        return t("frontpage_labels.no_upcoming");
      case "past":
        return t("frontpage_labels.no_past");
      default:
        return t("frontpage_labels.no_tournaments_found");
    }
  };

  return (
    <Container sx={{ position: "relative", paddingBottom: "30px" }}>
      {/* Welcome Message */}
      <Box sx={{ paddingBottom: "30px" }}>
        <Typography sx={{ fontSize: "20px" }}>
          {t("frontpage_labels.welcome")}
        </Typography>
      </Box>

      {/* Floating Create Tournament Button */}
      <Button
        type="button"
        variant="outlined"
        color="primary"
        onClick={() => {
          navigate("new-tournament");
        }}
        sx={{
          fontSize: "34px",
          position: "fixed",
          zIndex: "999",
          bottom: "70px",
          right: "20px",
          color: "white",
          backgroundColor: "#db4744",
          borderRadius: "50%",
          width: "56px",
          height: "62px",
          textTransform: "none",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.3)",
          transition: "transform 0.3s",

          "&::after": {
            content: "'+'",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          },

          "&:hover": {
            width: "130px",
            height: "60px",
            borderRadius: "10px",
            color: "white",
            backgroundColor: "#db4744",
            "&::after": {
              content: `'${t("frontpage_labels.create_tournament")}'`,
              fontSize: "16px"
            }
          }
        }}
      ></Button>

      {/* Tournament Listings */}
      {/* If the device is mobile */}
      {mobile ? (
        <Fragment>
          <Select
            value={currentTab}
            onChange={(event) => {
              handleTabChange(event.target.value);
            }}
            style={{ marginBottom: "10px" }}
            sx={{
              border: "2px solid #db4744",
              fontSize: "20px",
              color: "#db4744"
            }}
          >
            <MenuItem value="ongoing">
              {t("frontpage_labels.ongoing_tournaments")}
            </MenuItem>
            <MenuItem value="upcoming">
              {t("frontpage_labels.upcoming_tournaments")}
            </MenuItem>
            <MenuItem value="past">
              {t("frontpage_labels.past_tournaments")}
            </MenuItem>
          </Select>
          <br></br>
        </Fragment>
      ) : (
        <Box
          sx={{ borderBottom: 1, borderColor: "divider", marginBottom: "10px" }}
        >
          {/* If the device is desktop */}
          <Tabs
            value={currentTab}
            onChange={(_, value) => {
              handleTabChange(value);
            }}
            variant="scrollable"
            sx={{
              position: "sticky",
              top: 0,
              bottom: 0,
              backgroundColor: "white"
            }}
          >
            <Tab
              label={t("frontpage_labels.ongoing_tournaments")}
              value={"ongoing"}
            ></Tab>
            <Tab
              label={t("frontpage_labels.upcoming_tournaments")}
              value={"upcoming"}
            ></Tab>
            <Tab
              label={t("frontpage_labels.past_tournaments")}
              value={"past"}
            ></Tab>
          </Tabs>
        </Box>
      )}
      <Box display="flex" alignItems="center" marginBottom="10px">
        {/* Dropdown menu to choose sorting criteria */}
        <label style={{ marginRight: "10px" }}>{t("sorting.orderBy")} </label>
        <Select
          value={sortBy}
          onChange={handleSortChange}
          style={{ marginBottom: "10px" }}
        >
          <MenuItem value="mostRecent">{t("sorting.mostRecent")}</MenuItem>
          <MenuItem value="oldest">{t("sorting.oldest")}</MenuItem>
          <MenuItem value="name">{t("sorting.name")}</MenuItem>
          <MenuItem value="nameDesc">{t("sorting.nameDesc")}</MenuItem>
          <MenuItem value="location">{t("sorting.location")}</MenuItem>
        </Select>
        {/* Filtering options button */}
        <FilterTournaments
          parentComponent="TournamentsList"
          handleFilteredTournaments={handleFilteredTournaments}
          tab={currentTab}
        />
      </Box>

      <Grid
        container
        spacing={2}
        direction={currentTab === "past" ? "column" : "row"}
        alignItems="stretch"
      >
        {tournamentsToRender().length > 0 ? (
          tournamentsToRender().map((tournament, key) => (
            <Grid item xs={12} md={6} key={tournament.id + key}>
              <TournamentCard tournament={tournament} type={currentTab} />
            </Grid>
          ))
        ) : (
          <Container>
            <Typography variant="h6" marginTop="32px" textAlign="center">
              {getNoTournamentsMessage()}
            </Typography>
          </Container>
        )}
      </Grid>
    </Container>
  );
};

export default TournamentList;
