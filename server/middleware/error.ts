
import { Request, Response, NextFunction } from "express";
import { handleError, AppError } from "../lib/errors";

export function errorHandler(
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const { statusCode, body } = handleError(err);

    // Log 500 errors
    if (statusCode === 500) {
        console.error("Server Error:", err);
    }

    res.status(statusCode).json(body);
}
