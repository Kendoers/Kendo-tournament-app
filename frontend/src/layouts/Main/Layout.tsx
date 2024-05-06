import Footer from "layouts/Footer/Footer";
import NavigationBar from "layouts/NavigationBar/NavigationBar";
import {
  authenticatedNavItems,
  unAuthenticatedNavItems,
  settings
} from "layouts/NavigationBar/navigation-data";
import React, { type ReactElement } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams
} from "react-router-dom";
import "./Layout.css";
import { useAuth } from "context/AuthContext";
import Container from "@mui/material/Container";
import { ArrowBack } from "@mui/icons-material";
import { Button, Typography } from "@mui/material";
import routePaths from "routes/route-paths";
import { useTranslation } from "react-i18next";

const Layout = (): ReactElement => {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const defaultTab = routePaths.homeRoute;
  const [, setSearchParams] = useSearchParams();

  const navigationItems = isAuthenticated
    ? authenticatedNavItems
    : unAuthenticatedNavItems;

  const translantedSettings = settings.map((item) => ({
    ...item,
    text: t(item.text)
  }));

  const translantedNavItems = navigationItems.map((item) => ({
    ...item,
    text: t(item.text)
  }));

  const handleGoBackWithParams = (): void => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get("tab");

    if (
      // Define tabs, from which app needs to go to frontpage
      tabParam !== null &&
      [
        "scoreboard",
        "matches",
        "preliminary",
        "playoff",
        "info",
        "games",
        "points",
        "created_t"
      ].includes(tabParam)
    ) {
      setSearchParams((params) => {
        params.set("tab", defaultTab);
        return params;
      });
      navigate("/");
    } else if (location.pathname === "/profile") {
      // If tabParam is null and location is on the profile page, navigate to the front page ("/")
      setSearchParams((params) => {
        params.set("tab", defaultTab);
        return params;
      });
      navigate("/");
    } else {
      // Otherwise navigate back to the previous page in browser history
      navigate(-1);
    }
  };

  return (
    <div className="app-wrapper">
      <NavigationBar
        navigationItems={translantedNavItems}
        settings={translantedSettings}
      />
      <Container className="app-container">
        {pathname !== routePaths.homeRoute && (
          <Button
            id="back-button"
            onClick={() => {
              handleGoBackWithParams();
            }}
            sx={{ display: "flex", gap: "5px", marginBottom: "6px" }}
          >
            <ArrowBack />
            <Typography>{t("navigation.back")}</Typography>
          </Button>
        )}
        <Outlet />
      </Container>
      <Footer />
    </div>
  );
};

export default Layout;
