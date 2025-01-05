import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { Database } from '../database'
import { Pool } from 'pg'
import * as recipeServices from '../services/recipe-service'
import { AppError } from '../utils/errors'

// Controller for getting recipes
export const getRecipe = async (req: Request, res: Response) => {
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'getRecipes'
    #swagger.description = 'Get available recipes with optional filters.'
    
    #swagger.parameters['filter'] = {
      in: 'query',
      description: 'Filter for parameter <parameter:value> and combine multiple filters separated by ;. E.g., <category:grilled dishes;author_last_name:jane> | Available parameters [id, title, category, author_last_name, author_email].',
      type: 'string',
      default: '',
    }
    #swagger.parameters['sort'] = {
      in: 'query',
      description: 'Sort by parameter and add + for ascending or - for descending sorting. E.g., <title-> | Available parameters [id, first_created, title, author_last_name, author_email, category].',
      type: 'string',
      default: 'id+'
    }
    #swagger.parameters['limit'] = {
      in: 'query',
      description: 'Max amount of recipes per page.',
      type: 'number',
      default: '5'
    }
    #swagger.parameters['page'] = {
      in: 'query',
      description: 'Current page.',
      type: 'number',
      default: '0'
    }

    #swagger.responses[200] = { description: 'OK.' }
    #swagger.responses[400] = { description: 'Bad request.'}
    #swagger.responses[404] = { description: 'There are no recipes yet.' }
    #swagger.responses[500] = { description: 'Internal server error.'}
  */

  // Parse query parameters and set default
  const defaultLimit = 5
  const defaultPage = 0
  const defaultFilter = undefined
  const defaultSort = 'id+'

  let limit: number
  !req.query['limit']
    ? (limit = defaultLimit)
    : (limit = parseInt(req.query['limit'] as string))

  let currentPage: number
  !req.query['page']
    ? (currentPage = defaultPage)
    : (currentPage = parseInt(req.query['page'] as string))

  let filter: string | undefined
  !req.query['filter']
    ? (filter = defaultFilter)
    : (filter = req.query['filter'] as string)

  let sortParam: string
  !req.query['sort']
    ? (sortParam = defaultSort)
    : (sortParam = req.query['sort'] as string)

  try {
    const response = await recipeServices.getRecipe(
      filter,
      sortParam,
      limit,
      currentPage,
    )
    res.status(StatusCodes.OK).json({ response })
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error })
  }
}

// Controller for creating a new recipe
export const createRecipe = async (req: Request, res: Response) => {
  /*
    #swagger.tags = ['Recipes']
    #swagger.summary = 'createRecipe'
    #swagger.description = 'Create new recipe.'

    #swagger.parameters['userId'] = {
      required: true,
      schema: {
        type: 'number'
      }
    }

    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/createRecipe'
          }
        }
      } 
    }
    #swagger.responses[201] = { description: 'Recipe created successfully.' }
    #swagger.responses[400] = { description: 'Bad request.'}
    #swagger.responses[500] = { description: 'Internal server error.'}
    #swagger.responses[1995] = { description: 'Hello World.'}
    */

  const userId = parseInt(req.params['userId'])
  const categoryName: string = req.body['category'].name
  const categoryText: string = req.body['category'].text
  const recipeDescription: string = req.body['description']
  const recipeSteps: string = req.body['steps']
  const recipeTitle: string = req.body['title']
  const ingredients: any = req.body['ingredient']

  try {
    const response = await recipeServices.createRecipe(
      userId,
      categoryName,
      categoryText,
      recipeDescription,
      recipeSteps,
      recipeTitle,
      ingredients,
    )
    res.status(StatusCodes.CREATED).json(response)
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error })
  }
}

// Controller for updating an existing recipe
export const patchRecipe = async (req: Request, res: Response) => {
  /*
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Update an already existing recipe.'
    #swagger.description = '**description** for patchRecipe'
  */
}
