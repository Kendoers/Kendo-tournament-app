import React, { type CSSProperties, type ReactElement } from "react";
import { useDroppable } from "@dnd-kit/core";

interface GroupDroppableProps {
  groupIndex: number;
  children: ReactElement[];
  groupSize: number;
}

const GroupDroppable: React.FC<GroupDroppableProps> = ({
  groupIndex,
  children,
  groupSize
}) => {
  const slots = Array.from({ length: groupSize }, (_, index) => {
    const { isOver, setNodeRef } = useDroppable({
      id: `${groupIndex}-${index}`
    });

    const style: CSSProperties = {
      color: isOver ? "green" : "black",
      padding: "5px",
      border: "0px",
      margin: "5px",
      minHeight: "50px"
    };

    return (
      <div key={index} ref={setNodeRef} style={style}>
        {children[index]}
      </div>
    );
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        border: "2px solid gray",
        marginBottom: "25px",
        alignItems: "left"
      }}
    >
      {slots}
    </div>
  );
};

export default GroupDroppable;
