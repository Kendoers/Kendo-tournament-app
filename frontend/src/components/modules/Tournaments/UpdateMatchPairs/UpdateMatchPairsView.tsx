/* eslint-disable */
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { useTournament } from "context/TournamentContext";
import React, { useEffect, useState } from "react";
import MatchDroppable from "./MatchDroppable";
import PlayerDraggable from "./PlayerDraggable";

const UpdateMatchPairsView: React.FC = () => {
    const { id, matchSchedule, players } = useTournament();
    const [pairs, setPairs] = useState<{ [matchId: string]: [string, string] }>({});
  
    useEffect(() => {
      const initialPairs: { [matchId: string]: [string, string] } = {};
      let byes = 0;
      matchSchedule.forEach(match => {
        const playerIds = match.players.map(player => player.id);
        if(playerIds[1] != null) {
            initialPairs[match.id] = [playerIds[0], playerIds[1]];
        }
        else {
            initialPairs[match.id] =  [playerIds[0], `bye-${byes}`]
            byes++;
        }
        
      });
      setPairs(initialPairs);
    }, [matchSchedule]);
  
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;
    
        const firstPlayer = active.id.toString();
        const data = active.data.current;
        if (data == null) return;
    
        const firstMatchId = data.matchId;
        const firstIndex = Number(data.slotIndex);
    
        const overIdParts = over.id.toString().split('-'); // format: "{matchId}-{slotNumber}" (slotNumber is 0 or 1)
        const secondMatchId = overIdParts[0];
        const secondIndex = Number(overIdParts[1]);
    
        const secondPlayer = pairs[secondMatchId]?.[secondIndex] || "";

        //dont do anything if trying to match two byes together
        //if(firstPlayer.startsWith("bye-") && secondPlayer.startsWith("bye-")) return;
    
        // Check for byes which should always go in the second slot
        const getFinalSlots = (first: string, second: string): [string, string] => {
            if (first.startsWith("bye-")) return [second, first];
            else if (second.startsWith("bye-")) return [first, second];
            return [first, second];
        };
    
        // Update the pairs for both matches and set possible byes to the lower slots
        let firstPair = pairs[firstMatchId];
        firstPair[firstIndex] = secondPlayer;
        firstPair = getFinalSlots(...firstPair)

        let secondPair = pairs[secondMatchId];
        secondPair[secondIndex] = firstPlayer;
        secondPair = getFinalSlots(...secondPair);
        
        setPairs(prev => ({
            ...prev,
            [firstMatchId]: firstPair,
            [secondMatchId]: secondPair
        }))
    };
    
      

    return (
        <DndContext onDragEnd={handleDragEnd}>
          <div>UPDATE PAIRS FOR TOURNEY {id}</div>
          <div>
            {Object.entries(pairs).map(([matchId, playerIds]) => (
              <MatchDroppable key={matchId} matchId={matchId}>
                <PlayerDraggable
                  key={playerIds[0]}
                  playerId={playerIds[0]}
                  playerName={
                    players.find((player) => player.id === playerIds[0])?.firstName || "BYE"
                  }
                  matchId={matchId}
                  slotIndex={0}
                />
                <PlayerDraggable
                key={playerIds[1]}
                playerId={playerIds[1]}
                playerName={
                    players.find((player) => player.id === playerIds[1])?.firstName || "BYE"
                }
                matchId={matchId}
                slotIndex={1}
                />
              </MatchDroppable>
            ))}
          </div>
        </DndContext>
      );
    }

export default UpdateMatchPairsView;
