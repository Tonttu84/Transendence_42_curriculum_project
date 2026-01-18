export class AppError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class Error404 extends AppError {
  constructor(message = 'Not found', details?: unknown) {
    super(message, 404, details);
  }
}

export class Error401 extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class Error403 extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class Error400 extends AppError {
  constructor(message = 'Invalid request', details?: unknown) {
    super(message, 400, details);
  }
}
