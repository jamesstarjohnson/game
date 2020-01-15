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
import { pipe, equals, findIndex } from "ramda";

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

function canYouMoveHere() {
  return true;
}

function purifyBoard(board: Board) {
  return pipe(
    (board: Board) =>
      board.map((x, index) => (x.kind === "empty" ? index : undefined)),
    filter<number>(x => x !== undefined)
  )(board);
}

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

const byIndex = (values: Board) =>
  values.reduce<Record<string, BallKind>>((acc, next, index) => {
    acc[index] = next;
    return acc;
  }, {});

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
  board.map(x => (x.kind === "small" ? { ...x, kind: "regular" } : x));

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

export const convert2DTo1D = (
  size: number,
  { x, y }: { x: number; y: number }
) => y * size + x;

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
) => (board: BallKind[][]) => {
  return board.reduce<BallKind[][]>((acc, next, index) => {
    let newNext = next;
    if (coord.y === index) {
      newNext = [...next];
      newNext[coord.x] = value;
    }
    acc.push(newNext);
    return acc;
  }, []);
};

const updateBoardOnAction = (
  board: BallKind[][],
  action: Action
): BallKind[][] => {
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
      return pipe(
        setValueInTheBoard(
          { kind: "regular", color: action.from.color },
          action.from.fromCoord
        )
      )(board);

    default:
      return board;
  }
};

const convertToTwoDimensions = <T>(size: number) =>
  pipe((board: T[]) =>
    board.reduce<T[][]>((acc, next, index) => {
      if (index % size === 0) {
        acc.push([next]);
        return acc;
      }
      acc[acc.length - 1].push(next);
      return acc;
    }, [])
  );

const applyMovingBall = (
  board: BallKind[][],
  color: Colors,
  defaultDelay: number
) => (path: { x: number; y: number; id: string }[]): [BallKind[][], number] => [
  path.reduce((acc, next, index) => {
    return setValueInTheBoard(
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
    )(acc);
  }, board),
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
  defaultDelay: number
) => (board: BallKind[][]): [BallKind[][], boolean] => {
  const action = findAction(coord, size, board);
  const nextBoard = updateBoardOnAction(board, action);
  return action.type === "move"
    ? [
        pipe(
          findPath(action.from.fromCoord, coord, size),
          applyMovingBall(nextBoard, action.from.color, defaultDelay),
          applyFinalPosition(action.from.color, action.to.toCoord, defaultDelay)
        )(nextBoard),
        true
      ]
    : [nextBoard, false];
};

export const updateBoard = (
  coord: { x: number; y: number },
  randomBallsLength: number,
  size: number,
  board: BallKind[][],
  successNumber: number,
  defaultDelay: number
) => {
  const [nextBoard, afterMove] = updateBoardOnClick(
    coord,
    size,
    defaultDelay
  )(board);
  // console.log(nextBoard);
  // if (afterMove) {
  //   return nextBoard;
  // }
  return nextBoard;

  const [updatedBoard, isSuccess] = updateOnSuccess(
    successNumber,
    size
  )(nextBoard);
  if (isSuccess) {
    return updatedBoard;
  }

  const [updatedBoardAgain] = pipe(
    updateBoardAfterMove(randomBallsLength, size),
    updateOnSuccess(successNumber, size)
  )(updatedBoard);
  return updatedBoardAgain;
};

const updateOnSuccess = (successNumber: number, size: number) => (
  board: BallKind[][]
): [BallKind[][], boolean] => {
  const foundBalls = findHitBalls(size, successNumber, board);
  if (foundBalls.length === 0) {
    return [board, false];
  }
  return [
    foundBalls.reduce(
      (acc, next) => setValueInTheBoard({ kind: "empty" }, next)(acc),
      board
    ),
    true
  ];
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

function createBoardPoint({ x, y }: { x: number; y: number }) {
  return { x, y };
}
function createBoardPointString({ x, y }: { x: number; y: number }) {
  return `${x},${y}`;
}
const isEqual = (a: { x: number; y: number }) => (a1: {
  x: number;
  y: number;
}) => equals(createBoardPointString(a), createBoardPointString(a1));

// function findPath(
//   board: BallKind[][],
//   indexes: Map<string, { x: number; y: number }>,
//   currentIndex: { x: number; y: number },
//   target: { x: number; y: number }
// ): any[] {
//   const a = [
//     createBoardPoint({ x: currentIndex.x + 1, y: currentIndex.y }),
//     createBoardPoint({ x: currentIndex.x - 1, y: currentIndex.y }),
//     createBoardPoint({ x: currentIndex.x, y: currentIndex.y + 1 }),
//     createBoardPoint({ x: currentIndex.x, y: currentIndex.y - 1 })
//   ];
//   const nextIndexes = a.filter(({ x, y }) => {
//     const res =
//       getFromTwoD(board, { x, y })?.kind === "empty" &&
//       !indexes.has(createBoardPointString({ x, y }));
//     return res;
//   });
//   if (a.find(isEqual(target))) {
//     indexes.set(createBoardPointString(target), target);
//     return Array.from(indexes.values());
//   }
//   if (nextIndexes.length === 0) {
//     return [];
//   }

//   // const nextAllTheIndexes = nextIndexes.reduce(
//   //   (acc, { x, y }) => acc.add(createBoardPointString({ x, y })),
//   //   allTheIndexes
//   // );
//   return nextIndexes.map(x =>
//     findPath(
//       board,
//       new Map(indexes.set(createBoardPointString(x), x)),
//       x,
//       target
//     )
//   );
// }

const findPath = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  size: number
) => (board: BallKind[][]) => {
  const matrix = pipe(
    (board: BallKind[][]) =>
      board.flat().map(x => (x.kind === "empty" ? 0 : 1)),
    convertToTwoDimensions(size)
  )(board);
  const grid = new PF.Grid(matrix);
  const finder = new PF.AStarFinder();
  const path = finder
    .findPath(from.x, from.y, to.x, to.y, grid)
    .map(([x, y]) => ({ x, y, id: uniqueId("movingBall_") }));
  return path;
};

// const boardOnNewMove = curry((id: number, board: Board): [Board, boolean] => {
//   const jumpyCellId = board.findIndex(x => x.kind === "jumpy");
//   const firstSpot = board[jumpyCellId];
//   const targetSpot = board[id];
//   let IsSecondClick = false;
//   const newBoard: Board = board.map((x, index) => {
//     if (index === id && x.kind === "regular") {
//       return { color: x.color, kind: "jumpy" };
//     }
//     if (index === id && x.kind === "jumpy") {
//       return { color: x.color, kind: "regular" };
//     }
//     if (targetSpot.kind === "regular" && x.kind === "jumpy") {
//       return { color: x.color, kind: "regular" };
//     }
//     if (
//       index === id &&
//       (x.kind === "empty" || x.kind === "small") &&
//       !!firstSpot &&
//       firstSpot.kind === "jumpy" &&
//       canYouMoveHere()
//     ) {
//       // TODO remove side-effect
//       IsSecondClick = true;
//       return { kind: "regular", color: firstSpot.color };
//     }
//     if (
//       jumpyCellId === index &&
//       x.kind === "jumpy" &&
//       (targetSpot.kind === "empty" || targetSpot.kind === "small") &&
//       canYouMoveHere()
//     ) {
//       return { kind: "empty" };
//     }
//     return x;
//   });
//   return [newBoard, IsSecondClick];
// });
