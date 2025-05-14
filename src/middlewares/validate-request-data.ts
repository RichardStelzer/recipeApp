import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { AppError, ValidationError } from '../utils/errors'

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
export const validateBodySchema = (
  schema: z.ZodSchema<any>,
  mandatoryData?: string[],
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate the data using Zod
      const validatedData = schema.parse(req.body) // This will throw an error if validation fails

      // Check if the required field for this endpoint is present
      if (mandatoryData) {
        let badData: string[] = []
        for (const data of mandatoryData) {
          if (validatedData[data] === undefined) {
            badData.push(data)
          }
        }
        if (badData.length !== 0) {
          throw new ValidationError(
            `Required field(s) '${badData}' are missing.`,
          )
        }
      }
      next() // Validation succeeded, continue to the next middleware or route handler
    } catch (error) {
      // Validation failed, send the error response
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message })
        return
      }
      res.status(StatusCodes.BAD_REQUEST).json({ error })
    }
  }
}
