import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import { range } from "lodash";
import { findRandomColor, findUniqueIndex } from "./utils";

export const ballColors = {
  red: "#9e0808",
  orange: "#ffd500",
  blue: "#0059ff",
  green: "#00ffc3",
  violet: "#8930e3"
} as const;

type BallColors = typeof ballColors;

type CellType = {
  color: keyof BallColors;
};

type BallKinds =
  | (({ kind: "regular" } | { kind: "small" } | { kind: "jumpy" }) & CellType)
  | { kind: "empty" };

const vibrate = keyframes`
  0% {transform: scale(1);}
  50%  {transform: scale(0.95);}
  100% {transform: scale(1);}
`;

const RegularBall = styled.div<CellType>`
  background-color: ${({ color }) => ballColors[color]};
  width: 100%;
  height: 100%;
  border-radius: 50%;
`;

const SmallBall = styled(RegularBall)`
  width: 10%;
  height: 10%;
`;

const JumpyBall = styled(RegularBall)`
  animation: ${vibrate} 1s infinite;
`;

const Ball: React.FC<{ cell: BallKinds; onClick: () => void }> = ({ cell }) => {
  switch (cell.kind) {
    case "jumpy":
      return <JumpyBall color={cell.color} />;
    case "regular":
      return <RegularBall color={cell.color} />;
    case "small":
      return <SmallBall color={cell.color} />;
    case "empty":
      return null;
  }
};

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Cell = styled.div`
  width: 9vmin;
  height: 9vmin;
  border: 1px solid silver;
`;

const Board = styled.div`
  width: 100vmin;
  height: calc(100vmin - 2px);
  border: 1px solid silver;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-evenly;
`;

export const setInitBoard = (
  ballsNumber: number,
  randomBallsLength: number,
  colors: string[]
) => {
  const initialBoard = range(0, ballsNumber).map<BallKinds>(_ => ({
    kind: "empty"
  }));

  const randomBoardIndexes = range(0, randomBallsLength)
    .reduce((acc, _) => {
      const value = findUniqueIndex(acc, ballsNumber - 1);
      acc.push(value);
      return acc;
    }, [] as number[])
    .map(
      index =>
        ({ index, color: findRandomColor(colors) } as {
          index: number;
          color: keyof BallColors;
        })
    )
    .reduce((acc, next) => {
      acc[next.index] = { color: next.color, kind: "regular" };
      return acc;
    }, initialBoard);
  return randomBoardIndexes;
};

const App: React.FC = () => {
  const size = 10;
  const randomBallsLength = 3;
  console.log(
    setInitBoard(10, 3, ["red", "orange", "blue", "green", "violet"])
  );
  const [board, setBoard] = useState(
    setInitBoard(size * size, randomBallsLength, Object.keys(ballColors))
  );
  const handleMouseClick = (id: number) => () => {
    const jumpyCellId = board.findIndex(x => x.kind === "jumpy");
    const a: BallKinds[] = board.map((x, index, array) => {
      if (index === id && x.kind === "regular") {
        return { color: x.color, kind: "jumpy" };
      }
      if (index === id && x.kind === "jumpy") {
        return { color: x.color, kind: "regular" };
      }
      if (array[id].kind === "regular" && x.kind === "jumpy") {
        return { color: x.color, kind: "regular" };
      }
      if (
        index === id &&
        (x.kind === "empty" || x.kind === "small") &&
        jumpyCellId !== -1
      ) {
        return array[jumpyCellId];
      }
      if (
        jumpyCellId === index &&
        x.kind === "jumpy" &&
        (array[id].kind === "empty" || array[id].kind === "small")
      ) {
        return { kind: "empty" };
      }
      return x;
    });
    setBoard(a);
  };

  return (
    <Container>
      <Board>
        {board.map((cell, index) => (
          <Cell key={index}>
            {<Ball onClick={handleMouseClick(index)} cell={cell} />}
          </Cell>
        ))}
      </Board>
    </Container>
  );
};

export default App;
