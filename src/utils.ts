import { range, sample, uniqueId } from "lodash";
import { filter, map } from "lodash/fp";
import PF from "pathfinding";
import {
  BallColors,
  Board,
  BallKind,
  ballColors,
  BoardRecord,
  Colors
} from "./types";
import { pipe, findIndex } from "ramda";

function getFromTwoD<T>(
  array: readonly T[][],
  coord: { x: number; y: number }
): T | undefined {
  try {
    const res = array[coord.y][coord.x];
    return res;
  } catch (error) {
    return undefined;
  }
}
function getFromOneD<T>(array: readonly T[], coord: number): T | undefined {
  return array[coord];
}

function purifyBoard(board: Board) {
  return pipe(
    (board: Board) =>
      board.map((x, index) => (x.kind === "empty" ? index : undefined)),
    filter<number>(x => x !== undefined)
  )(board);
}

const findPath = (
  from: { x: number; y: number },
  to: { x: number; y: number },
) => (board: BallKind[][]): { x: number, y: number, id: string }[] => {
  const matrix =
    board.map(row => row.map(column => (column.kind === "empty" ? 0 : 1)))
  const grid = new PF.Grid(matrix);
  const finder = new PF.AStarFinder();
  const path = finder
    .findPath(from.x, from.y, to.x, to.y, grid)
    .map(([x, y]) => ({ x, y, id: uniqueId("movingBall_") }));
  return path;
};

const findRandomIndexes = (randomIndexesLength: number, result: number[]) => (
  indexes: number[]
): number[] => {
  if (result.length === randomIndexesLength) {
    return result;
  }
  const [nextResult, nextindexes] = pipe(
    (indexes: number[]) => sample(indexes)!,
    randomValue => [
      [...result, randomValue],
      indexes.filter(x => x !== randomValue)
    ]
  )(indexes);
  return findRandomIndexes(randomIndexesLength, nextResult)(nextindexes);
};

const applyRandomBallsOnBoard = (cellType: BallKind["kind"], board: Board) => (
  randomIndexes: { index: number; color: keyof BallColors }[]
) =>
  randomIndexes.reduce(
    (acc, next) => {
      acc[next.index] = { color: next.color, kind: cellType };
      return acc;
    },
    [...board]
  );

export const setDefaultBoard = (ballsNumber: number): Board =>
  range(0, ballsNumber).map(_ => ({
    kind: "empty"
  }));

const updateBoardWithRandomBalls = (
  randomBallsLength: number,
  colors: string[],
  cellType: "small" | "regular"
) => (board: Board) =>
    pipe(
      purifyBoard,
      findRandomIndexes(randomBallsLength, []),
      map((index: number) => ({
        index,
        color: sample(colors) as Colors
      })),
      applyRandomBallsOnBoard(cellType, board)
    )(board);

export const setInitialBoard = (size: number, randomBallsLength: number) =>
  pipe(
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
    ),
    convertToTwoDimensions(size)
  )(size * size);

const turnSmallBallsIntoRegularOnes = (board: Board): Board =>
  board.map(x =>
    x.kind === "small" ? { color: x.color, kind: "regularFromSmall" } : x
  );

export const updateBoardAfterMove = (
  randomBallsLength: number,
  size: number
) => (board: BallKind[][]) =>
    pipe(
      (board: BallKind[][]) => board.flat(),
      turnSmallBallsIntoRegularOnes,
      updateBoardWithRandomBalls(
        randomBallsLength,
        Object.keys(ballColors),
        "small"
      ),
      convertToTwoDimensions(size)
    )(board);

type Action =
  | { type: "sameJumpyBall"; toCoord: { x: number; y: number }; cell: BallKind }
  | {
    type: "firstRegularBall";
    toCoord: { x: number; y: number };
    cell: BallKind;
  }
  | {
    type: "subsequentRegularBall";
    to: { toCoord: { x: number; y: number }; cell: BallKind };
    from: { fromCoord: { x: number; y: number }; cell: BallKind };
  }
  | {
    type: "move";
    to: { toCoord: { x: number; y: number }; cell: BallKind };
    from: { fromCoord: { x: number; y: number }; color: Colors };
  }
  | { type: "updateBoardAfterClick"; board: BoardRecord }
  | { type: "default" };

