import { random, range } from "lodash";
import { flow } from "lodash/fp";
import { BallKinds } from './App'

export const findRandomColor = (colors: string[]) =>
  flow(
    colors => colors.length,
    length => random(length - 1),
    index => colors[index]
  )(colors);

export function findUniqueIndex(
  matchAgainst: number[],
  length: number
): number {
  const value = random(length);
  return matchAgainst.includes(value)
    ? findUniqueIndex(matchAgainst, length)
    : value;
}

function canYouMoveHere() {
  return true;
}

const colorValues = { "red": 0, "orange": 0, "blue": 0, "green": 0, "violet": 0 }
function isVerticalLine(board: BallKinds[], successNumber: number) {
  let isInRow = false;
  for (let index = 0; index < board.length; index++) {
    const up = range(4).map((_, i) => board[index - successNumber * i]).filter(x => !!x).reduce((acc, next) => {
      if (next.kind === 'regular') {
        acc[next.color] += 1
        return acc
      }
      return acc
    }, { ...colorValues })
    if (Object.keys(up).includes(`${successNumber}`)) {
      isInRow = true;
      break;
    }
  }
  return isInRow;
}

export function boardOnNewMove(board: BallKinds[], id: number) {
  const jumpyCellId = board.findIndex(x => x.kind === "jumpy");
  const firstSpot = board[jumpyCellId]
  const targetSpot = board[id]
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
      (x.kind === "empty" || x.kind === "small") && firstSpot.kind === 'jumpy' && canYouMoveHere()
    ) {
      return { kind: 'regular', color: firstSpot.color }
    }
    if (
      jumpyCellId === index &&
      x.kind === "jumpy" &&
      (targetSpot.kind === "empty" || targetSpot.kind === "small") && canYouMoveHere()
    ) {
      return { kind: "empty" };
    }
    return x;
  })
  return newBoard
}