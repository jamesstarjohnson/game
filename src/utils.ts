import { range, sample, sum } from "lodash";
import { filter, map } from "lodash/fp";
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
      from: { fromCoord: { x: number; y: number }; cell: BallKind };
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
      from: { fromCoord, cell: { kind: "empty" } }
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
        setValueInTheBoard(action.from.cell, action.from.fromCoord),
        setValueInTheBoard(action.to.cell, action.to.toCoord)
      )(board);

    default:
      return board;
  }
};

const convertToTwoDimensions = (size: number) =>
  pipe((board: Board) =>
    board.reduce<BallKind[][]>((acc, next, index) => {
      if (index % size === 0) {
        acc.push([next]);
        return acc;
      }
      acc[acc.length - 1].push(next);
      return acc;
    }, [])
  );

export const updateBoardOnClick = (
  coord: { x: number; y: number },
  size: number
) => (board: BallKind[][]): [BallKind[][], boolean] => {
  const action = findAction(coord, size, board);
  const nextBoard = updateBoardOnAction(board, action);
  return action.type === "move"
    ? [
        pipe(
          findActualPath(action.from.fromCoord, coord, size),
          (indexes: { x: number; y: number }[]) =>
            indexes.reduce((acc, next) => {
              return setValueInTheBoard(
                { kind: "regular", color: "green" },
                next
              )(acc);
            }, board)
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
  successNumber: number
) => {
  const [nextBoard, afterMove] = updateBoardOnClick(coord, size)(board);
  if (!afterMove) {
    return nextBoard;
  }

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
function findPath(
  board: BallKind[][],
  indexes: { x: number; y: number }[],
  allTheIndexes: Set<string>,
  currentIndex: { x: number; y: number },
  target: { x: number; y: number },
  size: number,
  count: number = 0,
  foundCount: number = 0
): any[] {
  const a = [
    createBoardPoint({ x: currentIndex.x + 1, y: currentIndex.y }),
    createBoardPoint({ x: currentIndex.x - 1, y: currentIndex.y }),
    createBoardPoint({ x: currentIndex.x, y: currentIndex.y + 1 }),
    createBoardPoint({ x: currentIndex.x, y: currentIndex.y - 1 })
  ];
  const nextIndexes = a.filter(({ x, y }) => {
    const res =
      getFromTwoD(board, { x, y })?.kind === "empty" &&
      !indexes.find(element => element.y === y && element.x === x);
    // !allTheIndexes.has(createBoardPointString({ x, y }));
    return res;
  });
  if (foundCount > 5 || count >= 10) {
    return indexes;
  }
  if (a.find(isEqual(target))) {
    foundCount++;
    return [...indexes, target];
  }
  if (nextIndexes.length === 0) {
    return indexes;
  }

  const nextAllTheIndexes = nextIndexes.reduce(
    (acc, { x, y }) => acc.add(createBoardPointString({ x, y })),
    allTheIndexes
  );
  return nextIndexes.map(x =>
    findPath(
      board,
      [...indexes, x],
      nextAllTheIndexes,
      x,
      target,
      size,
      ++count,
      foundCount
    )
  );
}

function flattenNestedArrays(array: any[]): { x: number; y: number }[][] {
  return array.reduce((acc, next) => {
    if (Array.isArray(next) && !Array.isArray(next[0])) {
      acc.push(next);
      return acc;
    }
    return [...acc, ...flattenNestedArrays(next)];
  }, []);
}

// const indexes = findPath(board, [2], [2], 2, 0, 3);
const findActualPath = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  size: number
) => (board: BallKind[][]) => {
  const indexes = findPath(
    board,
    [from],
    new Set([createBoardPointString(from)]),
    from,
    to,
    size
  );
  // console.log(indexes);
  // return indexes;
  const nextIndexes = flattenNestedArrays(indexes).filter(x =>
    x.find(isEqual(to))
  );
  const minLength = Math.min(...nextIndexes.map(x => x.length));
  const shorterLengthIndexes = nextIndexes.filter(x => x.length === minLength);
  console.log(shorterLengthIndexes);
  return shorterLengthIndexes[0];
  // const optimalPath = shorterLengthIndexes.reduce<
  //   Record<string, { x: number; y: number }[]>
  // >((acc, next) => {
  //   const s = sum(next.map(x => convert2DTo1D(size, x)));
  //   acc[s] = next;
  //   return acc;
  // }, {});
  // const index =
  //   to.y < from.y || to.x < from.x
  //     ? Math.min(...Object.keys(optimalPath).map(x => Number(x)))
  //     : Math.max(...Object.keys(optimalPath).map(x => Number(x)));
  // return optimalPath[index];
};

// console.log(findActualPath(20, 0, 5)(board));
// const result = findActualPath(2, 0, indexes);
// console.log(result);

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
