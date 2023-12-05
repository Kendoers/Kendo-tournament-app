import React, { useEffect, useState } from "react";
import { Table, TableBody, TableRow, TableCell } from "@mui/material";
import type { PointType } from "types/models";
import { type matchData } from "./GameInterface";

interface TableComponentProps {
  matchInfo: matchData;
}
interface Cells {
  rows: string[][];
}

const PointTable: React.FC<TableComponentProps> = ({ matchInfo }) => {
  const initialCells: Cells = {
    rows: [
      ["", ""],
      ["", ""],
      ["", ""],
      ["", ""],
      ["", ""]
    ]
  };

  const [cells, setCells] = useState<Cells>(initialCells);
  let rowCounter = 0;
  let column = 0;
  const allPoints: Array<{ color: string; time: Date; value: string }> = [];

  const typeToButtonMap: Record<PointType, string> = {
    men: "M",
    kote: "K",
    do: "D",
    tsuki: "T",
    hansoku: "\u0394"
  };

  useEffect(() => {
    goThroughAllPoints();
  }, [matchInfo]);

  const goThroughAllPoints = (): void => {
    for (const player of matchInfo.players) {
      for (const point of player.points) {
        const color: string = player.color;
        const time: Date = point.timestamp;
        const value: string = typeToButtonMap[point.type];

        allPoints.push({ color, time, value });
      }
    }

    allPoints.sort((a, b) => (a.time < b.time ? -1 : 1));
    assignCells();
  };

  const assignCells = (): void => {
    for (const point of allPoints) {
      column = point.color === "white" ? 0 : 1;
      updateCell(rowCounter, column, point.value);
      rowCounter++;
    }
  };

  const updateCell = (row: number, column: number, value: string): void => {
    setCells((prevCells) => {
      const newRows = [...prevCells.rows];
      newRows[row][column] = value;
      return { rows: newRows };
    });
  };

  return (
    <div className="tableContainer">
      <Table>
        <TableBody>
          {cells.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, columnIndex) => (
                <TableCell key={columnIndex}>
                  {rowIndex === 0 && cell !== "" ? ( // Check if it's the first cell
                    <CircledLetter letter={cell} />
                  ) : (
                    cell
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
