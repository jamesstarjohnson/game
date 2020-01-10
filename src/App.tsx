import React, { useReducer } from "react";
import styled, { keyframes } from "styled-components";
import { updateBoard, setInitialBoard } from "./utils";
import { ballColors, CellType, Board, BallKind } from "./types";

const vibrate = keyframes`
  0% {transform: scale(1);}
  50%  {transform: scale(0.9);}
  100% {transform: scale(1);}
`;

const RegularBall = styled.div<CellType>`
  background-color: ${({ color }) => ballColors[color]};
  width: 100%;
  height: 100%;
  border-radius: 50%;
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
      return <EmptyCell onClick={onClick} />;
  }
};

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Cell = styled.div<{ index: number; size: number }>`
  width: calc(10vmin - 2px);
  height: calc(10vmin - 2px);
  border-bottom: ${({ index, size }) =>
    index >= size * size - size ? 0 : "1px solid silver"};
  border-left: ${({ index, size }) =>
    index % size === 0 ? 0 : "1px solid silver"};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const BallBoard = styled.div`
  width: 100vmin;
  height: calc(100vmin - 2px);
  border: 1px solid silver;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-evenly;
`;

type State = Board;

type Action = {
  type: "updateBoard";
  board: Board;
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
  // console.log(setBoard(10, 3, ["red", "orange", "blue", "green", "violet"]));
  // const updateBallsBoard = updateBoard(randomBallsLength);
  const initialState = setInitialBoard(size * size, randomBallsLength);

  const [board, dispatch] = useReducer(reducer, initialState);
  // const [board, setBoard] = useState(
  //   setInitialBoard(size * size, randomBallsLength)
  // );
  const handleMouseClick = (index: number) => () => {
    const nextBoard = updatexBoard(
      index,
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
        {Object.values(board).map((cell, index) => (
          <Cell index={index} size={size} key={index}>
            {<Ball onClick={handleMouseClick(index)} cell={cell} />}
          </Cell>
        ))}
      </BallBoard>
    </Container>
  );
};

export default App;
