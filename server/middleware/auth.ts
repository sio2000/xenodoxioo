
import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../services/auth.service";
import { AuthError, ForbiddenError } from "../lib/errors";

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

/**
 * Middleware to authenticate requests using JWT
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new AuthError("No token provided");
        }

        const token = authHeader.split(" ")[1];
        const payload = verifyToken(token);

        req.user = payload;
        next();
    } catch (error) {
        next(new AuthError("Invalid or expired token"));
    }
}

/**
 * Middleware to authorize requests based on user role
 */
export function authorize(roles: ("CUSTOMER" | "ADMIN")[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AuthError("Not authenticated"));
        }

        if (!roles.includes(req.user.role)) {
            return next(new ForbiddenError("Insufficient permissions"));
        }

        next();
    };
}
