import type { Request, Response } from "express";

export function healthController(_request: Request, response: Response) {
  response.status(200).json({ status: "ok" });
}
