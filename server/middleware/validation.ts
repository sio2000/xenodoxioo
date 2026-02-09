
import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ValidationError } from "../lib/errors";

export function validate(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const details = error.errors.reduce(
                    (acc, curr) => {
                        const key = curr.path.join(".");
                        acc[key] = curr.message;
                        return acc;
                    },
                    {} as Record<string, string>,
                );
                next(new ValidationError("Validation failed", details));
            } else {
                next(error);
            }
        }
    };
}
