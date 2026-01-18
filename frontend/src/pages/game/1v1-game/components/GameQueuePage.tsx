import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import styled from "styled-components";
import { FormattedMessage } from "react-intl";
import { LobbyCard } from "../../shared/styles";
import type { GameStatus } from "../types";
import { gameApi } from "../../../../api/gameApi";

const Root = styled.div`
  display: flex;
  flex: 1;
  justify-content: center;
  align-items: center;
`;

export const GameQueuePage = () => {
  const [status, setStatus] = useState<GameStatus | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    const poll = async () => {
      while (alive && !controller.signal.aborted) {
        try {
          const res = await gameApi.get<GameStatus>("/gamestatus", {
            signal: controller.signal,
          });

          const data = res.data;
          setStatus(data);

          if (
            (data.status === "starting" || data.status === "running") &&
            data.matchId
          ) {
            navigate(`/game/match/${data.matchId}`);
            return;
          }

          if (data.status === "idle" || data.status === "finished") {
            navigate("/game/lobby");
            return;
          }
        } catch {
          if (controller.signal.aborted) return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    };

    poll();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [navigate]);

  if (!status) return null;

  return (
    <Root>
      <LobbyCard>
        <h2>
          <FormattedMessage id="game.queue.waiting" />
        </h2>

        {status.leftPlayer && status.rightPlayer && (
          <p>
            {status.leftPlayer} vs {status.rightPlayer}
          </p>
        )}
      </LobbyCard>
    </Root>
  );
};