const convert1DTo2D = (size: number, coord1D: number) => ({
  y: Math.floor(coord1D / size),
  x: coord1D % size
});

const findJumpyBallCoord = (board: BallKind[][], size: number) =>
  pipe(
    (board: BallKind[][]) => board.flat(),
    findIndex(x => x.kind === "jumpy"),
    x => (x !== -1 ? convert1DTo2D(size, x) : undefined)
  )(board);

const findAction = (
  toCoord: { x: number; y: number },
  size: number,
  board: BallKind[][]
): Action => {
  const fromCoord = findJumpyBallCoord(board, size);
  const toBall = getFromTwoD(board, toCoord)!;
  const fromBall = !fromCoord ? undefined : getFromTwoD(board, fromCoord);

  if (toBall.kind === "empty" && !!fromCoord && fromBall?.kind === "jumpy") {
    return {
      type: "move",
      to: { toCoord, cell: { ...fromBall, kind: "regular" } },
      from: { fromCoord, color: fromBall.color }
    };
  }
  if (!!toBall && toBall.kind === "jumpy") {
    return {
      type: "sameJumpyBall",
      toCoord,
      cell: { ...toBall, kind: "regular" }
    };
  }
  if (toBall.kind === "regular" && fromBall?.kind === "jumpy" && !!fromCoord) {
    return {
      type: "subsequentRegularBall",
      to: { cell: { ...toBall, kind: "jumpy" }, toCoord },
      from: { cell: { ...fromBall, kind: "regular" }, fromCoord }
    };
  }
  if (toBall.kind === "regular" && !fromBall) {
    return {
      type: "firstRegularBall",
      toCoord,
      cell: { ...toBall, kind: "jumpy" }
    };
  }
  return { type: "default" };
};

const setValueInTheBoard = (
  value: BallKind,
  coord: { x: number; y: number }
) => (board: BallKind[][]) =>
    board.reduce<BallKind[][]>((acc, next, index) => {
      let newNext = next;
      if (coord.y === index) {
        newNext = [...next];
        newNext[coord.x] = value;
      }
      acc.push(newNext);
      return acc;
    }, []);

const convertToTwoDimensions = <T>(size: number) => (board: T[]) =>
  board.reduce<T[][]>((acc, next, index) => {
    if (index % size === 0) {
      acc.push([next]);
      return acc;
    }
    acc[acc.length - 1].push(next);
    return acc;
  }, []);

const applyMovingBall = (
  board: BallKind[][],
  color: Colors,
  defaultDelay: number
) => (path: { x: number; y: number; id: string }[]): [BallKind[][], number] => [
  path.reduce(
    (acc, next, index) =>
      setValueInTheBoard(
        {
          kind: "empty",
          data: {
            color,
            delay: defaultDelay * index,
            duration: defaultDelay,
            id: next.id
          }
        },
        next
      )(acc),
    board
  ),
  path.length
];

const applyFinalPosition = (
  color: Colors,
  toCoord: { x: number; y: number },
  defaultDelay: number
) => ([board, pathLength]: [BallKind[][], number]) =>
    setValueInTheBoard(
      {
        kind: "regular",
        color,
        data: { delay: defaultDelay * (pathLength - 1) }
      },
      toCoord
    )(board);

export const updateBoardOnClick = (
  coord: { x: number; y: number },
  size: number,
  defaultDelay: number,
  board: BallKind[][]
) => {
  const action = findAction(coord, size, board);
  switch (action.type) {
    case "sameJumpyBall":
    case "firstRegularBall":
      return setValueInTheBoard(action.cell, action.toCoord)(board);
    case "subsequentRegularBall":
      return pipe(
        setValueInTheBoard(action.from.cell, action.from.fromCoord),
        setValueInTheBoard(action.to.cell, action.to.toCoord)
      )(board);
    case "move":
      const path = findPath(action.from.fromCoord, coord)(board)
      return path.length > 0 ? pipe(
        applyMovingBall(board, action.from.color, defaultDelay),
        applyFinalPosition(action.from.color, action.to.toCoord, defaultDelay)
      )(path) : setValueInTheBoard({ color: action.from.color, kind: 'regular' }, action.from.fromCoord)(board)
    default:
      return board;
  }
};

