import { useEffect, useRef, useState } from "react";
import { Scoreboard } from "../shared/components/Scoreboard";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../shared/constants";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  HALF_PADDLE,
} from "../shared/constants";
import type { TournamentServerState, TournamentStatus } from "./types";
import type { InputDirection } from "../shared/types";
import { lerp } from "../shared/utils";
import {
  CanvasWrapper,
  Countdown,
  CountdownOverlay,
  GameContainer,
  GameFinishedOverlay,
  GameFinishedSubtitle,
  GameFinishedTitle,
  GameRoot,
  StyledButton,
} from "../shared/styles";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router";
import { tournamentApi } from "../../../api/tournamentApi";

interface Props {
  userName?: string;
}

export const TournamentMatchPage = ({ userName }: Props) => {
  const [gameStatus, setGameStatus] = useState<TournamentStatus>("waiting");
  const [currentMatch, setMatchType] = useState<string | null>(null);
  const [matchStatus, setMatchStatus] = useState<"starting" | "running" | null>(
    null,
  );
  const [countdown, setCountdown] = useState<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [scores, setScores] = useState({ left: 0, right: 0 });
  const [myPaddle, setMyPaddle] = useState<"left" | "right" | null>(null);
  const [usernames, setUsernames] = useState({
    left: "Player 1",
    right: "Player 2",
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const matchStartTime = useRef<number | null>(null);
  const keysPressed = useRef<Record<string, boolean>>({});
  const serverSnapshot = useRef<TournamentServerState["currentMatch"] | null>(
    null,
  );

  const defaultPosition = useRef({
    leftY: WORLD_HEIGHT / 2,
    rightY: WORLD_HEIGHT / 2,
    ballX: WORLD_WIDTH / 2,
    ballY: WORLD_HEIGHT / 2,
  });

  const navigate = useNavigate();
  const { formatMessage } = useIntl();

  // Countdown effect
  useEffect(() => {
    if (countdown === null || !matchStartTime.current) return;

    const interval = setInterval(() => {
      const remaining = matchStartTime.current! - Date.now();
      const seconds = Math.ceil(remaining / 1000);

      setCountdown(seconds > 0 ? seconds : 1);

      if (seconds <= 1) clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, [countdown]);

  // Poll server state
  useEffect(() => {
    let alive = true;

    const pollGameState = async () => {
      while (alive) {
        try {
          const { data: snapshot } =
            await tournamentApi.get<TournamentServerState>("/status");

          setGameStatus(snapshot.status);

          if (snapshot.status === "waiting" && !snapshot.currentMatch) {
            if (!alive) return;
            navigate("/tournament/lobby");
          }

          if (
            snapshot.currentMatch?.status === "starting" &&
            !matchStartTime.current
          ) {
            matchStartTime.current = Date.now() + 5000;
            setCountdown(5);
          }

          if (snapshot.currentMatch?.status === "running") {
            matchStartTime.current = null;
            setCountdown(null);
          }

          if (snapshot.status === "idle") {
            alive = false;
          }

          if (snapshot.status === "completed") {
            setGameStatus("completed");
            setWinner(snapshot.previousWinner);
            alive = false;
          }

          if (userName && snapshot.currentMatch) {
            serverSnapshot.current = snapshot.currentMatch;
            setMatchStatus(snapshot.currentMatch.status);

            const match = snapshot.currentMatch;

            if (match.players.left.username === userName) setMyPaddle("left");
            else if (match.players.right.username === userName)
              setMyPaddle("right");
            else setMyPaddle(null);

            setScores(match.score);
            setMatchType(match.matchType);
            setUsernames({
              left: match.players.left.username,
              right: match.players.right.username,
            });

            defaultPosition.current.leftY = lerp(
              defaultPosition.current.leftY,
              match.players.left.y,
              0.25,
            );
            defaultPosition.current.rightY = lerp(
              defaultPosition.current.rightY,
              match.players.right.y,
              0.25,
            );

            defaultPosition.current.ballX = match.ball.x;
            defaultPosition.current.ballY = match.ball.y;
          }

          await new Promise((r) => setTimeout(r, 30));
        } catch {
          await new Promise((r) => setTimeout(r, 100));
        }
      }
    };

    pollGameState();
    return () => {
      alive = false;
    };
  }, [userName, navigate]);

  //Send movement to backend
  const sendMove = async (direction: InputDirection) => {
    if (!myPaddle || serverSnapshot.current?.status !== "running") return;

    try {
      const res = await tournamentApi.post("/move", { direction });
      if (res.status === 404) {
        // If match no longer exists, stop input
        keysPressed.current = {};
      }
    } catch {}
  };

  //Keyboard controls
  useEffect(() => {
    if (!myPaddle || matchStatus !== "running") return;
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
      sendMove("STOP");
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [myPaddle, matchStatus]);

  //Time-based movement loop
  useEffect(() => {
    if (!myPaddle || matchStatus !== "running") return;

    const interval = setInterval(() => {
      if (keysPressed.current["ArrowUp"]) sendMove("UP");
      else if (keysPressed.current["ArrowDown"]) sendMove("DOWN");
    }, 60);

    return () => clearInterval(interval);
  }, [myPaddle, matchStatus]);

  //Touchscreen controls
  useEffect(() => {
    if (!myPaddle || matchStatus !== "running") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const isTouchScreen =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouchScreen) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const touchY = ((touch.clientY - rect.top) / rect.height) * WORLD_HEIGHT;

      const paddleY =
        myPaddle === "left"
          ? defaultPosition.current.leftY
          : defaultPosition.current.rightY;

      sendMove(touchY < paddleY ? "UP" : "DOWN");
    };

    const handleTouchEnd = () => {
      sendMove("STOP");
    };

    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [myPaddle, matchStatus]);

  //Render loop
  useEffect(() => {
    let animationFrameId = 0;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scaleX = canvas.width / WORLD_WIDTH;
      const scaleY = canvas.height / WORLD_HEIGHT;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-text")
        .trim();

      // Left paddle
      ctx.fillRect(
        0,
        (defaultPosition.current.leftY - HALF_PADDLE) * scaleY,
        PADDLE_WIDTH * scaleX,
        PADDLE_HEIGHT * scaleY,
      );

      // Right paddle
      ctx.fillRect(
        (WORLD_WIDTH - PADDLE_WIDTH) * scaleX,
        (defaultPosition.current.rightY - HALF_PADDLE) * scaleY,
        PADDLE_WIDTH * scaleX,
        PADDLE_HEIGHT * scaleY,
      );

      // Ball
      ctx.beginPath();
      ctx.arc(
        defaultPosition.current.ballX * scaleX,
        defaultPosition.current.ballY * scaleY,
        2 * scaleX,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const mapMatchType = (matchType: string | null) => {
    switch (matchType) {
      case "Semifinal 1":
        return formatMessage({ id: "tournament.match.semifinal-1" });
      case "Semifinal 2":
        return formatMessage({ id: "tournament.match.semifinal-2" });
      case "Final":
        return formatMessage({ id: "tournament.match.final" });
      default:
        return null;
    }
  };

  return (
    <GameRoot>
      <GameContainer>
        <Scoreboard
          playerLeftName={usernames.left}
          playerRightName={usernames.right}
          playerLeftScore={scores.left}
          playerRightScore={scores.right}
          currentMatch={mapMatchType(currentMatch)}
        />

        <CanvasWrapper>
          {countdown !== null && (
            <CountdownOverlay>
              <Countdown>{countdown}</Countdown>
            </CountdownOverlay>
          )}
          {gameStatus === "completed" && (
            <GameFinishedOverlay>
              <GameFinishedTitle>
                <FormattedMessage id="tournament.match.finished" />
              </GameFinishedTitle>
              <GameFinishedSubtitle>
                <FormattedMessage id="tournament.match.winner" />
                {winner}
              </GameFinishedSubtitle>
              <StyledButton onClick={() => navigate("/main")}>
                <FormattedMessage id="game.match.back-to-main-menu" />
              </StyledButton>
            </GameFinishedOverlay>
          )}

          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{
              width: "100%",
              height: "auto",
              maxHeight: "90vh",
              border: "2px solid var(--color-text)",
              borderRadius: "var(--radius-large)",
              background: "var(--color-background)",
            }}
          />
        </CanvasWrapper>
      </GameContainer>
    </GameRoot>
  );
};
