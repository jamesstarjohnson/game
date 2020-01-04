import { random, range } from "lodash";
import { flow, filter, curry, map } from "lodash/fp";
import { BallColors, Board, BallKind, ballColors, BoardRecord } from "./types";
// interface Pipe {
//   <F, S, T>(f: (a: F) => Readonly<T>, f1: (a: T) => S): (x: F) => S;
//   <F, S, T, L>(f: (a: F) => Readonly<T>, f1: (a: T) => S, f2: (a: S) => L): (
//     x: F
//   ) => L;
// }
type Pipe = <F, S, T>(f: (a: F) => Readonly<T>, f1: (a: T) => S) => (x: F) => S;

const pipe: Pipe = (f, f1) => x => f1(f(x));

const get = <T>(array: readonly T[], index: number): T | undefined =>
  array[index];

export const findRandomValueFromArray = <T>(values: T[]) =>
  flow(
    values => random(values.length - 1),
    index => values[index]
  )(values);

function canYouMoveHere() {
  return true;
}

function purifyBoard(board: Board) {
  return flow(
    (board: Board) => board,
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
    cellType: BallKind["kind"],
    board: BallKind[],
    randomIndexes: { index: number; color: keyof BallColors }[]
  ) =>
    randomIndexes.reduce(
      (acc, next) => {
        acc[next.index] = { color: next.color, kind: cellType };
        return acc;
      },
      [...board]
    )
);

export const setDefaultBoard = (ballsNumber: number) =>
  range(0, ballsNumber).map<BallKind>(_ => ({
    kind: "empty"
  }));

const updateBoardWithRandomBalls = (
  randomBallsLength: number,
  colors: string[],
  cellType: "small" | "regular"
) => (board: BallKind[]) =>
  flow(
    (board: BallKind[]) => board,
    purifyBoard,
    findRandomIndexes(randomBallsLength, []),
    map((index: number) => ({
      index,
      color: findRandomValueFromArray(colors)
    })),
    applyRandomBallsOnBoard(cellType, board)
  )([...board]);

const byIndex = <T>(values: T[]) =>
  values.reduce<Record<string, T>>((acc, next, index) => {
    acc[index] = next;
    return acc;
  }, {});

export const setInitialBoard = (
  size: number,
  randomBallsLength: number
): Board =>
  flow(
    setDefaultBoard,
    updateBoardWithRandomBalls(
      randomBallsLength,
      Object.keys(ballColors),
      "regular"
    ),
    updateBoardWithRandomBalls(
      randomBallsLength,
      Object.keys(ballColors),
      "small"
    )
  )(size);

const turnSmallBallsIntoRegularOnes = (board: Board): Board =>
  board.map(x => (x.kind === "small" ? { ...x, kind: "regular" } : x));

export const updateBoardOnMove = (randomBallsLength: number) => (
  board: Board
): Board => {
  return pipe(
    turnSmallBallsIntoRegularOnes,
    updateBoardWithRandomBalls(
      randomBallsLength,
      Object.keys(ballColors),
      "small"
    )
  )(board);
};

export const updateBoardOnClick = (index: number) => (
  board: BoardRecord
): [BoardRecord, boolean] =>
  flow(findAction(index), updateBoardOnAction(board))(board);

export const updateBoard = (
  index: number,
  randomBallsLength: number,
  size: number,
  board: Board,
  successNumber: number
) => {
  console.log("updateBoard");
  const [nextBoard, afterMove] = flow(
    byIndex,
    updateBoardOnClick(index)
  )(board) as [BoardRecord, boolean];
  return afterMove
    ? flow(
        updateBoardOnMove(randomBallsLength),
        updateOnSuccess(successNumber, size)
      )(Object.values(nextBoard))
    : Object.values(nextBoard);
};

type Action =
  | { type: "sameJumpyBall"; index: number; cell: BallKind }
  | {
      type: "firstRegularBall";
      index: number;
      cell: BallKind;
    }
  | {
      type: "subsequentRegularBall";
      to: { index: number; cell: BallKind };
      from: { index: number; cell: BallKind };
    }
  | {
      type: "move";
      to: { index: number; cell: BallKind };
      from: { index: number; cell: BallKind };
    }
  | { type: "updateBoardAfterClick"; board: BoardRecord }
  | { type: "default" };

