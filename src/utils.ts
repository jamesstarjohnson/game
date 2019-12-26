import { random } from "lodash";
import { flow } from "lodash/fp";

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
