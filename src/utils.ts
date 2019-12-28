import { random, range } from "lodash";
import { flow, filter, curry, map } from "lodash/fp";
import { BallKinds, BallColors, ballColors } from "./App";

export const findRandomValueFromArray = <T>(values: T[]) =>
  flow(
    values => random(values.length - 1),
    index => values[index]
  )(values);

function canYouMoveHere() {
  return true;
}

function purifyBoard(board: BallKinds[]) {
  return flow(
    (board: BallKinds[]) => board,
    board => board.map((x, index) => (x.kind === "empty" ? index : undefined)),
    filter<number>(x => x !== undefined)
  )(board);
}

const findRandomIndexes = curry(
  (
    randomIndexesLength: number,
    result: number[],
    indexes: number[]
  ): number[] => {
    if (result.length === randomIndexesLength) {
      return result;
    }
    const [nextResult, nextindexes] = flow(
      (init: number[]) => findRandomValueFromArray(init),
      randomValue => [
        [...result, randomValue] as number[],
        indexes.filter(x => x !== randomValue) as number[]
      ]
    )(indexes);
    return findRandomIndexes(randomIndexesLength, nextResult, nextindexes);
  }
);

const applyRandomBallsOnBoard = curry(
  (
    cellType: BallKinds["kind"],
    board: BallKinds[],
    randomIndexes: { index: number; color: keyof BallColors }[]
  ) =>
    randomIndexes.reduce(
      (acc, next) => {
        acc[next.index] = { color: next.color, kind: cellType } as BallKinds;
        return acc;
      },
      [...board]
    )
);

export const setDefaultBoard = (ballsNumber: number) =>
  range(0, ballsNumber).map<BallKinds>(_ => ({
    kind: "empty"
  }));

const updateBoardWithBalls = curry(
  (
    randomBallsLength: number,
    colors: string[],
    cellType: "small" | "regular",
    board: BallKinds[]
  ) =>
    flow(
      (board: BallKinds[]) => board,
      purifyBoard,
      findRandomIndexes(randomBallsLength, []),
      map((index: number) => ({
        index,
        color: findRandomValueFromArray(colors)
      })),
      applyRandomBallsOnBoard(cellType, board)
    )([...board])
);

export const setInitialBoard = (
  size: number,
  randomBallsLength: number
): BallKinds[] =>
  flow(
    setDefaultBoard,
    updateBoardWithBalls(randomBallsLength, Object.keys(ballColors), "regular"),
    updateBoardWithBalls(randomBallsLength, Object.keys(ballColors), "small")
  )(size);

const turnSmallBallsIntoRegularOnes = (board: BallKinds[]): BallKinds[] =>
  board.map(x => (x.kind === "small" ? { ...x, kind: "regular" } : x));

export const updateBoardOnMove = (
  board: BallKinds[],
  id: number,
  randomBallsLength: number
) => {
  const [boardAfterClick, IsSecondClick] = boardOnNewMove(id, board);
  return IsSecondClick
    ? flow(
        turnSmallBallsIntoRegularOnes,
        updateBoardWithBalls(
          randomBallsLength,
          Object.keys(ballColors),
          "small"
        )
      )(boardAfterClick)
    : boardAfterClick;
};

const colorValues = { red: 0, orange: 0, blue: 0, green: 0, violet: 0 };
function isVerticalLine(board: BallKinds[], successNumber: number) {
  let isInRow = false;
  for (let index = 0; index < board.length; index++) {
    const up = range(4)
      .map((_, i) => board[index - successNumber * i])
      .filter(x => !!x)
      .reduce(
        (acc, next) => {
          if (next.kind === "regular") {
            acc[next.color] += 1;
            return acc;
          }
          return acc;
        },
        { ...colorValues }
      );
    if (Object.keys(up).includes(`${successNumber}`)) {
      isInRow = true;
      break;
    }
  }
  return isInRow;
}

const boardOnNewMove = curry((id: number, board: BallKinds[]): [
  BallKinds[],
  boolean
] => {
  const jumpyCellId = board.findIndex(x => x.kind === "jumpy");
  const firstSpot = board[jumpyCellId];
  const targetSpot = board[id];
  let IsSecondClick = false;
  const newBoard: BallKinds[] = board.map((x, index) => {
    if (index === id && x.kind === "regular") {
      return { color: x.color, kind: "jumpy" };
    }
    if (index === id && x.kind === "jumpy") {
      return { color: x.color, kind: "regular" };
    }
    if (targetSpot.kind === "regular" && x.kind === "jumpy") {
      return { color: x.color, kind: "regular" };
    }
    if (
      index === id &&
      (x.kind === "empty" || x.kind === "small") &&
      !!firstSpot &&
      firstSpot.kind === "jumpy" &&
      canYouMoveHere()
    ) {
      // TODO remove side-effect
      IsSecondClick = true;
      return { kind: "regular", color: firstSpot.color };
    }
    if (
      jumpyCellId === index &&
      x.kind === "jumpy" &&
      (targetSpot.kind === "empty" || targetSpot.kind === "small") &&
      canYouMoveHere()
    ) {
      return { kind: "empty" };
    }
    return x;
  });
  return [newBoard, IsSecondClick];
});
