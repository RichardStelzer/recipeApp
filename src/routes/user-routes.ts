import express from 'express'
import * as userController from '../controllers/user-controller'

const userRouter = express.Router()
// Get users
userRouter.get('/users', userController.getUser)

// Get user by id
userRouter.get('/users/:userId', userController.getUserById)

// Create user
userRouter.post('/user', userController.createUser)

// Update existing user
userRouter.patch('/users/:userId', userController.patchUser)

// Delete existing user
userRouter.delete('/users/:userId', userController.deleteUser)

export { userRouter }