export const updateBoard = (
  randomBallsLength: number,
  size: number,
  board: BallKind[][],
  successNumber: number
) => {
  const [updatedBoard, isSuccess] = updateOnSuccess(successNumber, size)(board);
  if (isSuccess) {
    return updatedBoard;
  }

  const updatedBoardAgain = updateBoardAfterMove(
    randomBallsLength,
    size
  )(updatedBoard);
  return updatedBoardAgain;
};

const removeRegularFromSmall = (board: BallKind[][]): BallKind[][] =>
  board.map(x =>
    x.map(x1 =>
      x1.kind === "regularFromSmall" ? { color: x1.color, kind: "regular" } : x1
    )
  );

export const updateOnSuccessAgain = (
  board: BallKind[][],
  successNumber: number,
  size: number
) =>
  pipe(
    (board: BallKind[][]) => board,
    removeRegularFromSmall,
    updateOnSuccess(successNumber, size)
  )(board);

export const removeHitBalls = (board: BallKind[][]): BallKind[][] =>
  board.map(row =>
    row.map(column => (column.kind === "hit" ? { kind: "empty" } : column))
  );

const setMultitpleValuesInTheBoard = (
  coords: { x: number; y: number }[],
  mapper: (cell: BallKind) => BallKind
) => (board: BallKind[][]) => {
  const mapCoords = new Map(coords.map(e => [createBoardPointString(e), e]));
  return board.map((row, y) =>
    row.map((column, x) =>
      mapCoords.has(createBoardPointString({ x, y })) ? mapper(column) : column
    )
  );
};

export const updateOnSuccess = (successNumber: number, size: number) => (
  board: BallKind[][]
): [BallKind[][], boolean] => {
  const hitBalls = findHitBalls(size, successNumber, board);
  if (hitBalls.length === 0) {
    return [board, false];
  }
  const nextBoard = setMultitpleValuesInTheBoard(hitBalls, (cell: BallKind) => {
    if (cell.kind === "regular") {
      return { color: cell.color, kind: "hit" };
    }
    return cell;
  })(board);
  return [nextBoard, true];
};

const findNextIndex = (
  type: "horizontal" | "vertical" | "diagonalRight" | "diagonalLeft",
  coord: { x: number; y: number }
) => {
  switch (type) {
    case "vertical":
      return { ...coord, y: coord.y - 1 };
    case "horizontal":
      return { ...coord, x: coord.x - 1 };
    case "diagonalRight":
      return { y: coord.y + 1, x: coord.x + 1 };
    case "diagonalLeft":
      return { y: coord.y + 1, x: coord.x - 1 };
  }
};

function findNeighbours(
  coord: { x: number; y: number },
  elements: Readonly<
    { color: keyof BallColors; coord: { x: number; y: number } }[]
  >,
  type: "horizontal" | "vertical" | "diagonalRight" | "diagonalLeft",
  size: number,
  board: BallKind[][]
): typeof elements {
  const cell = getFromTwoD(board, coord);
  const prevElement = getFromOneD(elements, elements.length - 1) || {
    color: undefined
  };
  if (
    !cell ||
    cell.kind !== "regular" ||
    (cell.kind === "regular" &&
      cell.color !== prevElement.color &&
      elements.length > 0)
  ) {
    return elements;
  }
  return findNeighbours(
    findNextIndex(type, coord),
    [...elements, { color: cell.color, coord }],
    type,
    size,
    board
  );
}

const findHitBalls = (
  size: number,
  successNumber: number,
  board: BallKind[][]
) =>
  board
    .flat()
    .flatMap((_, index) => [
      findNeighbours(convert1DTo2D(size, index), [], "vertical", size, board),
      findNeighbours(
        convert1DTo2D(size, index),
        [],
        "diagonalLeft",
        size,
        board
      ),
      findNeighbours(
        convert1DTo2D(size, index),
        [],
        "diagonalRight",
        size,
        board
      ),
      findNeighbours(convert1DTo2D(size, index), [], "horizontal", size, board)
    ])
    .filter(x => x.length >= successNumber)
    .flatMap(x => x)
    .map(x => x.coord);

function createBoardPointString({ x, y }: { x: number; y: number }) {
  return `${x},${y}`;
}