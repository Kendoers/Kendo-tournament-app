import React from "react";
import { NavLink } from "react-router-dom";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import routePaths from "routes/route-paths";

interface Props {
  logoName: string;
}

const LogoButton: React.FC<Props> = (props) => {
  return (
    <Box>
      <IconButton
        component={NavLink}
        to={routePaths.homeRoute}
        sx={{ color: "#fff" }}
      >
        {/* Optionally, add an icon here if needed */}
        <Typography
          variant="h6"
          sx={{ color: "#fff", fontWeight: "bold", fontSize: "20px" }}
        >
          {props.logoName}
        </Typography>
      </IconButton>
    </Box>
  );
};

export default LogoButton;
