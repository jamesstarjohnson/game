declare module "pathfinding" {
  class Grid {
    constructor(matrix: (0 | 1)[][]);
  }

  class AStarFinder {
    constructor();

    findPath(
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      grid: any
    ): [number, number][] {}
  }
  export { Grid, AStarFinder };
}
