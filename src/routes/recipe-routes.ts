import express from 'express'
import {
  validateBodySchema,
  validateParameterSchema,
} from '../middlewares/validate-request-data'
import { userSchema, recipeSchema } from '../schemas/recipe-schemas'
import * as recipeController from '../controllers/recipe-controller'

const recipeRouter = express.Router()

// Get recipes
recipeRouter.get('/recipes', recipeController.getRecipe)

// Create recipe
recipeRouter.post(
  '/recipe/:userId',
  validateParameterSchema(userSchema),
  validateBodySchema(recipeSchema),
  recipeController.createRecipe,
)

// Update existing recipe
recipeRouter.patch('/recipe', recipeController.patchRecipe)

export { recipeRouter }
