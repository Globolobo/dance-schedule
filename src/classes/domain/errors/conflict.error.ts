export class ConflictError extends Error {
  readonly statusCode = 409;

  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class ClassFullError extends ConflictError {
  constructor(classInstanceId?: string) {
    const message = classInstanceId
      ? `Class is full: ${classInstanceId}`
      : "Class is full";
    super(message);
    this.name = "ClassFullError";
    Object.setPrototypeOf(this, ClassFullError.prototype);
  }
}

export class DuplicateBookingError extends ConflictError {
  constructor(userId?: string, classInstanceId?: string) {
    const message =
      userId && classInstanceId
        ? `User already booked this class: user=${userId}, class=${classInstanceId}`
        : "User already booked this class";
    super(message);
    this.name = "DuplicateBookingError";
    Object.setPrototypeOf(this, DuplicateBookingError.prototype);
  }
}
