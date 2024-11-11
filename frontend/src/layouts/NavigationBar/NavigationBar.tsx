import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import LanguageSwitcher from "./LanguageSwitcher";
import Menu from "@mui/material/Menu";
import MenuIcon from "@mui/icons-material/Menu";
import HelpIcon from "@mui/icons-material/Help";
import NavigationDrawer from "./NavigationDrawer";
import NavigationUserMenu from "./NavigationUserMenu";
import LogoButton from "./LogoButton";
import { MenuItem, useMediaQuery } from "@mui/material";
import type { NavigationData, NavigationItem } from "./navigation-bar";
import { ProfileNavItems } from "./profile-navigation";
import routePaths from "routes/route-paths";
import { useAuth } from "context/AuthContext";

interface Props {
  window?: () => Window;
  settings: NavigationData;
  navigationItems: NavigationData;
}

const APP_NAME = "KendoApp";

const NavigationBar: React.FC<Props> = (props) => {
  const { window, navigationItems } = props;
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const { t } = useTranslation();

  const container =
    window !== undefined ? () => window().document.body : undefined;
  const [openDrawer, setOpenDrawer] = React.useState<boolean>(false);
  const toggleDrawer = (): void => {
    setOpenDrawer((prevState) => !prevState);
  };

  const isMobile = useMediaQuery("(max-width:650px)");

  const handleButtonClick = async (
    navigationItem: NavigationItem
  ): Promise<void> => {
    if (navigationItem.link === routePaths.logout) {
      await logout();
    }
    navigate(navigationItem.link);
  };

  const handleHelpButton = (): void => {
    navigate(routePaths.help);
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          height: isMobile ? "44px" : "64px",
          minHeight: isMobile ? "44px" : "64px"
        }}
      >
        <CssBaseline />
        <AppBar
          position="static"
          component="nav"
          sx={{
            height: "100%",
            justifyContent: "center"
          }}
        >
          <Container maxWidth="xl">
            <Toolbar
              disableGutters
              sx={{
                height: isMobile ? "44px" : "64px",
                alignItems: "center"
              }}
            >
              {isMobile ? (
                <Box sx={{ flexGrow: 1, display: "flex" }}>
                  <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={toggleDrawer}
                    sx={{ display: "block" }}
                  >
                    <MenuIcon />
                  </IconButton>
                </Box>
              ) : (
                <LogoButton logoName={APP_NAME} />
              )}
              <Box
                sx={{
                  display: isMobile ? "none" : "inline-flex",
                  flexGrow: 1,
                  justifyContent: "flex-end",
                  gap: "20px",
                  marginRight: "20px",
                  alignItems: "center"
                }}
              >
                {navigationItems.map((item) => (
                  <Button
                    key={item.text}
                    sx={{ color: "#fff", fontSize: "13px" }}
                    onClick={async () => {
                      await handleButtonClick(item);
                    }}
                  >
                    {item.text}
                  </Button>
                ))}
                {isAuthenticated && (
                  <Button
                    sx={{ color: "#fff", marginRight: 2, fontSize: "13px" }}
                    onMouseEnter={(event) => {
                      setAnchorEl(event.currentTarget);
                    }}
                    aria-controls={open ? "profile-dropdown" : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? "true" : undefined}
                  >
                    {t("navigation.profile")}
                  </Button>
                )}
                <Menu
                  id="profile-dropdown"
                  anchorEl={anchorEl}
                  open={open}
                  onClose={() => {
                    setAnchorEl(null);
                  }}
                  MenuListProps={{
                    "aria-labelledby": "test",
                    onMouseEnter: () => {
                      setAnchorEl(anchorEl);
                    },
                    onMouseLeave: () => {
                      setAnchorEl(null);
                    }
                  }}
                >
                  {ProfileNavItems.map((item) => (
                    <MenuItem
                      key={item.text}
                      onClick={() => {
                        setAnchorEl(null);
                        navigate(`/profile?tab=${item.tab}`);
                      }}
                      sx={{ fontSize: "13px" }}
                    >
                      {t(item.text)}
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
              <LanguageSwitcher />
              <IconButton
                color="inherit"
                aria-label="help page"
                onClick={handleHelpButton}
              >
                <HelpIcon />
              </IconButton>
              {isAuthenticated && (
                <NavigationUserMenu settings={props.settings} />
              )}
            </Toolbar>
          </Container>
        </AppBar>
      </Box>
      {isMobile && (
        <NavigationDrawer
          container={container}
          toggleDrawer={toggleDrawer}
          drawerIsOpen={openDrawer}
          navigationItems={navigationItems}
          drawerTitle={APP_NAME}
        />
      )}
    </>
  );
};

export default NavigationBar;
