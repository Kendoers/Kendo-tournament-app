import React, { type CSSProperties, type ReactElement } from "react";
import { useDroppable } from "@dnd-kit/core";

interface MatchDroppableProps {
  matchId: string;
  children: ReactElement[];
}

const MatchDroppable: React.FC<MatchDroppableProps> = (
  props: MatchDroppableProps
) => {
  // Use separate useDroppable hooks for each slot with unique IDs
  const { isOver: isOverSlot1, setNodeRef: setNodeRefSlot1 } = useDroppable({
    id: `${props.matchId}-0`
  });
  const { isOver: isOverSlot2, setNodeRef: setNodeRefSlot2 } = useDroppable({
    id: `${props.matchId}-1`
  });

  const style = (isOver: boolean): CSSProperties => ({
    color: isOver ? "green" : "black",
    padding: "5px",
    border: "1px",
    margin: "5px",
    minHeight: "50px"
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        border: "2px solid gray",
        alignItems: "left"
      }}
    >
      {/* Slot 1 */}
      <div ref={setNodeRefSlot1} style={style(isOverSlot1)}>
        <div style={{ marginBottom: "5px" }}>{props.children[0]}</div>
      </div>

      <div
        style={{
          fontSize: "18px",
          fontWeight: "bold",
          padding: "0px 0px 0px 25px",
          borderRadius: "5px",
          background: "lightgray",
          width: "70px",
          marginLeft: "10px"
        }}
      >
        vs
      </div>

      {/* Slot 2 */}
      <div ref={setNodeRefSlot2} style={style(isOverSlot2)}>
        <div style={{ marginBottom: "5px" }}>{props.children[1]}</div>
      </div>
    </div>
  );
};

export default MatchDroppable;
