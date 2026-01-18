import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import styled from "styled-components";
import { FormattedMessage, useIntl } from "react-intl";
import {
  LobbyCard,
  LobbyTitle,
  StyledButton,
  StyledError,
} from "../../shared/styles";
import type { GameStatus } from "../types";
import { gameApi } from "../../../../api/gameApi";

const Root = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const SectionTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: bold;
`;

const MatchList = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-small);
  width: 100%;
  max-width: 420px;
`;

const MatchLabel = styled.div`
  font-size: 1rem;
`;

const MatchRow = styled.div`
  display: flex;
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Button = styled.button`
  font-size: 1.1rem;
  border: solid 1.5px var(--border);
  border-radius: var(--radius-large);
  padding: var(--space-small) var(--space-medium);
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

interface ActiveMatch {
  matchId: string;
  left: string;
  right: string;
  started: boolean;
}

interface MatchIdsResponse {
  matchIds: ActiveMatch[];
}

export const GameLobbyPage = () => {
  const [matches, setMatches] = useState<ActiveMatch[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { formatMessage } = useIntl();

  useEffect(() => {
    const getGameStatus = async () => {
      try {
        const { data } = await gameApi.get<GameStatus>("/gamestatus");
        setGameStatus(data);
      } catch {
        setError(formatMessage({ id: "game.lobby.error" }));
      }
    };

    getGameStatus();
  }, []);

  //Poll active matches for spectating
  useEffect(() => {
    let alive = true;

    const fetchMatches = async () => {
      try {
        const { data } = await gameApi.get<MatchIdsResponse>("/matchIds");

        if (alive) {
          setMatches(data.matchIds ?? []);
        }
      } catch {
        setError(formatMessage({ id: "game.lobby.error" }));
      }
    };

    fetchMatches();
    const interval = setInterval(fetchMatches, 2000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [formatMessage]);

  const joinQueue = async () => {
    try {
      await gameApi.post("/join", {});
      navigate("/game/queue");
    } catch {
      setError(formatMessage({ id: "game.lobby.error-queue" }));
    }
  };

  return (
    <Root>
      <LobbyCard>
        <LobbyTitle>
          <FormattedMessage id="game.lobby.title" />
        </LobbyTitle>

        {matches.length === 0 && (
          <FormattedMessage id="game.lobby.no-active-match" />
        )}
        <StyledButton onClick={joinQueue}>
          {gameStatus?.status === "waiting"
            ? formatMessage({ id: "game.lobby.return-to-queue" })
            : formatMessage({ id: "game.lobby.start-new-match" })}
        </StyledButton>

        {matches.length > 0 && (
          <>
            <SectionTitle>
              <FormattedMessage id="game.lobby.active-matches" />
            </SectionTitle>
            <MatchList>
              {matches.map((match) => {
                const isMyMatch =
                  (gameStatus?.status === "starting" ||
                    gameStatus?.status === "running") &&
                  gameStatus.matchId === match.matchId;

                return (
                  <MatchRow key={match.matchId}>
                    <MatchLabel>
                      {match.left} vs {match.right}
                      {!match.started &&
                        formatMessage({ id: "game.lobby.starting" })}
                    </MatchLabel>

                    {isMyMatch ? (
                      <Button
                        onClick={() => navigate(`/game/match/${match.matchId}`)}
                      >
                        <FormattedMessage id="game.lobby.rejoin-match" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => navigate(`/game/match/${match.matchId}`)}
                      >
                        <FormattedMessage id="game.lobby.spectate" />
                      </Button>
                    )}
                  </MatchRow>
                );
              })}
            </MatchList>
          </>
        )}
        {error && (
          <StyledError role="alert" aria-live="assertive">
            {error}
          </StyledError>
        )}
      </LobbyCard>
    </Root>
  );
};
