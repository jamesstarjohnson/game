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
import { pipe, equals, T } from "ramda";

const get = <T>(array: readonly T[], index: number): T | undefined =>
  array[index];

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
    )
  )(size);

const turnSmallBallsIntoRegularOnes = (board: Board): Board =>
  board.map(x => (x.kind === "small" ? { ...x, kind: "regular" } : x));

export const updateBoardOnMove = (
  randomBallsLength: number,
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

const findAction = (index: number, board: BoardRecord): Action => {
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

const updateBoardOnAction = (
  board: BoardRecord,
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

// const board = range(0, 25).map<BallKind>(x => ({
//   kind: "empty"
// }));
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

// console.log("2dimensions", convertToTwoDimensions(5)(board));

export const updateBoardOnClick = (index: number, size: number) => (
  board: BoardRecord
): [BoardRecord, boolean] => {
  const action = findAction(index, board);
  const [nextBoard, moved] = updateBoardOnAction(board, action);
  return action.type === "move"
    ? [
        pipe(
          (board: BoardRecord) => Object.values(board),
          convertToTwoDimensions(size),
          findActualPath(action.from.index, index, size),
          (indexes: number[]) =>
            indexes.reduce(
              (acc, next) => {
                acc[next] = { kind: "jumpy", color: "violet" };
                return acc;
              },
              { ...board }
            )
        )(nextBoard),
        moved
      ]
    : [nextBoard, moved];
};

const isNotEmptyBall = (
  value: BallKind
): value is {
  kind: Exclude<BallKind["kind"], "empty">;
  color: Colors;
} => value.kind === "empty";

export const updateBoard = (
  index: number,
  randomBallsLength: number,
  size: number,
  board: Board,
  successNumber: number
) => {
  const [nextBoard, afterMove] = pipe(
    byIndex,
    updateBoardOnClick(index, size)
  )(board);
  if (!afterMove) {
    return Object.values(nextBoard);
  }

  const [isSuccess, updatedBoard] = updateOnSuccess(
    successNumber,
    size,
    Object.values(nextBoard)
  );
  if (isSuccess) {
    return updatedBoard;
  }
  const updatedBoardOnMove = updateBoardOnMove(randomBallsLength, updatedBoard);
  const [_, updatedBoardAgain] = updateOnSuccess(
    successNumber,
    size,
    updatedBoardOnMove
  );
  return updatedBoardAgain;
};

function updateOnSuccess(
  successNumber: number,
  size: number,
  board: Board
): [boolean, Board] {
  const foundBalls = findHitBalls(size, successNumber, board);
  if (foundBalls.length === 0) {
    return [false, board];
  }
  return [
    true,
    foundBalls.reduce(
      (acc, next) => {
        acc[next] = { kind: "empty" };
        return acc;
      },
      [...board]
    )
  ];
}

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
    (cell.kind === "regular" &&
      cell.color !== prevElement.color &&
      elements.length > 0)
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

const findHitBalls = (size: number, successNumber: number, board: Board) =>
  board
    .flatMap((_, index) => [
      findNeighbours(index, [], "vertical", size, board),
      findNeighbours(index, [], "diagonalLeft", size, board),
      findNeighbours(index, [], "diagonalRight", size, board),
      findNeighbours(index, [], "horizontal", size, board)
    ])
    .filter(x => x.length >= successNumber)
    .flatMap(x => x)
    .map(x => x.index);

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
  size: number
): any[] {
  const a = [
    createBoardPoint({ x: currentIndex.x + 1, y: currentIndex.y }),
    createBoardPoint({ x: currentIndex.x - 1, y: currentIndex.y }),
    createBoardPoint({ x: currentIndex.x, y: currentIndex.y + 1 }),
    createBoardPoint({ x: currentIndex.x, y: currentIndex.y - 1 })
  ];
  const nextIndexes = a.filter(({ x, y }) => {
    const res =
      board[x][y]?.kind === "empty" &&
      !allTheIndexes.has(createBoardPointString({ x, y }));
    return res;
  });

  if (a.find(isEqual(target))) {
    return [...indexes, { x: 1, y: 2 }];
  }
  if (nextIndexes.length === 0) {
    return indexes;
  }

  const nextAllTheIndexes = nextIndexes.reduce(
    (acc, { x, y }) => acc.add(createBoardPointString({ x, y })),
    allTheIndexes
  );
  return nextIndexes.map(x =>
    findPath(board, [...indexes, x], nextAllTheIndexes, x, target, size)
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
    new Set(createBoardPointString(from)),
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
  const optimalPath = shorterLengthIndexes.reduce<
    Record<string, { x: number; y: number }[]>
  >((acc, next) => {
    const s = sum(next);
    acc[s] = next;
    return acc;
  }, {});
  const index =
    to.y < from.y || to.x < to.y
      ? Math.min(...Object.keys(optimalPath).map(x => Number(x)))
      : Math.max(...Object.keys(optimalPath).map(x => Number(x)));
  return optimalPath[index];
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
