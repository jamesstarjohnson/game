import React, { useReducer } from "react";
import styled, { keyframes } from "styled-components";
import {
  updateBoard,
  setInitialBoard,
  convert2DTo1D,
  updateBoardOnClick,
  updateOnSuccessAgain
  // -- //
} from "./utils";
import { ballColors, CellType, BallKind } from "./types";

const vibrate = keyframes`
  0% {transform: scale(1);}
  50%  {transform: scale(0.9);}
  100% {transform: scale(1);}
`;

const moving = keyframes`
  0% { 
    opacity: 1;
  }
  99% { 
    opacity: 1;
   }
  100% { 
    opacity: 0;
  }
`;

const delayedRegularBall = keyframes`
  0% { transform: scale(1) }
  100% {transform: scale(1)}
`;

const regularFromSmall = keyframes`
  0% { width: 20%; height: 20% }
  100% { width: 100%; height: 100% }
`;

const RegularBall = styled.div<CellType>`
  background-color: ${({ color }) => ballColors[color]};
  width: 100%;
  height: 100%;
  border-radius: 50%;
`;

const RegularDelayedBall = styled(RegularBall)<{ delay: number }>`
  animation-name: ${delayedRegularBall};
  animation-duration: 1ms;
  animation-timing-function: ease-in-out;
  animation-delay: ${({ delay }) => `${delay}ms`};
  transform: scale(0);
  animation-fill-mode: forwards;
`;

const SmallBall = styled(RegularBall)`
  width: 20%;
  height: 20%;
`;

const RegularFromSmall = styled(SmallBall)`
  animation-name: ${regularFromSmall};
  animation-duration: 500ms;
  animation-timing-function: ease-in-out;
  animation-fill-mode: forwards;
`;

const MovingBall = styled(RegularBall)<{
  duration: number;
  delay: number;
}>`
  animation-name: ${moving};
  animation-duration: ${({ duration }) => `${duration}ms`};
  animation-timing-function: ease-in-out;
  animation-delay: ${({ delay }) => `${delay}ms`};
  opacity: 0;
  animation-fill-mode: forwards;
`;

const JumpyBall = styled(RegularBall)`
  animation: ${vibrate} 1s infinite;
`;

const EmptyCell = styled.div`
  width: 100%;
  height: 100%;
`;

const Ball: React.FC<{
  cell: BallKind;
  onClick: () => void;
  onMoveComplete: () => void;
  onRegularFromSmallComplete: (evnet: any) => void;
}> = ({ cell, onClick, onMoveComplete, onRegularFromSmallComplete }) => {
  switch (cell.kind) {
    case "jumpy":
      return <JumpyBall onClick={onClick} color={cell.color} />;
    case "regular":
      return cell.data ? (
        <RegularDelayedBall
          onClick={onClick}
          color={cell.color}
          delay={cell.data.delay}
          onAnimationEnd={onMoveComplete}
        />
      ) : (
        <RegularBall onClick={onClick} color={cell.color} />
      );
    case "small":
      return <SmallBall color={cell.color} />;
    case "regularFromSmall":
      return (
        <RegularFromSmall
          onAnimationEnd={onRegularFromSmallComplete}
          color={cell.color}
        />
      );
    case "empty":
      return cell.data ? (
        <MovingBall
          duration={cell.data.duration}
          delay={cell.data.delay}
          color={cell.data.color}
          onClick={onClick}
          key={cell.data.id}
        />
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
  const defaultDelay = 200;
  const initialState = setInitialBoard(size, randomBallsLength);

  const [board, dispatch] = useReducer(reducer, initialState);
  const handleMouseClick = (coord: { x: number; y: number }) => () => {
    console.log("t", coord);
    const nextBoard = updateBoardOnClick(coord, size, defaultDelay, board);
    dispatch({ type: "updateBoard", board: nextBoard });
  };

  const handleMoveComplete = () => {
    console.log("complete");
    const nextBoard = updateBoard(
      randomBallsLength,
      size,
      board,
      successNumber
    );
    dispatch({ type: "updateBoard", board: nextBoard });
  };

  //this gets called randomBallsLength number of times
  const handleAnimation = (f: () => void, randomBallsLength: number) => {
    let count = 1;
    return () => {
      if (count === randomBallsLength) {
        f();
      }
      count++;
    };
  };

  const handleRegularFromSmallComplete = handleAnimation(() => {
    const [nextBoard] = updateOnSuccessAgain(board, successNumber, size);
    dispatch({ type: "updateBoard", board: nextBoard });
  }, randomBallsLength);

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
                        onMoveComplete={handleMoveComplete}
                        onRegularFromSmallComplete={
                          handleRegularFromSmallComplete
                        }
                      />
                    }
                  </Cell>
                }
              </Td>
            ))}
          </tr>
        ))}
      </BallBoard>
    </Container>
  );
};

export default App;
