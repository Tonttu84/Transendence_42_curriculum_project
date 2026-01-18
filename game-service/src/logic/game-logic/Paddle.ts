import { PADDLE_SPEED } from "./constants";

export class Paddle {
  x: number;
  y: number;
  width: number = 3;
  height: number = 25;
  up: boolean = false;
  down: boolean = false;

  paddleSpeed: number = PADDLE_SPEED;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  move(): void {
    if (this.up) this.y -= this.paddleSpeed;

    if (this.down) this.y += this.paddleSpeed;

    if (this.y < this.height / 2) this.y = this.height / 2;

    if (this.y > 100 - this.height / 2) this.y = 100 - this.height / 2;
  }

  setUp(value: boolean): void {
    this.up = value;
  }

  setDown(value: boolean): void {
    this.down = value;
  }
}
