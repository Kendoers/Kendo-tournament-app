import React from "react";
import { useDraggable } from "@dnd-kit/core";

interface PlayerDraggableProps {
  playerId: string;
  playerName: string;
  matchId: string;
  slotIndex: number;
}

const PlayerDraggable: React.FC<PlayerDraggableProps> = (props) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: props.playerId,
    data: {
      matchId: props.matchId,
      slotIndex: props.slotIndex
    }
  });

  const style = {
    transform:
      transform != null
        ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
        : undefined,
    cursor: "grab",
    padding: "5px",
    border: "1px solid black",
    backgroundColor: "white",
    display: "inline-block"
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {props.playerName}
    </div>
  );
};

export default PlayerDraggable;
