import { RequestHandler } from "express";
import { authenticate } from "./auth";
import { ForbiddenError } from "../lib/errors";

/** JWT required; role must be ADMIN or PROGRAMMER (pricing / tax / payment settings). */
export const requireAdminOrProgrammer: RequestHandler[] = [
  authenticate,
  (req, _res, next) => {
    const r = req.user?.role;
    if (r === "ADMIN" || r === "PROGRAMMER") return next();
    next(new ForbiddenError("Admin or programmer access required"));
  },
];
