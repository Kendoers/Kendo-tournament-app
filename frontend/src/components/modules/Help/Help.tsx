import React from "react";
import { Link, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const Help: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="app-container">
      <main className="main-content">
        <Typography variant="h3">{t("help.title")}</Typography>
        <br></br>
        <Typography>{t("help.about")}</Typography>
        <br></br>
        <Typography variant="h4">{t("help.users")}</Typography>
        <br></br>
        <Typography>{t("help.users1")}</Typography>
        <br></br>
        <Typography>{t("help.users2")}</Typography>
        <br></br>
        <Typography>{t("help.users3")}</Typography>
        <br></br>
        <Typography variant="h4">{t("help.tournaments")}</Typography>
        <br></br>
        <Typography>{t("help.tournaments1")}</Typography>
        <br></br>
        <Typography>{t("help.tournaments2")}</Typography>
        <br></br>
        <Typography>{t("help.tournaments3")}</Typography>
        <br></br>
        <Typography>{t("help.tournaments4")}</Typography>
        <br></br>
        <Typography>{t("help.tournaments5")}</Typography>
        <br></br>
        <Typography>{t("help.tournaments6")}</Typography>
        <br></br>
        <Typography>{t("help.tournaments7")}</Typography>
        <br></br>
        <Typography>{t("help.tournaments8")}</Typography>
        <br></br>
        <Typography>{t("help.tournaments9")}</Typography>
        <br></br>
        <Typography>{t("help.tournaments10")}</Typography>
        <br></br>
        <Typography variant="h4">{t("help.matches")}</Typography>
        <br></br>
        <Typography>{t("help.matches1")}</Typography>
        <br></br>
        <Typography>{t("help.matches2")}</Typography>
        <br></br>
        <Typography variant="h4">{t("help.bugs")}</Typography>
        <br></br>
        <Typography>
          {t("help.bugs1")}
          <Link
            href="https://github.com/Kendoers/Kendo-tournament-app/issues"
            target="_blank"
          >
            {t("help.bugs_link")}
          </Link>
        </Typography>
      </main>
    </div>
  );
};

export default Help;
