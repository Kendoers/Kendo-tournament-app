import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { useTournament } from "context/TournamentContext";
import React, { useEffect, useState } from "react";
import PlayerDraggable from "./PlayerDraggable";
import api from "api/axios";
import { Button, Typography } from "@mui/material";
import GroupDroppable from "./GroupDroppable";
import { useAuth } from "context/AuthContext";
import { useTranslation } from "react-i18next";
import useToast from "hooks/useToast";

const UpdateGroupsView: React.FC = () => {
  const { players } = useTournament();
  const tournament = useTournament();
  const user = useAuth();
  const { t } = useTranslation();
  const showToast = useToast();

  if (user === null || user.userId !== tournament.creator.id) {
    return;
  }

  const [groups, setGroups] = useState<string[][]>([]);

  useEffect(() => {
    if (tournament.groups !== null) {
      setGroups(tournament.groups ?? []);
    }
  }, [tournament.groups]);

  const handleConfirm = async (): Promise<void> => {
    try {
      await api.tournaments.updateGroups(tournament.id, {
        groups,
        creatorId: user.userId ?? ""
      });
    } catch (error) {
      showToast(error, "error");
      console.error("Failed to update pairs", error);
    }
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (over == null) return;

    // const firstPlayer = active.id.toString();
    const data = active.data.current;
    if (data == null) return;

    const firstGroupId = Number(data.matchId);
    const firstPlayerIndex = Number(data.slotIndex);

    const overIdParts = over.id.toString().split("-"); // format: "{slotIndex}-{playerIndex}"
    const secondGroupId = Number(overIdParts[0]);
    const secondPlayerIndex = Number(overIdParts[1]);

    const firstPlayer = groups[firstGroupId][firstPlayerIndex];
    const secondPlayer = groups[secondGroupId][secondPlayerIndex];

    const firstGroup = [...groups[firstGroupId]];
    const secondGroup = [...groups[secondGroupId]];

    firstGroup[firstPlayerIndex] = secondPlayer;

    // switching players inside a group
    if (firstGroupId === secondGroupId) {
      firstGroup[secondPlayerIndex] = firstPlayer;
    } else {
      secondGroup[secondPlayerIndex] = firstPlayer;
    }

    setGroups((groups) =>
      groups.map((group, index) => {
        if (index === firstGroupId) {
          return firstGroup;
        }
        if (index === secondGroupId) {
          return secondGroup;
        }
        return group;
      })
    );
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div>
        <Button variant="outlined" onClick={handleConfirm}>
          Confirm
        </Button>
        {groups.map((group, groupIndex) => (
          <div key={groupIndex}>
            <Typography variant="h5">{`${t("tournament_view_labels.group")} ${
              groupIndex + 1
            }`}</Typography>
            <GroupDroppable
              key={groupIndex}
              groupIndex={groupIndex}
              groupSize={group.length}
            >
              {group.map((playerId, index) => {
                const player = players.find((p) => p.id === playerId);
                return (
                  <PlayerDraggable
                    key={playerId}
                    playerId={playerId}
                    playerName={
                      player != null
                        ? player.firstName + " " + player.lastName
                        : "Unknown Player"
                    }
                    matchId={groupIndex.toString()}
                    slotIndex={index}
                  />
                );
              })}
            </GroupDroppable>
          </div>
        ))}
      </div>
    </DndContext>
  );
};

export default UpdateGroupsView;
