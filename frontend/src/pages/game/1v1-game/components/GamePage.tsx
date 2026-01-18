import { useEffect, useRef, useState } from "react";
import { Scoreboard } from "../../shared/components/Scoreboard";
import {
  WORLD_HEIGHT,
  WORLD_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  HALF_PADDLE,
} from "../../shared/constants";
import type { InputDirection } from "../../shared/types";
import type { OneOnOneGameServerState, OneOnOneMatchStatus } from "../types";
import { useNavigate, useParams } from "react-router";
import { FormattedMessage } from "react-intl";
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
} from "../../shared/styles";
import { lerp } from "../../shared/utils";
import { gameApi } from "../../../../api/gameApi";

interface Props {
  userName?: string;
}

export const GamePage = ({ userName }: Props) => {
  const [gameStatus, setGameStatus] = useState<OneOnOneMatchStatus>("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [myPaddle, setMyPaddle] = useState<"left" | "right" | null>(null);
  const [scores, setScores] = useState({ playerOne: 0, playerTwo: 0 });
  const [winner, setWinner] = useState<string | null>(null);
  const [usernames, setUsernames] = useState({
    left: "Player 1",
    right: "Player 2",
  });

  const { matchId } = useParams<{ matchId: string }>();

  const matchStartTime = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysPressed = useRef<Record<string, boolean>>({});
  const serverSnapshot = useRef<OneOnOneGameServerState | null>(null);
  const defaultPosition = useRef({
    leftY: 50,
    rightY: 50,
    ballX: 50,
    ballY: 50,
  });

  const navigate = useNavigate();

  //Poll game status before game begins
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    const pollStatus = async () => {
      while (alive && !controller.signal.aborted) {
        try {
          const res = await gameApi.get<{ status: OneOnOneMatchStatus }>(
            "/gamestatus",
            { signal: controller.signal },
          );
          const status = res.data.status;
          setGameStatus(status);

          if (status === "starting" && !matchStartTime.current) {
            matchStartTime.current = Date.now() + 5000;
            setCountdown(5);
          }

          if (status === "running") {
            matchStartTime.current = null;
            setCountdown(null);
            alive = false;
          }

          if (status === "idle") alive = false;
        } catch {
          if (controller.signal.aborted) return;
        }

        await new Promise((r) => setTimeout(r, 250));
      }
    };

    pollStatus();

    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  //Countdown effect
  useEffect(() => {
    if (countdown === null || !matchStartTime.current) return;

    const interval = setInterval(() => {
      const remainingMs = matchStartTime.current! - Date.now();
      const seconds = Math.ceil(remainingMs / 1000);

      if (seconds > 1) {
        setCountdown(seconds);
      } else {
        setCountdown(1);
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [countdown]);

  //Server polling loop
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    const pollGameState = async () => {
      while (alive && !controller.signal.aborted) {
        try {
          const res = await gameApi.get<OneOnOneGameServerState>("/gamestate", {
            params: { matchId },
            signal: controller.signal,
          });

          const snapshot = res.data;
          snapshot.serverTimestamp = Date.now();
          serverSnapshot.current = snapshot;

          if (snapshot.status === "finished") {
            setGameStatus("finished");
            setWinner(snapshot.winner);
            alive = false;
            return;
          }

          if (userName) {
            setMyPaddle(
              snapshot.players.left.username === userName
                ? "left"
                : snapshot.players.right.username === userName
                  ? "right"
                  : null,
            );
          }

          setUsernames({
            left: snapshot.players.left.username,
            right: snapshot.players.right.username,
          });

          setScores({
            playerOne: snapshot.score.left,
            playerTwo: snapshot.score.right,
          });

          defaultPosition.current.leftY = lerp(
            defaultPosition.current.leftY,
            snapshot.players.left.y,
            0.25,
          );
          defaultPosition.current.rightY = lerp(
            defaultPosition.current.rightY,
            snapshot.players.right.y,
            0.25,
          );
          defaultPosition.current.ballX = snapshot.ball.x;
          defaultPosition.current.ballY = snapshot.ball.y;
        } catch {
          if (controller.signal.aborted) return;
        }

        await new Promise((r) => setTimeout(r, 30));
      }
    };

    pollGameState();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [matchId, userName]);

  //Send movement to backend
  const sendMove = async (direction: InputDirection) => {
    try {
      const res = await gameApi.post("/move", { direction });
      if (res.status === 404) {
        // If match no longer exists, stop input
        keysPressed.current = {};
      }
    } catch {}
  };

  //Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!myPaddle || gameStatus !== "running") return;
      keysPressed.current[e.key] = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!myPaddle || gameStatus !== "running") return;
      keysPressed.current[e.key] = false;
      if (myPaddle) sendMove("STOP");
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [myPaddle, gameStatus]);

  //Time-based movement loop
  useEffect(() => {
    if (gameStatus !== "running") return;

    const interval = setInterval(() => {
      if (!myPaddle) return;

      if (keysPressed.current["ArrowUp"]) sendMove("UP");
      else if (keysPressed.current["ArrowDown"]) sendMove("DOWN");
    }, 60);

    return () => clearInterval(interval);
  }, [myPaddle, gameStatus]);

  //Touchscreen controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isTouchScreen =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouchScreen) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }

      if (!myPaddle || gameStatus !== "running") return;

      const snapshot = serverSnapshot.current;
      if (!snapshot) return;

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
      if (!myPaddle || gameStatus !== "running") return;
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
  }, [myPaddle, gameStatus]);

  //Render loop
  useEffect(() => {
    let animationFrameId = 0;

    const render = () => {
      const snapshot = serverSnapshot.current;
      const canvas = canvasRef.current;

      if (!snapshot || !canvas) {
        animationFrameId = requestAnimationFrame(render);
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

      // Draw left paddle
      ctx.fillRect(
        0 * scaleX,
        (defaultPosition.current.leftY - HALF_PADDLE) * scaleY,
        PADDLE_WIDTH * scaleX,
        PADDLE_HEIGHT * scaleY,
      );

      // Draw right paddle
      ctx.fillRect(
        (WORLD_WIDTH - PADDLE_WIDTH) * scaleX,
        (defaultPosition.current.rightY - HALF_PADDLE) * scaleY,
        PADDLE_WIDTH * scaleX,
        PADDLE_HEIGHT * scaleY,
      );

      // Draw ball
      ctx.beginPath();
      ctx.arc(
        defaultPosition.current.ballX * scaleX,
        defaultPosition.current.ballY * scaleY,
        2 * scaleX,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <GameRoot>
      <GameContainer>
        <Scoreboard
          playerLeftName={usernames.left}
          playerRightName={usernames.right}
          playerLeftScore={scores.playerOne}
          playerRightScore={scores.playerTwo}
          currentMatch={null} //Only used for tournament
        />
        <CanvasWrapper>
          {countdown !== null && (
            <CountdownOverlay>
              <Countdown>{countdown}</Countdown>
            </CountdownOverlay>
          )}
          {gameStatus === "finished" && (
            <GameFinishedOverlay>
              <GameFinishedTitle>
                <FormattedMessage id="game.match.finished" />
              </GameFinishedTitle>
              <GameFinishedSubtitle>
                <FormattedMessage id="game.match.winner" />
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
