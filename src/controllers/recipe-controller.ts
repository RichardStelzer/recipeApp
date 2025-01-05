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

  // Get client from pg pool
  const pool = Database.getInstance() as Pool
  const client = await pool.connect()

  try {
    // Validate input data
    const userId = parseInt(req.params['userId'])

    // Start Transaction
    await client.query('BEGIN')

    // Create category if it does not exist yet
    const categoryName = req.body['category'].name
    const categoryText = req.body['category'].text
    const insertCategoryTextblockResult = await client.query(
      'insert into t_textblock(text, first_created_by) values($1,$2) returning id',
      [categoryText, userId],
    )
    const categoryDescriptionTextblockId =
      insertCategoryTextblockResult['rows'][0].id
    const insertCategoryResult = await client.query(
      `insert into t_category(name, description_textblock_id, first_created_by)
         values($1,$2,$3) 
         on conflict (name) do update 
         set name = excluded.name 
         returning id`,
      [categoryName, categoryDescriptionTextblockId, userId],
    )
    const categoryId = insertCategoryResult['rows'][0].id
    // Create description
    const recipeDescription = req.body['description']
    const insertRecipeDescriptionResult = await client.query(
      'insert into t_textblock(text, first_created_by) values($1,$2) returning id',
      [recipeDescription, userId],
    )
    const recipeDescriptionId = insertRecipeDescriptionResult['rows'][0].id
    // Create steps
    const recipeSteps = req.body['steps']
    const insertRecipeStepsResult = await client.query(
      'insert into t_textblock(text, first_created_by) values($1,$2) returning id',
      [recipeSteps, userId],
    )
    const recipeStepsId = insertRecipeStepsResult['rows'][0].id
    // Create recipe if it does not exist yet
    const recipeTitle = req.body['title']
    const insertRecipeResult = await client.query(
      `insert into t_recipe(title, description_textblock_id, author_user_id, steps_textblock_id, category_id, first_created_by) 
         values($1,$2,$3,$4,$5,$6) 
         on conflict (title, description_textblock_id, steps_textblock_id, category_id) do update 
         set title = excluded.title 
         returning id`,
      [
        recipeTitle,
        recipeDescriptionId,
        userId,
        recipeStepsId,
        categoryId,
        userId,
      ],
    )
    const recipeId = insertRecipeResult['rows'][0].id
    // Process ingredients
    let ingredientArray = []
    for (let i = 0; i < req.body['ingredient'].length; i++) {
      const ingredientName = req.body['ingredient'][i].name
      const ingredientDescriptionText = req.body['ingredient'][i].text
      const ingredientNamePlural = req.body['ingredient'][i].name_plural
      const ingredientMeasurementUnit =
        req.body['ingredient'][i].measurement_unit
      const ingredientMeasurementQuantity =
        req.body['ingredient'][i].measurement_quantity

      // Create ingredient description textblock
      const insertIngredientDescriptionTextResult = await client.query(
        'insert into t_textblock(text, first_created_by) values($1,$2) returning id',
        [ingredientDescriptionText, userId],
      )
      const ingredientDescriptionTextblockId =
        insertIngredientDescriptionTextResult['rows'][0].id
      // Create ingredient if it does not exist yet
      const insertIngredientResult = await client.query(
        `insert into t_ingredient(name, ingredient_description_textblock, name_plural, created_by) 
           values($1,$2,$3,$4) 
           on conflict (name, name_plural) do update 
           set name = excluded.name 
           returning id`,
        [
          ingredientName,
          ingredientDescriptionTextblockId,
          ingredientNamePlural,
          userId,
        ],
      )
      const ingredientId = insertIngredientResult['rows'][0].id
      // Create measurement quantity if it does not exist yet
      const insertMeasurementQuantityResult = await client.query(
        `insert into t_measurement_quantity(quantity, first_created_by) values($1,$2) 
           on conflict (quantity) do update 
           set quantity = excluded.quantity 
           returning id`,
        [ingredientMeasurementQuantity, userId],
      )
      const measurementQuantityId =
        insertMeasurementQuantityResult['rows'][0].id
      // Create measurement unit if it does not exist yet
      const insertMeasurementUnitResult = await client.query(
        `insert into t_measurement_unit(unit, first_created_by) 
           values($1,$2) on conflict (unit) do update 
           set unit = excluded.unit 
           returning id`,
        [ingredientMeasurementUnit, userId],
      )
      const measurementUnitId = insertMeasurementUnitResult['rows'][0].id
      // Create connection between ingredient, measurement unit, measurement quantity and recipe
      const insertRecipeIngredientResult = await client.query(
        `insert into t_recipe_ingredient(recipe_id, ingredient_id, measurement_unit_id, measurement_quantity_id, first_created_by) 
           values($1,$2,$3,$4,$5) 
           on conflict (recipe_id, ingredient_id, measurement_unit_id, measurement_quantity_id) do nothing`,
        [
          recipeId,
          ingredientId,
          measurementUnitId,
          measurementQuantityId,
          userId,
        ],
      )
      ingredientArray.push({
        name: ingredientName,
        namePlural: ingredientNamePlural,
        description: ingredientDescriptionText,
        measurementUnit: ingredientMeasurementUnit,
        measurementQuantity: ingredientMeasurementQuantity,
      })
    }

    // Commit transaction
    await client.query('COMMIT')

    res.status(StatusCodes.CREATED).json({
      title: recipeTitle,
      description: recipeDescription,
      categoryName: categoryName,
      categoryText: categoryText,
      steps: recipeSteps,
      ingredients: ingredientArray,
    })
  } catch (error) {
    // Rollback
    await client.query('ROLLBACK')
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error })
  } finally {
    client.release()
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
