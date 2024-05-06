import React, { Fragment, useState, useEffect } from "react";
import ProfileInfo from "./ProfileInfo";
import ProfileGames from "./ProfileGames";
import ProfilePoints from "./ProfilePoints";
import CreatedTournaments from "./CreatedTournaments";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useTranslation } from "react-i18next";
import { Box, Container, MenuItem, Select } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useAuth } from "context/AuthContext";
import api from "api/axios";
import type { Tournament } from "types/models";
import { useSearchParams } from "react-router-dom";

const Profile: React.FC = () => {
  const [userCreatedTournaments, setUserCreatedTournaments] = useState<
    Tournament[]
  >([]);
  const { t } = useTranslation();
  const mobile = useMediaQuery("(max-width:600px)");
  const { userId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabTypes = ["info", "games", "points", "created_t"] as const;
  const defaultTab = "info";

  const currentTab = searchParams.get("tab") ?? defaultTab;
  useEffect(() => {
    if (currentTab === null || !tabTypes.some((tab) => tab === currentTab)) {
      setSearchParams((params) => {
        params.set("tab", defaultTab);
        return params;
      });
    }
  }, [currentTab]);

  const handleTabChange = (tab: string): void => {
    setSearchParams((params) => {
      params.set("tab", tab);
      return params;
    });
    sessionStorage.clear();
  };

  useEffect(() => {
    const fetchUserCreatedTournaments = async (): Promise<void> => {
      try {
        const tournamentsData = await api.tournaments.getAll();
        const filteredTournaments = tournamentsData.filter(
          (tournament) => tournament.creator.id === userId
        );
        setUserCreatedTournaments(filteredTournaments);
      } catch (error) {}
    };

    void fetchUserCreatedTournaments();
  }, [userId]);

  return (
    <Container sx={{ position: "relative", paddingBottom: "30px" }}>
      {/* If the device is mobile */}
      {mobile ? (
        <Fragment>
          <Select
            value={currentTab}
            onChange={(event) => {
              handleTabChange(event.target.value);
            }}
            style={{ marginBottom: "10px", alignItems: "center" }}
            sx={{
              border: "2px solid #db4744",
              fontSize: "20px",
              color: "#db4744"
            }}
          >
            <MenuItem value="info">{t("profile.profile_info")}</MenuItem>
            <MenuItem value="games">{t("profile.my_games")}</MenuItem>
            <MenuItem value="points">{t("profile.my_points")}</MenuItem>
            {userCreatedTournaments.length > 0 && (
              <MenuItem value="created_t">
                {t("profile.created_tournaments")}
              </MenuItem>
            )}
          </Select>
          <br></br>
        </Fragment>
      ) : (
        <Box
          style={{ display: "flex", alignItems: "center" }}
          sx={{ borderBottom: 1, borderColor: "divider", marginBottom: "10px" }}
        >
          {/* If the device is desktop */}
          <Tabs
            value={currentTab}
            onChange={(_, value) => {
              handleTabChange(value);
            }}
          >
            <Tab label={t("profile.profile_info")} value="info" />
            <Tab label={t("profile.my_games")} value="games" />
            <Tab label={t("profile.my_points")} value="points" />
            {userCreatedTournaments.length > 0 && (
              <Tab label={t("profile.created_tournaments")} value="created_t" />
            )}
          </Tabs>
        </Box>
      )}
      {currentTab === "info" && <ProfileInfo />}
      {currentTab === "games" && <ProfileGames />}
      {currentTab === "points" && <ProfilePoints />}
      {currentTab === "created_t" && <CreatedTournaments />}
    </Container>
  );
};

export default Profile;
