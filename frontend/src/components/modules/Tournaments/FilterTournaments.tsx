import React, { useState, useEffect } from "react";
import type { SelectChangeEvent } from "@mui/material";
import { useAuth } from "context/AuthContext";
import {
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Select,
  Typography,
  FormGroup,
  MenuItem,
  Box,
  IconButton
} from "@mui/material";
import FormControlLabel from "@mui/material/FormControlLabel";
import { useTranslation } from "react-i18next";
import {
  filterByTime,
  filterByParticipation,
  filterByTournamentType,
  filterByCategory,
  filterByLocation,
  filterByPointType
} from "utils/filters";
import type {
  Tournament,
  TournamentType,
  Category,
  PointType
} from "types/models";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useTournaments } from "context/TournamentsContext";
import { sortTournamentsByLocation } from "utils/sorters";
import DateRangePicker from "../Tournaments/TournamentListing/DateRangePicker";
import CloseIcon from "@mui/icons-material/Close";
import { useLocation } from "react-router-dom";

interface FilterTournamentsProps {
  parentComponent: "TournamentsList" | "ProfileGames";
  handleFilteredTournaments: (
    filteredTournaments: Tournament[],
    areFiltersApplied: boolean
  ) => void;
  tab?: string;
  tournaments?: Tournament[];
}

interface FilterCriteria {
  participation?: boolean;
  tournamentTypes: TournamentType[];
  categories: Category[];
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  location: string;
  pointTypes?: PointType[];
}

