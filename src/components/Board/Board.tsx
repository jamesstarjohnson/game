import React, { FC, useRef, useEffect, useState } from "react";
import styled from "styled-components";

const BoardInner = styled.div`
  width: 100%;
  height: 100%;
`;

export type Size = {
  width: number;
  height: number;
};

const Board: FC<{
  children: (size: Size | undefined) => JSX.Element;
}> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>();
  useEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    setSize(rect ? { width: rect.width, height: rect.height } : undefined);
  }, []);
  return <BoardInner ref={ref}>{children(size)}</BoardInner>;
};

export default Board;
