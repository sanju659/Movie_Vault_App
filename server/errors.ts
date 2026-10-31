import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          fieldErrors: err.fieldErrors,
        },
      },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      fieldErrors[key] ??= issue.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check the highlighted fields.",
          fieldErrors,
        },
      },
      { status: 400 },
    );
  }
  console.error(err); // real error stays in the server log
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Something went wrong." } },
    { status: 500 },
  );
}

export async function handle(fn: () => Promise<NextResponse>) {
  try {
    return await fn();
  } catch (err) {
    return errorResponse(err);
  }
}

export function isDuplicateKeyError(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: number }).code === 11000
  );
}
