export class NotFoundError extends Error {
  readonly statusCode = 404;

  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ClassInstanceNotFoundError extends NotFoundError {
  constructor(classInstanceId?: string) {
    const message = classInstanceId
      ? `Class instance not found: ${classInstanceId}`
      : "Class instance not found";
    super(message);
    this.name = "ClassInstanceNotFoundError";
    Object.setPrototypeOf(this, ClassInstanceNotFoundError.prototype);
  }
}

export class UserNotFoundError extends NotFoundError {
  constructor(email?: string) {
    const message = email ? `User not found: ${email}` : "User not found";
    super(message);
    this.name = "UserNotFoundError";
    Object.setPrototypeOf(this, UserNotFoundError.prototype);
  }
}
