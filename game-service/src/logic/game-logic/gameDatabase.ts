import Database from "better-sqlite3";

export const db = new Database("/usr/src/app/data/game_results.db");

db.exec(`
	CREATE TABLE IF NOT EXISTS games (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
    winner_id  INTEGER NOT NULL,
    loser_id   INTEGER NOT NULL,
    played_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	)
`);

export const insertGame = db.prepare(`
	  INSERT INTO games (winner_id, loser_id)
	  VALUES (?, ?)
	`);

const selectGamesForUser = db.prepare(`
  SELECT
    winner_id,
    loser_id,
    played_at
  FROM games
  WHERE winner_id = ? OR loser_id = ?
  ORDER BY played_at DESC
  LIMIT ? OFFSET ?
`);

export type GameRow = {
  winner_id: number;
  loser_id: number;
  played_at: string;
};

export function getMatchHistoryForUser(userId: number): GameRow[] {
  return selectGamesForUser.all(userId, userId, 20, 0) as GameRow[];
}
