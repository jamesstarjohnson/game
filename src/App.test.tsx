import { setInitBoard } from "./App";

const colors = ["red", "orange", "blue", "green", "violet"];
jest.mock("./utils", () => {
  let countColor = 2;
  let countIndex = 2;
  return {
    findRandomColor: jest
      .fn()
      .mockImplementation((c: typeof colors) => c[countColor--]),
    findUniqueIndex: () => countIndex--
  };
});

describe("tests", () => {
  test("setBoard should return array of with 3 colors red orange blue", () => {
    const t = setInitBoard(10, 3, colors);
    expect(t).toStrictEqual([
      "red",
      "orange",
      "blue",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    ]);
  });
});
