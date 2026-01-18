import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import styled from "styled-components";
import type { TournamentData } from "./types";
import { FormattedMessage, useIntl } from "react-intl";
import {
  LobbyCard,
  LobbyTitle,
  StyledButton,
  StyledError,
} from "../shared/styles";
import { TournamentTooltip } from "./TournamentTooltip";
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

const Subtitle = styled.h3`
  font-size: 1.2rem;
  font-weight: bold;
  margin-block-end: var(--space-medium);
`;

export const TournamentLobbyPage = () => {
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { formatMessage } = useIntl();
  const navigate = useNavigate();

  // Poll active tournament status
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    const getTournamentStatus = async () => {
      try {
        const { data } = await tournamentApi.get<TournamentData>("/status", {
          signal: controller.signal,
        });

        if (alive) {
          setTournamentData(data);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError(formatMessage({ id: "tournament.lobby.error-generic" }));
        }
      }
    };

    getTournamentStatus();
    const interval = setInterval(getTournamentStatus, 2000);

    return () => {
      alive = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [formatMessage]);

  const createTournament = async () => {
    try {
      setLoading(true);
      await tournamentApi.post("/create", {});
      navigate("/tournament/queue");
    } catch {
      setError(
        formatMessage({ id: "tournament.lobby.error-failed-to-create" }),
      );
    } finally {
      setLoading(false);
    }
  };

  const joinTournament = async () => {
    try {
      setLoading(true);
      await tournamentApi.post("/join", {});
      navigate("/tournament/queue");
    } catch {
      setError(formatMessage({ id: "tournament.lobby.error-failed-to-join" }));
    } finally {
      setLoading(false);
    }
  };

  const getMyUserId = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.userId?.toString();
  };

  const isTournamentOngoing =
    tournamentData?.status === "semifinal_1" ||
    tournamentData?.status === "semifinal_2" ||
    tournamentData?.status === "final";

  const alreadyJoined = tournamentData?.players?.includes(getMyUserId());

  return (
    <Root>
      <LobbyCard>
        <TournamentTooltip />
        <LobbyTitle>
          <FormattedMessage id="tournament.lobby.title" />
        </LobbyTitle>
        {isTournamentOngoing && (
          <>
            <FormattedMessage id="tournament.lobby.tournament-ongoing" />
            <StyledButton onClick={() => navigate("/tournament")}>
              {alreadyJoined
                ? formatMessage({ id: "tournament.lobby.rejoin-tournament" })
                : formatMessage({
                    id: "tournament.lobby.spectate",
                  })}
            </StyledButton>
          </>
        )}
        {tournamentData?.status === "completed" && (
          <>
            <Subtitle>
              <FormattedMessage id="tournament.lobby.current-champion" />
              {tournamentData?.previousWinner}
            </Subtitle>
            <StyledButton disabled={loading} onClick={createTournament}>
              <FormattedMessage id="tournament.lobby.create-new-tournament" />
            </StyledButton>
          </>
        )}
        {tournamentData?.status === "no_tournament" && (
          <>
            <FormattedMessage id="tournament.lobby.no-active-tournament" />
            <StyledButton disabled={loading} onClick={createTournament}>
              <FormattedMessage id="tournament.lobby.create-new-tournament" />
            </StyledButton>
          </>
        )}

        {tournamentData?.status === "waiting" && (
          <>
            <Subtitle>
              <FormattedMessage id="tournament.lobby.current-champion" />
              {tournamentData?.previousWinner}
            </Subtitle>
            <FormattedMessage id="tournament.lobby.tournament-starting" />
            <StyledButton
              disabled={loading}
              onClick={() => {
                if (alreadyJoined) {
                  navigate("/tournament/queue");
                } else {
                  joinTournament();
                }
              }}
            >
              {alreadyJoined
                ? formatMessage({ id: "tournament.lobby.return-to-queue" })
                : formatMessage({ id: "tournament.lobby.join-tournament" })}
            </StyledButton>
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
