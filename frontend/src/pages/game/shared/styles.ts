import styled from "styled-components";
import { WORLD_HEIGHT, WORLD_WIDTH } from "./constants";

export const GameRoot = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-block-end: var(--space-large);
`;

export const LobbyCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
  gap: var(--space-small);
  min-width: 400px;
  padding: var(--space-large);
  border-radius: var(--radius-large);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
`;

export const LobbyTitle = styled.h2`
  font-size: 2rem;
  font-weight: bold;
  word-wrap: break-word;
  overflow-wrap: break-word;
`;

export const StyledError = styled.span`
  color: var(--error);
  display: block;
  margin-block-end: var(--space-small);
`;

export const GameContainer = styled.div`
  position: relative;
  text-align: center;
  width: 100%;
  max-width: 800px;
  color: var(--color-text);
  aspect-ratio: ${WORLD_WIDTH} / ${WORLD_HEIGHT};
  box-sizing: border-box;
  margin: 0 auto;
  padding-inline: clamp(0.75rem, 4vw, 1.5rem);
`;

export const CanvasWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

export const CountdownOverlay = styled.div`
  position: absolute;
  z-index: 10;
  pointer-events: none;

  width: clamp(64px, 20%, 140px);
  aspect-ratio: 1 / 1;

  top: 35%;
  left: 50%;
  transform: translate(-50%, -50%);

  display: flex;
  align-items: center;
  justify-content: center;

  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
`;

export const Countdown = styled.div`
  font-size: clamp(3rem, 10vw, 5rem);
  font-weight: bold;
  color: var(--color-text);

  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const GameFinishedOverlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-small);
  z-index: 10;

  width: clamp(280px, 50%, 520px);
  padding: var(--space-xlarge) var(--space-large);

  position: absolute;
  top: 35%;
  left: 50%;
  transform: translate(-50%, -50%);

  background-color: var(--color-background);
  border-radius: var(--radius-medium);
  border: 1px solid var(--color-border);
`;

export const GameFinishedTitle = styled.div`
  font-size: clamp(1.2rem, 4vw, 1.8rem);
  font-weight: bold;
  color: var(--color-text);
  line-height: 1.2;
`;

export const GameFinishedSubtitle = styled.div`
  font-size: clamp(0.9rem, 3vw, 1.2rem);
  font-weight: bold;
  color: var(--color-text);
  margin-block-end: var(--space-medium);
`;

export const StyledButton = styled.button`
  width: 100%;
  max-width: 420px;
  font-size: clamp(0.9rem, 3vw, 1.2rem);
  border: solid 1.5px var(--border);
  border-radius: var(--radius-large);
  padding: var(--space-medium) var(--space-large);
  transition: transform 0.15s;
  cursor: pointer;

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid var(--outline-focused);
    border-radius: var(--radius-small);
  }
`;
