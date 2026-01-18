export type OneOnOneMatchStatus =
  | "idle"
  | "waiting"
  | "starting"
  | "running"
  | "finished";

export type OneOnOneGameServerState = {
  matchId: string | null;
  winner: string | null;
  status: OneOnOneMatchStatus;
  tick?: number;
  serverTimestamp?: number;
  players: {
    left: { username: string; y: number; paddleSpeed: number };
    right: { username: string; y: number; paddleSpeed: number };
  };
  ball: {
    x: number;
    y: number;
    xSpeed: number;
    ySpeed: number;
    radius?: number;
  };
  score: { left: number; right: number };
};

export interface GameStatus {
  status: "idle" | "waiting" | "starting" | "running" | "finished";
  matchId?: string;
  leftPlayer?: string;
  rightPlayer?: string;
}
