import express from 'express'
import {
  validateBodySchema,
  validateParameterSchema,
} from '../middlewares/validate-request-data'
import { userSchema } from '../models/schemas'
import * as userController from '../controllers/user-controller'

const userRouter = express.Router()
// Get users
userRouter.get('/users', userController.getUser)

// Get user by id
userRouter.get('/users/:userId', userController.getUserById)

// Create user
userRouter.post(
  '/user',
  validateBodySchema(userSchema, [
    'first_name',
    'last_name',
    'email',
    'language',
    'country',
  ]),
  userController.createUser,
)

// Update existing user
userRouter.patch('/users/:userId', userController.patchUser)

// Delete existing user
userRouter.delete('/users/:userId', userController.deleteUser)

export { userRouter }
