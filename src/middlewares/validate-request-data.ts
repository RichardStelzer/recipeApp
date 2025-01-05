import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'

// Middleware to validate request parameters
export const validateParameterSchema = (schema: z.ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate the data using Zod
      schema.parse(req.params) // This will throw an error if validation fails
      next() // Validation succeeded, continue to the next middleware or route handler
    } catch (error) {
      // Validation failed, send the error response
      res.status(StatusCodes.BAD_REQUEST).json({ error })
    }
  }
}

// Middleware to validate request body
export const validateBodySchema = (schema: z.ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate the data using Zod
      schema.parse(req.body) // This will throw an error if validation fails
      next() // Validation succeeded, continue to the next middleware or route handler
    } catch (error) {
      // Validation failed, send the error response
      res.status(StatusCodes.BAD_REQUEST).json({ error })
    }
  }
}
