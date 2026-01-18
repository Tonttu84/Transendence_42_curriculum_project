export type TournamentStatus =
  | "no_tournament"
  | "waiting"
  | "semifinal_1"
  | "semifinal_2"
  | "final"
  | "completed"
  | "idle";

export interface TournamentData {
  status: TournamentStatus;
  previousWinner: string;
  players?: { id: string; username: string }[];
  currentMatch?: any;
  winner: string;
}

export type TournamentServerState = {
  status: TournamentStatus;
  previousWinner: string;
  currentMatch: {
    status: "starting" | "running";
    matchType: string;
    players: {
      left: { userId: number; username: string; y: number };
      right: { userId: number; username: string; y: number };
    };
    ball: {
      x: number;
      y: number;
    };
    score: {
      left: number;
      right: number;
    };
  } | null;
};
