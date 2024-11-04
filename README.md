# Kendo Tournament App

This document provides instructions for setting up the app, our development workflow, deployment guidelines and the use of the app.

## Table of contents
- [Starting the app](#how-to-start-the-app)


- [Development workflow](#development-workflow)
    - [Branching strategy](#branching-strategy)
    - [Commit Guidelines](#commit-guidelines)
    - [Pull Request (PR) Process](#pull-request-pr-process)
    - [Git Etiquette](#git-etiquette)
    - [Tools](#tools)


- [Deployment](#deployment)


- [Use](#use)
    - [Users](#users)
    - [Tournaments](#tournaments)
    - [Matches](#matches)


## How to Start the App

The project is divided into three main components: [Frontend](https://github.com/Kendoers/Kendo-tournament-app/tree/development/frontend), [Backend](https://github.com/Koodikukkaro/Kendo-tournament-app/tree/development/backend/server), and [Database](https://github.com/Kendoers/Kendo-tournament-app/tree/development/backend/database). Instructions for setting up each component are available in their respective README files.

## Development Workflow

This project follows a Git Workflow. For reference, you can check [this link](https://www.atlassian.com/git/tutorials/comparing-workflows), but the main idea is outlined below.

### Branching Strategy

We use a branch-based development workflow. Please follow these guidelines when creating branches:

* `main`: The main branch represents the production-ready code.
* `development`: The development branch is where feature branches are merged before going to production.
* Feature branches: Create a feature branch for each new feature or bug fix. Name it descriptively, such as `feature/add-authentication` or `bugfix/fix-broken-link`.

### Commit Guidelines

Follow these commit message guidelines:

* Use imperative verbs (e.g., "Add feature," "Fix bug," "Update documentation").
* Keep commits focused on a single task.

### Pull Request (PR) Process

1. Create a new branch for your feature or bug fix.
2. Commit changes.
3. Pull the latest changes to the development branch.
4. Merge the development branch into the new branch (while on your branch, run: _git merge development_).
5. Push.
6. Open a pull request from your branch to the `development` branch.
7. Ensure that your PR has a clear title and description.
8. Request code review from team members.

Example scenario with commands:
1. git checkout -b feature/example-feature  
2. _implement the feature, commit changes_
3. git checkout development
4. git pull
5. git checkout feature/example-feature
6. git merge development
7. git push

### Git Etiquette

* Avoid force pushing to shared branches (`main`, `develop`) unless necessary.
* Be mindful of the commit history; keep it clean and easy to follow.
* Use meaningful branch and commit messages.
* Communicate with team members to coordinate changes.

### Tools

* Docker Desktop

## Deployment

TODO: Add deployment instructions here.

## Use

The app is hosted on [app.kendoliiga.fi](app.kendoliiga.fi). 

The app consists of three main components: Users, Tournaments and Matches. 

### Users

To create or participate in tournaments, you need to create an account. The account creation requires some user data, i.e. name, email, phone number and dan rank. This data is used in the app (like names and rank) or by the tournament organizer to contact you regarding tournament participation (email and phone number). It is possible to change your data or delete your account fully in the profile section. The profile section also shows your matches in the "My games" tab to follow them easily and ippons in the "My points" tab to follow your progress.

You can follow the tournaments and matches without an account.

The available languages at the moment are Finnish and English. The language can be changed from the dropdown ("FI" or "EN") in the navigation bar. For developers: New languages can be added by creating new JSON files for them.

### Tournaments

To create a tournament, tournament name, place, time and description are required to input in the tournament creation form. There are also some dropdowns to choose other required data, like tournament type, match length, tournament category (hobby, championship or league) and the maximum number of participants. The input data depends a bit on the tournament type. 

After a tournament is created, it can be seen in the "upcoming tournaments" tab. The tournament creator can see the tournaments they have created in their profile, under the "created tournaments" tab. The tab will show only when the user has some created tournaments. This tab will have a more detailed list of the participants, with their emails and phone numbers, in case they need to be contacted. Every logged in user can sign up to the tournament with their profile data until the tournament starts. You can also see the details and other participants of the tournament by clicking the tournament card. As a tournament creator, it is possible to edit the tournament information or delete the tournament before it starts.

When the tournament starts, the matches are created automatically. By clicking the tournament card, you can see all the matches and the bracket or score table, depending on the tournament type. At this point, it's not possible to edit the tournament anymore. The tournament creator can withdraw a player from a tournament, for example if the player gets injured. This marks all their matches to losses and gives free wins to the opponents. 

The tournament listings can be sorted and filtered. There are sorters by names from A-Ö and Ö-A, time and location. The filters are by time, location, tournament type and tournament category.

There are four types of tournaments: Round robin, Playoff, Preliminary groups with playoff and Swiss. 

Round robin is where everyone plays against everyone. There are two tabs in the round robin view. In the score tab, you can see a table of all the participants' wins, losses, ties, points and ippons. On the matches tab, you can see all the matches sorted in upcoming, ongoing and past.

In playoff tournament, the participants are sorted in pairs randomly. The players in a pair play against each other and the winner advances to the next round, where new pairs are made from all the winners of the previous round. This is continued until there is only one match with one winner. There is only one view where you can see the bracket with the matches and the scores. If there is an odd number of players (not power of two) in a round, a random player gets a free win, so called "BYE". 

In a preliminary playoff, the first rounds of matches are a group stage. The amount of groups and the amount of players advancing from each group are specified when creating the tournament. Each participant plays against all the other participants in the same group. After all the group matches are finished, the specified amount of participants with the best scores advance to the playoff stage. The playoff stage is played similarly as the playoff tournament.

A swiss tournament consists of a certain number of rounds. The number of rounds is specified when creating the tournament. Each round every participant plays against someone with the same or as close as possible win-loss score. After all the rounds have been played, the winner is the one with the most points. There are two tabs: a table of all the participants' wins, losses, ties, points and ippons and a bracket showing the matches of each round.

In round robin, preliminary group stage and swiss, the points are accumulated so that each win gives 3 points and each tie 1 point.

### Matches

The matches for each tournament are generated automatically. You can navigate to the match view by clicking the match-up buttons (round robin and preliminary groups) or the match-up cards (playoff, preliminary playoff stage and swiss). Each match needs a point maker and a timekeeper before it's possible to start the match. To sign up for these roles, click the "Select role as an official" button. The timekeeper handles the timer and they are the only person who can see the "Start" button to start the timer. The point maker is the only one who can add points by clicking the "Add point for player x" button. They can also modify or delete the recent point they have assigned, were any mistakes to happen. If a match was started accidentally, the tournament creator can reset the match so that the timer and points are both reset to zero.

The match ends after any of the players gets two points. If the timer meets the set length of the match (three, four or five minutes), the player with more points wins. If the points are even at this point, the match ends in a tie (round robin, preliminary groups, swiss) or an overtime starts (playoff, preliminary playoff stage). Overtime is played as long as one player makes a point and wins.
