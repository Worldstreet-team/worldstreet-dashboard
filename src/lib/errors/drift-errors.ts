// ── Custom Error Classes ───────────────────────────────────────────────────

export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, identifier: string) {
    super(`${resource} not found: ${identifier}`);
    this.name = 'NotFoundError';
  }
}

export class ResourceExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceExhaustedError';
  }
}

export class SystemError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'SystemError';
  }
}

export class TransactionError extends Error {
  constructor(
    message: string,
    public signature?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}
