import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import styled from "styled-components";
import type { TournamentData } from "./types";
import { FormattedMessage } from "react-intl";
import { LobbyCard } from "../shared/styles";
import { tournamentApi } from "../../../api/tournamentApi";

const Root = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  max-height: 100%;
  padding: 1rem;
`;

export const TournamentQueuePage = () => {
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<TournamentData | null>(null);

  useEffect(() => {
    let alive = true;

    const poll = async () => {
      while (alive) {
        try {
          const { data } = await tournamentApi.get<TournamentData>("/status");

          if (!alive) return;

          setTournament(data);

          if (data.currentMatch) {
            navigate("/tournament");
            return;
          }

          if (data.status === "completed") {
            navigate("/tournament/lobby");
            return;
          }

          await new Promise((r) => setTimeout(r, 1000));
        } catch {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    };

    poll();

    return () => {
      alive = false;
    };
  }, [navigate]);

  if (!tournament) return null;

  return (
    <Root>
      <LobbyCard>
        <h2>
          <FormattedMessage id="tournament.queue.waiting-for-players" />
        </h2>
      </LobbyCard>
    </Root>
  );
};
