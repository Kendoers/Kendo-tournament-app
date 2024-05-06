import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { useTournament } from "context/TournamentContext";
import React, { useEffect, useState } from "react";
import MatchDroppable from "./MatchDroppable";
import PlayerDraggable from "./PlayerDraggable";
import api from "api/axios";
import { type PlayerPair } from "types/requests";
import { Button } from "@mui/material";
import { useAuth } from "context/AuthContext";
import useToast from "hooks/useToast";
import { useTranslation } from "react-i18next";

const UpdateMatchPairsView: React.FC = () => {
  const { matchSchedule, players } = useTournament();
  const tournament = useTournament();
  const user = useAuth();
  const showToast = useToast();
  const { t } = useTranslation();

  if (user === null || user.userId !== tournament.creator.id) {
    return;
  }

  const [pairs, setPairs] = useState<Record<string, [string, string]>>({});

  useEffect(() => {
    const initialPairs: Record<string, [string, string]> = {};
    let byes = 0;
    matchSchedule.forEach((match) => {
      const playerIds = match.players.map((player) => player.id);
      if (playerIds[1] != null) {
        initialPairs[match.id] = [playerIds[0], playerIds[1]];
      } else {
        initialPairs[match.id] = [playerIds[0], `bye-${byes}`];
        byes++;
      }
    });
    setPairs(initialPairs);
  }, [matchSchedule]);

  const handleConfirm = async (): Promise<void> => {
    const playerPairs: PlayerPair[] = Object.values(pairs).map(
      ([first, second]) => {
        if (second.startsWith("bye-")) {
          return { firstPlayerId: first };
        } else {
          return { firstPlayerId: first, secondPlayerId: second };
        }
      }
    );

    try {
      await api.tournaments.updatePairs(tournament.id, {
        pairs: playerPairs,
        creatorId: user.userId ?? ""
      });
      showToast(t("messages.pairs_updated"), "success");
    } catch (error) {
      showToast(error, "error");
      console.error("Failed to update pairs", error);
    }
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (over == null) return;

    const firstPlayer = active.id.toString();
    const data = active.data.current;
    if (data == null) return;

    const firstMatchId = data.matchId;
    const firstIndex = Number(data.slotIndex);

    const overIdParts = over.id.toString().split("-"); // format: "{matchId}-{slotNumber}" (slotNumber is 0 or 1)
    const secondMatchId = overIdParts[0];
    const secondIndex = Number(overIdParts[1]);

    const secondPlayer = pairs[secondMatchId][secondIndex];

    // Checks for byes which should always go in the second slot
    const getFinalSlots = (first: string, second: string): [string, string] => {
      if (first.startsWith("bye-")) return [second, first];
      else if (second.startsWith("bye-")) return [first, second];
      return [first, second];
    };

    // Update the pairs for both matches and set possible byes to the lower slots
    const firstPair = [...pairs[firstMatchId]];
    const secondPair = [...pairs[secondMatchId]];

    // Proceed with modifications
    firstPair[firstIndex] = secondPlayer;
    const firstRes = getFinalSlots(firstPair[0], firstPair[1]);

    secondPair[secondIndex] = firstPlayer;
    const secondRes = getFinalSlots(secondPair[0], secondPair[1]);

    if (
      (firstPair[0].startsWith("bye-") && firstPair[1].startsWith("bye-")) ||
      (secondPair[0].startsWith("bye-") && secondPair[1].startsWith("bye-")) ||
      firstPair[0] === firstPair[1] ||
      secondPair[0] === secondPair[1]
    ) {
      // not allowed
    } else {
      setPairs((prev) => ({
        ...prev,
        [firstMatchId]: firstRes,
        [secondMatchId]: secondRes
      }));
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div>
        <Button variant="outlined" onClick={handleConfirm}>
          {t("buttons.confirm_button")}
        </Button>
        {Object.entries(pairs).map(([matchId, playerIds]) => (
          <MatchDroppable key={matchId} matchId={matchId}>
            <PlayerDraggable
              key={playerIds[0]}
              playerId={playerIds[0]}
              playerName={
                players.find((player) => player.id === playerIds[0])
                  ?.firstName ?? "BYE"
              }
              matchId={matchId}
              slotIndex={0}
            />
            <PlayerDraggable
              key={playerIds[1]}
              playerId={playerIds[1]}
              playerName={
                players.find((player) => player.id === playerIds[1])
                  ?.firstName ?? "BYE"
              }
              matchId={matchId}
              slotIndex={1}
            />
          </MatchDroppable>
        ))}
      </div>
    </DndContext>
  );
};

export default UpdateMatchPairsView;
