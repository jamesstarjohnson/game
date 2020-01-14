import React, { useReducer } from "react";
import styled, { keyframes } from "styled-components";
import { updateBoard, setInitialBoard, convert2DTo1D } from "./utils";
import { ballColors, CellType, BallKind } from "./types";

const vibrate = keyframes`
  0% {transform: scale(1);}
  50%  {transform: scale(0.9);}
  100% {transform: scale(1);}
`;

const moving = keyframes`
  0% { transform: scale(1); }
  99% { transform: scale(1); }
  100% {transform: scale(0);}
`;

const RegularBall = styled.div<CellType>`
  background-color: ${({ color }) => ballColors[color]};
  width: 100%;
  height: 100%;
  border-radius: 50%;
`;

const MovingBall = styled(RegularBall)<{ index: number }>`
  animation-name: ${moving};
  animation-duration: 200ms;
  animation-timing-function: ease-in-out;
  animation-delay: ${({ index }) => `${2 * index}00ms`};
  transform: scale(0);
  animation-fill-mode: forwards;
`;

const SmallBall = styled(RegularBall)`
  width: 20%;
  height: 20%;
`;

const JumpyBall = styled(RegularBall)`
  animation: ${vibrate} 1s infinite;
`;

const EmptyCell = styled.div`
  width: 100%;
  height: 100%;
`;

const Ball: React.FC<{ cell: BallKind; onClick: () => void }> = ({
  cell,
  onClick
}) => {
  switch (cell.kind) {
    case "jumpy":
      return <JumpyBall onClick={onClick} color={cell.color} />;
    case "regular":
      return <RegularBall onClick={onClick} color={cell.color} />;
    case "small":
      return <SmallBall color={cell.color} />;
    case "empty":
      return cell.data ? (
        <MovingBall index={cell.data.index} color={cell.data.color} />
      ) : (
        <EmptyCell onClick={onClick} />
      );
  }
};

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Cell = styled.div`
  width: calc(10vmin - 2px);
  height: calc(10vmin - 2px);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const BallBoard = styled.table`
  width: 100vmin;
  heightl: 100vmin;
  border-collapse: collapse;
`;

const Td = styled.td`
  border: 1px solid #dddddd;
`;

type State = BallKind[][];

type Action = {
  type: "updateBoard";
  board: BallKind[][];
};

function reducer(board: State, action: Action): State {
  switch (action.type) {
    case "updateBoard":
      return action.board;
    default:
      return board;
  }
}

const App: React.FC = () => {
  const size = 10;
  const randomBallsLength = 4;
  const successNumber = 4;
  const initialState = setInitialBoard(size, randomBallsLength);

  const [board, dispatch] = useReducer(reducer, initialState);
  const handleMouseClick = (coord: { x: number; y: number }) => () => {
    console.log("t", coord);
    const nextBoard = updateBoard(
      coord,
      randomBallsLength,
      size,
      board,
      successNumber
    );
    dispatch({ type: "updateBoard", board: nextBoard });
  };

  return (
    <Container>
      <BallBoard>
        {board.map((row, y) => (
          <tr>
            {row.map((column, x) => (
              <Td>
                {
                  <Cell key={convert2DTo1D(size, { x, y })}>
                    {
                      <Ball
                        onClick={handleMouseClick({ x, y })}
                        cell={column}
                      />
                    }
                  </Cell>
                }
              </Td>
            ))}
          </tr>
        ))}
        {/* {Object.values(board).map((cell, index) => (
          <Cell index={index} size={size} key={index}>
            {<Ball onClick={handleMouseClick(index)} cell={cell} />}
          </Cell>
        ))} */}
      </BallBoard>
    </Container>
  );
};

export default App;
