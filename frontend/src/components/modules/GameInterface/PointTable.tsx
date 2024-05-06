import React, { useEffect, useState } from "react";
import { Table, TableBody, TableRow, TableCell } from "@mui/material";
import type { PointType } from "types/models";
import { type MatchData } from "./GameInterface";

interface TableComponentProps {
  matchInfo: MatchData;
}
interface Cell {
  value: string;
  filled: boolean;
}

const PointTable: React.FC<TableComponentProps> = ({ matchInfo }) => {
  // Initialize the table with 5 rows and 2 columns, all cells empty initially
  const initialCells: Cell[][] = Array(5)
    .fill(null)
    .map(() => Array(2).fill({ value: "", filled: false }));

  const [cells, setCells] = useState<Cell[][]>(initialCells);

  const typeToButtonMap: Record<PointType, string> = {
    men: "M",
    kote: "K",
    do: "D",
    tsuki: "T",
    hansoku: "\u0394"
  };

  useEffect(() => {
    const allPoints: Array<{ color: string; time: Date; value: string }> = [];

    matchInfo.players.forEach((player) => {
      player.points.forEach((point) => {
        const color: string = player.color;
        const time: Date = point.timestamp;
        const value: string = typeToButtonMap[point.type];

        if (!allPoints.some((existingPoint) => existingPoint.time === time)) {
          allPoints.push({ color, time, value });
        }
      });
    });

    allPoints.sort((a, b) => (a.time < b.time ? -1 : 1));

    // Create a new state for the cells based on the sorted points
    const newCells = initialCells.map((row) => [...row]); // Clone the initial structure
    allPoints.forEach((point, index) => {
      if (index < 5) {
        // Ensure we don't exceed the table size
        const column = point.color === "white" ? 0 : 1;
        newCells[index][column] = { value: point.value, filled: true };
      }
    });

    setCells(newCells);
  }, [matchInfo]);

  return (
    <div className="tableContainer">
      <Table>
        <TableBody>
          {cells.map((row, rowIndex) => (
            <TableRow key={rowIndex} style={{ height: "75px" }}>
              {row.map((cell, columnIndex) => (
                <TableCell key={columnIndex}>
                  {cell.filled ? (
                    rowIndex === 0 ? (
                      <CircledLetter letter={cell.value} />
                    ) : (
                      cell.value
                    )
                  ) : (
                    ""
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
interface CircledLetterProps {
  letter: string;
}

const CircledLetter: React.FC<CircledLetterProps> = ({ letter }) => {
  const circleStyle = {
    display: "inline-block",
    borderRadius: "50%",
    border: "1px solid black",
    padding: "10px"
  };

  return <span style={circleStyle}>{letter}</span>;
};

export default PointTable;