const findAction = (index: number) => (
  board: BoardRecord
): Action | undefined => {
  const cell = board[index];
  const jumpy = Object.values(board).findIndex(x => x.kind === "jumpy");
  const jumpyCell = jumpy === -1 ? undefined : board[jumpy];
  if (cell.kind === "empty" && !!jumpyCell && jumpyCell.kind !== "empty") {
    return {
      type: "move",
      to: { index, cell: { ...jumpyCell, kind: "regular" } },
      from: { index: jumpy, cell: { kind: "empty" } }
    };
  }
  if (cell.kind === "jumpy") {
    return {
      type: "sameJumpyBall",
      index,
      cell: { ...cell, kind: "regular" }
    };
  }
  if (cell.kind === "regular" && jumpyCell?.kind === "jumpy") {
    return {
      type: "subsequentRegularBall",
      to: { cell: { ...cell, kind: "jumpy" }, index },
      from: { cell: { ...jumpyCell, kind: "regular" }, index: jumpy }
    };
  }
  if (cell.kind === "regular" && !jumpyCell) {
    return {
      type: "firstRegularBall",
      index,
      cell: { ...cell, kind: "jumpy" }
    };
  }
  return { type: "default" };
};

const updateBoardOnAction = (board: BoardRecord) => (
  action: Action
): [BoardRecord, boolean] => {
  switch (action.type) {
    case "sameJumpyBall":
    case "firstRegularBall":
      return [{ ...board, [action.index]: action.cell }, false];
    case "subsequentRegularBall":
      return [
        {
          ...board,
          [action.to.index]: action.to.cell,
          [action.from.index]: action.from.cell
        },
        false
      ];
    case "move":
      return [
        {
          ...board,
          [action.to.index]: action.to.cell,
          [action.from.index]: action.from.cell
        },
        true
      ];
    default:
      return [board, false];
  }
};

const updateOnSuccess = (successNumber: number, size: number) => (
  board: Board
) => {
  const indexes = verticalLine(board, successNumber, size);
  console.log("indexes", indexes);
  let nextBoard: Board = board;
  if (!!indexes) {
    nextBoard = indexes.reduce(
      (acc, next) => {
        acc[next] = { kind: "empty" };
        return acc;
      },
      [...board]
    );
  }
  return nextBoard;
};

const findNextIndex = (
  type: "horizontal" | "vertical" | "diagonalRight" | "diagonalLeft",
  index: number,
  size: number
) => {
  switch (type) {
    case "vertical":
      return index - size;
    case "horizontal":
      return index - 1;
    case "diagonalRight":
      return index + size + 1;
    case "diagonalLeft":
      return index + size - 1;
  }
};

function findNeighbours(
  index: number,
  elements: Readonly<{ color: keyof BallColors; index: number }[]>,
  type: "horizontal" | "vertical" | "diagonalRight" | "diagonalLeft",
  size: number,
  board: Board
): typeof elements {
  const cell = get(board, index);
  const prevElement = get(elements, elements.length - 1) || {
    color: undefined
  };
  if (
    !cell ||
    cell.kind !== "regular" ||
    (cell.kind === "regular" && cell.color !== prevElement.color)
  ) {
    return elements;
  }
  return findNeighbours(
    findNextIndex(type, index, size),
    [...elements, { color: cell.color, index }],
    type,
    size,
    board
  );
}

function verticalLine(board: Board, successNumber: number, size: number) {
  let indexes = undefined;
  for (let index = 0; index < board.length; index++) {
    const colorValues: Record<keyof BallColors, number[]> = {
      red: [],
      orange: [],
      blue: [],
      green: [],
      violet: []
    };
    const up = range(successNumber)
      .map((_, i) => ({
        cell: board[index - size * i],
        cellIndex: index - size * i
      }))
      .filter(x => !!x.cell)
      .reduce(
        (acc, next) => {
          if (next.cell.kind === "regular") {
            acc[next.cell.color].push(next.cellIndex);
            return acc;
          }
          return acc;
        },
        { ...colorValues }
      );
    indexes = Object.values(up).find(x => x.length === successNumber);
    if (!!indexes) {
      break;
    }
  }
  return indexes;
}

const boardOnNewMove = curry((id: number, board: Board): [Board, boolean] => {
  const jumpyCellId = board.findIndex(x => x.kind === "jumpy");
  const firstSpot = board[jumpyCellId];
  const targetSpot = board[id];
  let IsSecondClick = false;
  const newBoard: Board = board.map((x, index) => {
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
