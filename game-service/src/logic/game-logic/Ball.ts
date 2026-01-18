import { BALL_RADIUS, BALL_SPEED } from "./constants";

export class Ball {
  x: number;
  y: number;
  radius: number = BALL_RADIUS;
  xSpeed: number;
  ySpeed: number;

  constructor(x: number, y: number, speed: number) {
    this.x = x;
    this.y = y;

    // Randomly choose -1 or 1 for both directions
    const xDir = Math.random() < 0.5 ? -1 : 1;
    const yDir = Math.random() < 0.5 ? -1 : 1;

    this.xSpeed = speed * xDir;
    this.ySpeed = speed * yDir;
  }

  move(): void {
    this.x += this.xSpeed;
    this.y += this.ySpeed;
  }

  reset(): void {
    this.x = 50;
    this.y = 50;

    // Randomly choose -1 or 1 for both directions
    const xDir = Math.random() < 0.5 ? -1 : 1;
    const yDir = Math.random() < 0.5 ? -1 : 1;

    this.xSpeed = BALL_SPEED * xDir;
    this.ySpeed = BALL_SPEED * yDir;
  }
}
