import React from "react";
import { NavLink } from "react-router-dom";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";

import type { NavigationItem, NavigationData } from "./navigation-bar";

interface Props {
  container: (() => HTMLElement) | undefined;
  toggleDrawer: () => void;
  drawerIsOpen: boolean;
  navigationItems: NavigationData;
  drawerTitle: string;
}

const NavigationDrawer: React.FC<Props> = (props) => {
  const {
    toggleDrawer,
    drawerIsOpen,
    container,
    navigationItems,
    drawerTitle
  } = props;

  const drawer = (
    <Box
      onClick={toggleDrawer}
      sx={{ textAlign: "center", bgcolor: "#DB4744", height: "100%" }}
    >
      {/* Drawer Title */}
      <Typography
        variant="h6"
        sx={{ color: "#fff", padding: "16px", fontWeight: "bold" }}
      >
        {drawerTitle}
      </Typography>
      <Divider sx={{ bgcolor: "#FF6B6B" }} /> {/* Slightly lighter divider */}
      {/* Navigation List */}
      <List>
        {navigationItems.map((item: NavigationItem) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={NavLink}
              to={item.link}
              sx={{
                textAlign: "center",
                color: "#fff",
                "&.active": {
                  bgcolor: "#B83B39" // Darker shade for active
                },
                "&:hover": {
                  bgcolor: "#C84B4A" // Slightly darker for hover effect
                }
              }}
            >
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{ fontSize: "1rem", color: "#fff" }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <nav>
      <Drawer
        container={container}
        variant="temporary"
        open={drawerIsOpen}
        onClose={toggleDrawer}
        ModalProps={{
          keepMounted: true // Better open performance on mobile.
        }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: 280,
            bgcolor: "#DB4744", // Main drawer background color
            color: "#fff",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)"
          }
        }}
      >
        {drawer}
      </Drawer>
    </nav>
  );
};

export default NavigationDrawer;
