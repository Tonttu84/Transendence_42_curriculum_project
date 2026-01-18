export class Tournament {
  status: "waiting" | "semifinal_1" | "semifinal_2" | "final" | "completed";

  player1: string | null;
  player2: string | null;
  player3: string | null;
  player4: string | null;
  semifinal1Winner: string | null;
  semifinal2Winner: string | null;
  finalWinner: string | null;
  previousWinner: string | null;

  /* takes in a player and assigns it to first player */
  constructor(firstPlayer: string, previous: string | null = null) {
    this.status = "waiting";
    this.player1 = firstPlayer;
    this.player2 = null;
    this.player3 = null;
    this.player4 = null;
    this.semifinal1Winner = null;
    this.semifinal2Winner = null;
    this.finalWinner = null;
    this.previousWinner = previous ?? "Chuck Norris";
  }

  /* takes in a player and assigns to first available spot on tournament
	if tournament is full, updates status to semifinal_1
	I hope someone is checking that, to start the game!
*/

  join(playerId: string): void {
    // ensure tournament is waiting
    if (this.status !== "waiting") {
      throw new Error("Tournament is not in waiting state");
    }

    //check if player is already in
    if (
      this.player1 === playerId ||
      this.player2 === playerId ||
      this.player3 === playerId ||
      this.player4 === playerId
    ) {
      throw new Error("Player already in tournamnet");
    }

    // add player to next available position
    if (this.player2 === null) {
      this.player2 = playerId;
    } else if (this.player3 === null) {
      this.player3 = playerId;
    } else if (this.player4 === null) {
      this.player4 = playerId;
      this.status = "semifinal_1";
    }
  }

  /* returns who is playing, and what type of match
   */
  getCurrentMatch(): {
    player1: string;
    player2: string;
    matchType: string;
  } | null {
    // if status is waiting or complete, there can be no current match
    if (this.status === "waiting" || this.status === "completed") {
      return null;
    }

    // return info for semifinal 1
    if (this.status === "semifinal_1") {
      return {
        player1: this.player1!,
        player2: this.player2!,
        matchType: "Semifinal 1",
      };
    }

    // return info for semifinal 2
    if (this.status === "semifinal_2") {
      return {
        player1: this.player3!,
        player2: this.player4!,
        matchType: "Semifinal 2",
      };
    }

    // return info for final
    if (this.status === "final") {
      return {
        player1: this.semifinal1Winner!,
        player2: this.semifinal2Winner!,
        matchType: "Final",
      };
    }
    // if nothing matches
    return null;
  }

  getTournamentInfo() {
    return {
      status: this.status,
      previousWinner: this.previousWinner,

      players: this.getPlayers(),

      // Semifinal 1 info
      semifinal1: {
        player1: this.player1,
        player2: this.player2,
        winner: this.semifinal1Winner,
      },

      // Semifinal 2 info
      semifinal2: {
        player1: this.player3,
        player2: this.player4,
        winner: this.semifinal2Winner,
      },

      // Final info
      final: {
        player1: this.semifinal1Winner,
        player2: this.semifinal2Winner,
        winner: this.finalWinner,
      },
    };
  }

  /*
   record winner and update status
   */
  recordWinner(winnerId: string): void {
    /* we could check that the person was actually in the game, or we can assume the
   program will run perfectly */

    // if we were playing a semifinal 1...
    if (this.status === "semifinal_1") {
      this.semifinal1Winner = winnerId;
      this.status = "semifinal_2";
      return;
    }

    // if we were playing a semifinal 2...
    if (this.status === "semifinal_2") {
      this.semifinal2Winner = winnerId;
      this.status = "final";
      return;
    }

    // if we were playing a final...
    if (this.status === "final") {
      this.finalWinner = winnerId;
      this.status = "completed";
      return;
    }

    throw new Error("Error in recordWinner()");
  }

  isComplete(): boolean {
    return this.status === "completed";
  }

  getWinner(): string | null {
    if (this.status === "completed") {
      return this.finalWinner;
    }
    return null;
  }

  getPreviousWinner(): string | null {
    return this.previousWinner;
  }

  getPlayers(): string[] {
    const players = [];

    if (this.player1) players.push(this.player1);
    if (this.player2) players.push(this.player2);
    if (this.player3) players.push(this.player3);
    if (this.player4) players.push(this.player4);

    return players;
  }

  isFull(): boolean {
    return (
      this.player1 !== null &&
      this.player2 !== null &&
      this.player3 !== null &&
      this.player4 !== null
    );
  }

  reset(firstPlayer: string): void {
    this.previousWinner = this.finalWinner;
    this.status = "waiting";
    this.player1 = firstPlayer;
    this.player2 = null;
    this.player3 = null;
    this.player4 = null;
    this.semifinal1Winner = null;
    this.semifinal2Winner = null;
    this.finalWinner = null;
  }
}
