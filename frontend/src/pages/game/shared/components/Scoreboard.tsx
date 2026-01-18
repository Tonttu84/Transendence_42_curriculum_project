import styled from "styled-components";

const Root = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: clamp(0.75rem, 4vw, 2rem);
`;

const Column = styled.div``;

const CurrentMatch = styled.h2`
  font-size: clamp(1.2rem, 3vw, 2rem);
  font-weight: 600;
`;

const PlayerTitle = styled.h3`
  font-size: clamp(1.2rem, 3vw, 2rem);
  font-weight: 600;
`;

const PlayerScore = styled.h3`
  font-size: clamp(1.2rem, 3vw, 2rem);
`;

export const Scoreboard = ({
  currentMatch,
  playerLeftName,
  playerRightName,
  playerLeftScore,
  playerRightScore,
}: {
  currentMatch: string | null;
  playerLeftName: string;
  playerRightName: string;
  playerLeftScore: number;
  playerRightScore: number;
}) => (
  <Root>
    <Column>
      <PlayerTitle>{playerLeftName}</PlayerTitle>
      <PlayerScore>{playerLeftScore}</PlayerScore>
    </Column>
    <CurrentMatch>{currentMatch}</CurrentMatch>
    <Column>
      <PlayerTitle>{playerRightName}</PlayerTitle>
      <PlayerScore>{playerRightScore}</PlayerScore>
    </Column>
  </Root>
);
