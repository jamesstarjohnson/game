export const ballColors = {
  red: "#9e0808",
  orange: "#ffd500",
  blue: "#0059ff",
  green: "#00ffc3",
  violet: "#8930e3"
} as const;

export type BallColors = typeof ballColors;
type Colors = keyof BallColors;
export type CellType = {
  color: keyof BallColors;
};
export type BallKind =
  | { kind: "regular"; color: Colors }
  | { kind: "small"; color: Colors }
  | { kind: "jumpy"; color: Colors }
  | { kind: "empty" };
export type BoardRecord = Readonly<Record<string, BallKind>>;
export type Board = Readonly<BallKind[]>;
