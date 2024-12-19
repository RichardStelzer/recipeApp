import express, { Express, Request, Response } from 'express'
/* import { Recipe } from '../models/recipe'
 */ import { Database } from '../database'
import { StatusCodes } from 'http-status-codes'

const recipeRouter = express.Router()
// Get recipes
recipeRouter.get('/recipes', async (_req: Request, res: Response) => {
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'getRecipes'
    #swagger.description = '*description* for getRecipes'
    
    #swagger.responses[200] = { description: 'OK.' }
    #swagger.responses[404] = { description: 'There are no recipes yet.' }
    #swagger.responses[500] = { description: 'Internal server error.'}
  */
  try {
    const allRecipes = await Database.getInstance()!.query(
      'select * from t_recipe',
    )
    if (!allRecipes) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ msg: `There are no recipes yet ..` })
    }
    res
      .status(StatusCodes.OK)
      .json({ total_user: allRecipes.rows.length, users: allRecipes.rows })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error })
  }
})

export { recipeRouter }
