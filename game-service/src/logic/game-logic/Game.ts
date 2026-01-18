import {
  WORLD_HEIGHT,
  WORLD_WIDTH,
  BALL_SPEED,
  WINNING_SCORE,
} from "./constants";
import { insertGame } from "./gameDatabase";

import { Ball } from "./Ball";
import { Paddle } from "./Paddle";

export class Game {
  playerOnePaddle: Paddle;
  playerTwoPaddle: Paddle;
  myBall: Ball;

  playerOneId: number;
  playerTwoId: number;

  height = WORLD_HEIGHT;
  width = WORLD_WIDTH;

  playerOneScore: number = 0;
  playerTwoScore: number = 0;

  finished: boolean = false;

  constructor(firstId: number, secondId: number) {
    this.playerOneId = firstId;
    this.playerTwoId = secondId;

    this.playerOnePaddle = new Paddle(1, 50);
    this.playerTwoPaddle = new Paddle(this.width - 1, 50);

    this.myBall = new Ball(this.width / 2, this.height / 2, BALL_SPEED);
  }

  getGameStatus(): [Paddle, Paddle, Ball] {
    return [this.playerOnePaddle, this.playerTwoPaddle, this.myBall];
  }

  handleCollision(): void {
    const ball = this.myBall;
    const p1 = this.playerOnePaddle;
    const p2 = this.playerTwoPaddle;

    const above1 = ball.y < p1.y - p1.height / 2;

    const below1 = ball.y > p1.y + p1.height / 2;

    const withinVertical1 =
      ball.y + ball.radius >= p1.y - p1.height / 2 &&
      ball.y - ball.radius <= p1.y + p1.height / 2;

    const withinHorizontal1 =
      ball.x - ball.radius <= p1.x + p1.width / 2 && ball.x > p1.x;

    if (withinVertical1 && withinHorizontal1 && ball.xSpeed < 0) {
      ball.xSpeed *= -1;
    }

    if (withinVertical1 && withinHorizontal1 && ball.ySpeed > 0 && above1) {
      ball.ySpeed *= -1;
    }
    if (withinVertical1 && withinHorizontal1 && ball.ySpeed < 0 && below1) {
      ball.ySpeed *= -1;
    }

    const above2 = ball.y < p2.y - p2.height / 2;

    const below2 = ball.y > p2.y + p2.height / 2;

    const withinVertical2 =
      ball.y + ball.radius >= p2.y - p2.height / 2 &&
      ball.y - ball.radius <= p2.y + p2.height / 2;

    const withinHorizontal2 =
      ball.x + ball.radius >= p2.x - p2.width / 2 && ball.x < p2.x;

    if (withinVertical2 && withinHorizontal2 && ball.xSpeed > 0) {
      ball.xSpeed *= -1;
    }
    if (withinVertical2 && withinHorizontal2 && ball.ySpeed > 0 && above2) {
      ball.ySpeed *= -1;
    }
    if (withinVertical2 && withinHorizontal2 && ball.ySpeed < 0 && below2) {
    }

    if (ball.ySpeed < 0 && ball.y - ball.radius < 0) {
      ball.ySpeed *= -1;
    }

    if (ball.ySpeed > 0 && ball.y + ball.radius > this.height) {
      ball.ySpeed *= -1;
    }
  }

  setFirstPaddleUp(): void {
    this.playerOnePaddle.up = true;
    this.playerOnePaddle.down = false;
  }
  setSecondPaddleUp(): void {
    this.playerTwoPaddle.up = true;
    this.playerTwoPaddle.down = false;
  }

  setFirstPaddleDown(): void {
    this.playerOnePaddle.up = false;
    this.playerOnePaddle.down = true;
  }

  setSecondPaddleDown(): void {
    this.playerTwoPaddle.up = false;
    this.playerTwoPaddle.down = true;
  }

  setSecondPaddleNeutral(): void {
    this.playerTwoPaddle.up = false;
    this.playerTwoPaddle.down = false;
  }

  setFirstPaddleNeutral(): void {
    this.playerOnePaddle.up = false;
    this.playerOnePaddle.down = false;
  }

  getPlayerOneScore(): number {
    return this.playerOneScore;
  }

  getPlayerTwoScore(): number {
    return this.playerTwoScore;
  }

  getPlayerOneID(): number {
    return this.playerOneId;
  }

  getPlayerTwoID(): number {
    return this.playerTwoId;
  }

  checkScore(): void {
    if (this.myBall.x < 0) {
      this.playerTwoScore += 1;
      if (this.playerTwoScore >= WINNING_SCORE) {
        insertGame.run(this.playerTwoId, this.playerOneId);
        this.finished = true;
      }
      this.myBall.reset();
    }

    if (this.myBall.x > 100) {
      this.playerOneScore += 1;
      if (this.playerOneScore >= WINNING_SCORE) {
        insertGame.run(this.playerOneId, this.playerTwoId);
        this.finished = true;
      }
      this.myBall.reset();
    }
  }

  updateGame(): boolean {
    if (this.finished) return true;
    this.playerOnePaddle.move();
    this.playerTwoPaddle.move();
    this.myBall.move();
    this.handleCollision();
    this.checkScore();
    return this.finished;
  }
}