const FilterTournaments: React.FC<FilterTournamentsProps> = ({
  parentComponent,
  handleFilteredTournaments,
  tab,
  tournaments
}) => {
  const { t } = useTranslation();
  const { userId, isAuthenticated } = useAuth();
  const { upcoming, ongoing, past } = useTournaments() ?? {};
  const [filteringDialog, setFilteringDialog] = useState(false);
  const [isFilterCriteriaLoaded, setIsFilterCriteriaLoaded] = useState(false);
  const [previousTab, setPreviousTab] = useState<string | undefined>(undefined);
  const [shouldResetFilters, setShouldResetFilters] = useState(false);
  const location = useLocation();

  // Arrays of tuples containing the type and its localization key, for populating dialog window
  const tournamentTypeOptions: Array<[TournamentType, string]> = [
    ["Round Robin", "types.round_robin"],
    ["Playoff", "types.playoff"],
    ["Preliminary Playoff", "types.preliminary_playoff"]
  ];

  const categoryOptions: Array<[Category, string]> = [
    ["hobby", "create_tournament_form.hobby"],
    ["championship", "create_tournament_form.championship"],
    ["league", "create_tournament_form.league"]
  ];

  const pointTypeOptions: Array<[PointType, string]> = [
    ["men", "game_interface.point_types.men"],
    ["kote", "game_interface.point_types.kote"],
    ["do", "game_interface.point_types.do"],
    ["tsuki", "game_interface.point_types.tsuki"],
    ["hansoku", "game_interface.point_types.hansoku"]
  ];

  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({
    participation: false,
    tournamentTypes: [],
    categories: [],
    startDate: null,
    endDate: null,
    location: "",
    pointTypes: []
  });

  // State variables for keeping track of checkbox states
  const [participationSelection, setParticipationSelection] = useState(false);

  const [tournamentTypeSelections, setTournamentTypeSelections] = useState<{
    [key in TournamentType]: boolean;
  }>({
    "Round Robin": false,
    Playoff: false,
    "Preliminary Playoff": false,
    Swiss: false
  });

  const [categorySelections, setCategorySelections] = useState<{
    [key in Category]: boolean;
  }>({
    hobby: false,
    championship: false,
    league: false
  });

  const [pointTypeSelections, setPointTypeSelections] = useState<{
    [key in PointType]: boolean;
  }>({
    men: false,
    kote: false,
    do: false,
    tsuki: false,
    hansoku: false
  });

  const getOriginalTournamentData = (): Tournament[] => {
    if (parentComponent === "TournamentsList") {
      if (tab === "upcoming") {
        return upcoming;
      } else if (tab === "ongoing") {
        return ongoing;
      } else {
        return past;
      }
    } else {
      return [];
    }
  };

  useEffect(() => {
    // If the user navigates to the front page or profile
    // Clear session storage not to transfer potential filters
    if (
      (location.pathname === "/tournaments" && location.search === "") ||
      (location.pathname === "/profile" && location.search === "")
    ) {
      resetFilters();
    }
  }, [location]);

  // Reset filter criteria when tab changes
  useEffect(() => {
    if (
      (previousTab !== undefined && previousTab !== tab) ||
      shouldResetFilters
    ) {
      resetFilters();
      setShouldResetFilters(false);
    }
    setPreviousTab(tab);
  }, [tab, previousTab, shouldResetFilters]);

  // When app mounts check if there is filters stored in sessionStorage
  useEffect(() => {
    const storedFilters = sessionStorage.getItem("tournamentFilters");
    if (storedFilters !== null && storedFilters !== undefined) {
      const parsedFilters = JSON.parse(storedFilters);

      // Convert dates to Day.js objects if they are not null
      const startDate =
        parsedFilters.startDate !== null
          ? dayjs(parsedFilters.startDate)
          : null;
      const endDate =
        parsedFilters.endDate !== null ? dayjs(parsedFilters.endDate) : null;
      updateCriteria({
        ...parsedFilters,
        startDate,
        endDate
      });

      if (parsedFilters.participation !== undefined) {
        setParticipationSelection(parsedFilters.participation);
      }

      // Update checkbox selections based on loaded filter criteria
      if (parsedFilters.participation !== undefined) {
        setParticipationSelection(parsedFilters.participation);
      }

      setTournamentTypeSelections((prevSelections) => {
        const updatedSelections: { [key in TournamentType]: boolean } = {
          ...prevSelections
        };
        parsedFilters.tournamentTypes.forEach((type: TournamentType) => {
          updatedSelections[type] = true;
        });
        return updatedSelections;
      });

      setCategorySelections((prevSelections) => {
        const updatedSelections: { [key in Category]: boolean } = {
          ...prevSelections
        };
        parsedFilters.categories.forEach((category: Category) => {
          updatedSelections[category] = true;
        });
        return updatedSelections;
      });

      setPointTypeSelections((prevSelections) => {
        const updatedSelections: { [key in PointType]: boolean } = {
          ...prevSelections
        };
        parsedFilters.pointTypes?.forEach((pointType: PointType) => {
          updatedSelections[pointType] = true;
        });
        return updatedSelections;
      });
      setIsFilterCriteriaLoaded(true);
    }
  }, []);

  // Show previously chosen filtered tournaments
  useEffect(() => {
    const storedTournaments = sessionStorage.getItem("filteredTournaments");
    if (storedTournaments !== null && storedTournaments !== undefined) {
      const parsedTournaments = JSON.parse(storedTournaments);
      handleFilteredTournaments(parsedTournaments, true);
    }
  }, [filterCriteria, isFilterCriteriaLoaded]);

  // Function to reset all selections from filter dialog
  const resetFilters = (): void => {
    // Filter criteria state back to original
    setFilterCriteria({
      participation: false,
      tournamentTypes: [],
      categories: [],
      startDate: null,
      endDate: null,
      location: ""
    });

    setParticipationSelection(false);

    // Reset tournament type selections
    setTournamentTypeSelections((prevSelections) => {
      const resetSelections: Record<TournamentType, boolean> = {
        ...prevSelections
      };
      for (const key in resetSelections) {
        if (Object.prototype.hasOwnProperty.call(resetSelections, key)) {
          resetSelections[key as TournamentType] = false;
        }
      }
      return resetSelections;
    });

    // Reset category selections
    setCategorySelections((prevSelections) => {
      const resetSelections: Record<Category, boolean> = { ...prevSelections };
      for (const key in resetSelections) {
        if (Object.prototype.hasOwnProperty.call(resetSelections, key)) {
          resetSelections[key as Category] = false;
        }
      }
      return resetSelections;
    });

    // Reset category selections
    setPointTypeSelections((prevSelections) => {
      const resetSelections: Record<PointType, boolean> = { ...prevSelections };
      for (const key in resetSelections) {
        if (Object.prototype.hasOwnProperty.call(resetSelections, key)) {
          resetSelections[key as PointType] = false;
        }
      }
      return resetSelections;
    });

    sessionStorage.clear();
    handleFilteredTournaments([], false);
  };

  // Get tournament locations
  const getLocations = (): string[] => {
    let currentTournaments: Tournament[] | undefined;
    if (parentComponent === "ProfileGames") {
      currentTournaments = tournaments;
    } else if (parentComponent === "TournamentsList") {
      if (tab === "upcoming") {
        currentTournaments = sortTournamentsByLocation(upcoming);
      } else if (tab === "ongoing") {
        currentTournaments = sortTournamentsByLocation(ongoing);
      } else if (tab === "past") {
        currentTournaments = sortTournamentsByLocation(past);
      }
    }

    const locations = new Set<string>();
    if (currentTournaments !== null && currentTournaments !== undefined) {
      currentTournaments.forEach((tournament) => {
        locations.add(tournament.location);
      });
    }
    return Array.from(locations);
  };

  // Function to create MenuItems for locations
  const createMenuItemsForLocations = (): JSX.Element[] => {
    const locations = getLocations();
    const menuItems: JSX.Element[] = [];
    // Include empty selection as first value
    menuItems.push(
      <MenuItem key="empty" value="">
        <em>{t("filtering.no_location")}</em>
      </MenuItem>
    );

    Array.from(locations).map((location, index) =>
      menuItems.push(
        <MenuItem key={index} value={location}>
          {location}
        </MenuItem>
      )
    );
    return menuItems;
  };

  // Function to update filter criteria state
  const updateCriteria = (newCriteria: Partial<FilterCriteria>): void => {
    // Combine the existing filter criteria with the new criteria
    const updatedCriteria: FilterCriteria = {
      ...filterCriteria, // Include the previous criteria
      ...newCriteria // Include the new criteria
    };
    setFilterCriteria(updatedCriteria);
  };

  const handleOpenDialog = (): void => {
    setFilteringDialog(true);
  };

  const handleCloseDialog = (): void => {
    setFilteringDialog(false);
  };

  const handleParticipationChange = (): void => {
    const newParticipation =
      filterCriteria.participation === null ||
      filterCriteria.participation === undefined
        ? false // Default value if filterCriteria.participation is null or undefined
        : !filterCriteria.participation;
    setParticipationSelection(newParticipation);
    const newCriteria: Partial<FilterCriteria> = {
      participation: newParticipation
    };
    updateCriteria(newCriteria);
  };

  const handleStartDateChange = (date: Dayjs | null): void => {
    updateCriteria({
      startDate: date
    });
  };

  const handleEndDateChange = (date: Dayjs | null): void => {
    updateCriteria({
      endDate: date
    });
  };

  const handleTournamentTypeChange = (tournamentType: TournamentType): void => {
    setTournamentTypeSelections((prevSelections) => ({
      ...prevSelections,
      [tournamentType]: !prevSelections[tournamentType]
    }));

    const prevTourCriteria = filterCriteria.tournamentTypes;
    updateCriteria({
      tournamentTypes: prevTourCriteria.includes(tournamentType)
        ? prevTourCriteria.filter((type) => type !== tournamentType)
        : [...prevTourCriteria, tournamentType]
    });
  };

  const handleCategoryChange = (category: Category): void => {
    setCategorySelections((prevSelections) => ({
      ...prevSelections,
      [category]: !prevSelections[category]
    }));

    const prevCatCriteria = filterCriteria.categories;
    updateCriteria({
      categories: prevCatCriteria.includes(category)
        ? prevCatCriteria.filter((cat: Category) => cat !== category)
        : [...prevCatCriteria, category]
    });
  };

  const handleLocationChange = (event: SelectChangeEvent<string>): void => {
    updateCriteria({
      location: event.target.value
    });
  };

  const handlePointTypeChange = (pointType: PointType): void => {
    setPointTypeSelections((prevSelections) => ({
      ...prevSelections,
      [pointType]: !prevSelections[pointType]
    }));

    const prevPointCriteria = filterCriteria.pointTypes ?? [];
    updateCriteria({
      pointTypes: prevPointCriteria.includes(pointType)
        ? prevPointCriteria.filter((point: PointType) => point !== pointType)
        : [...prevPointCriteria, pointType]
    });
  };

  // Function to handle reset button click
  const handleResetButtonClick = (): void => {
    // Set shouldResetFilters to true to trigger resetting
    setShouldResetFilters(true);
  };

  // Function to apply filters when the user clicks the filter button
  const handleFilterClick = (): void => {
    const filteredTournaments = applyFilters();
    // Store updated filter data in session storage
    sessionStorage.setItem("tournamentFilters", JSON.stringify(filterCriteria));
    sessionStorage.setItem(
      "filteredTournaments",
      JSON.stringify(filteredTournaments)
    );
    handleFilteredTournaments(filteredTournaments, true);
  };

  const applyFilters = (): Tournament[] => {
    let filtered: Tournament[] = [];
    if (parentComponent === "TournamentsList") {
      filtered = getOriginalTournamentData();
    } else {
      if (tournaments !== undefined) {
        filtered = tournaments;
      }
    }

    if (
      filterCriteria.participation !== null ||
      filterCriteria.participation !== undefined
    ) {
      if (userId !== undefined) {
        filtered = filterByParticipation(filtered, userId);
      }
    }
    if (filterCriteria.tournamentTypes.length > 0) {
      filtered = filterByTournamentType(
        filtered,
        filterCriteria.tournamentTypes
      );
    }
    if (filterCriteria.categories.length > 0) {
      filtered = filterByCategory(filtered, filterCriteria.categories);
    }
    if (filterCriteria.location !== "") {
      filtered = filterByLocation(filtered, filterCriteria.location);
    }
    if (
      filterCriteria.pointTypes !== undefined &&
      tournaments !== undefined &&
      userId !== undefined &&
      filterCriteria.pointTypes?.length > 0
    ) {
      filtered = filterByPointType(
        tournaments,
        filterCriteria.pointTypes,
        userId
      );
    }
    // Apply filter by time in any case, nulls are also handled by filterByTime
    filtered = filterByTime(
      filtered,
      filterCriteria.startDate,
      filterCriteria.endDate
    );

    return filtered;
  };

  return (
    <div>
      <Button onClick={handleOpenDialog}>{t("buttons.filter")}</Button>

      <Dialog open={filteringDialog} onClose={handleCloseDialog}>
        <DialogTitle variant="h5">
          {t("filtering.options")}
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={{
              position: "absolute",
              right: 8,
              top: 8
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {/* this is visible only for logged in user in tournamentslist */}
          {isAuthenticated && parentComponent === "TournamentsList" && (
            <Box>
              <Typography variant="h6">
                {t("filtering.participation")}
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={participationSelection}
                    onChange={handleParticipationChange}
                  />
                }
                label={t("filtering.user_participates")}
              />
            </Box>
          )}
          <Typography variant="h6">{t("filtering.by_time")}</Typography>
          <DateRangePicker
            startDate={filterCriteria.startDate}
            endDate={filterCriteria.endDate}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
          />

          <Box display="flex" alignItems="center" marginBottom="10px">
            <Typography variant="h6" style={{ marginRight: "10px" }}>
              {t("filtering.by_location")}
            </Typography>
            <Select
              value={filterCriteria.location}
              onChange={handleLocationChange}
              style={{ marginBottom: "10px" }}
            >
              {createMenuItemsForLocations()}
            </Select>
          </Box>

          <FormGroup>
            <Box sx={{ display: "flex", flexDirection: "row" }}>
              {/* Tournament Type Options */}
              <Box sx={{ marginRight: "20px" }}>
                <Typography variant="h6">
                  {t("filtering.by_tournament_type")}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    marginBottom: 2
                  }}
                >
                  {tournamentTypeOptions.map(([type, localizationKey]) => (
                    <FormControlLabel
                      key={type}
                      control={
                        <Checkbox
                          checked={tournamentTypeSelections[type]}
                          onChange={() => {
                            handleTournamentTypeChange(type);
                          }}
                        />
                      }
                      label={t(localizationKey)}
                    />
                  ))}
                </Box>
              </Box>
              {/* Category Options */}
              <Box>
                <Typography variant="h6">
                  {t("filtering.by_tournament_category")}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    marginBottom: 2
                  }}
                >
                  {categoryOptions.map(([category, localizationKey]) => (
                    <FormControlLabel
                      key={category}
                      control={
                        <Checkbox
                          checked={categorySelections[category]}
                          onChange={() => {
                            handleCategoryChange(category);
                          }}
                        />
                      }
                      label={t(localizationKey)}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </FormGroup>
          <FormGroup>
            {/* This is visible only in profile matches filter dialog */}
            {parentComponent === "ProfileGames" && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <Typography variant="h6">
                  {t("filtering.by_point_type")}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    marginBottom: 2
                  }}
                >
                  {pointTypeOptions.map(([point, localizationKey]) => (
                    <FormControlLabel
                      key={point}
                      control={
                        <Checkbox
                          checked={pointTypeSelections[point]}
                          onChange={() => {
                            handlePointTypeChange(point);
                          }}
                        />
                      }
                      label={t(localizationKey)}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </FormGroup>

          <Box display="flex" justifyContent={"space-evenly"}>
            <Button
              color="error"
              variant="outlined"
              onClick={() => {
                handleCloseDialog();
              }}
            >
              {t("buttons.cancel_button")}
            </Button>

            <Button
              color="secondary"
              variant="outlined"
              onClick={() => {
                handleResetButtonClick();
              }}
            >
              {t("buttons.reset")}
            </Button>

            <Button
              color="success"
              variant="outlined"
              onClick={() => {
                handleFilterClick();
                handleCloseDialog();
              }}
            >
              {t("buttons.filter")}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FilterTournaments;
