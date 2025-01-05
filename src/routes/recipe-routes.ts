import express, { NextFunction, Request, Response } from 'express'
import { Database } from '../database'
import { StatusCodes } from 'http-status-codes'
import { Pool } from 'pg'
import {
  validateBodySchema,
  validateParameterSchema,
} from '../middlewares/validate-request-data'
import { userSchema, recipeSchema } from '../schemas/recipe-schemas'

const recipeRouter = express.Router()
// Get recipes
recipeRouter.get('/recipes', async (req: Request, res: Response) => {
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'getRecipes'
    #swagger.description = 'Get available recipes with optional filters.'
    
    #swagger.parameters['filter'] = {
      in: 'query',
      description: 'Filter for parameter <parameter:value> and combine multiple filters separated by ;. E.g., <category:grilled dishes;author_last_name:jane> | Available parameters [id, title, category, author_last_name, author_email]',
      type: 'string',
      default: '',
    }
    #swagger.parameters['sort'] = {
      in: 'query',
      description: 'Sort by parameter and add + for ascending or - for descending sorting. E.g., <title-> | Available parameters [id, first_created, title, author_last_name, author_email, category]',
      type: 'string',
      default: 'id+'
    }
    #swagger.parameters['limit'] = {
      in: 'query',
      description: 'Max amount of recipes per page',
      type: 'number',
      default: '5'
    }
    #swagger.parameters['page'] = {
      in: 'query',
      description: 'Current page',
      type: 'number',
      default: '0'
    }

    #swagger.responses[200] = { description: 'OK.' }
    #swagger.responses[400] = { description: 'Bad request.'}
    #swagger.responses[404] = { description: 'There are no recipes yet.' }
    #swagger.responses[500] = { description: 'Internal server error.'}
  */
  try {
    let orderByColumn: string = ''
    let filterKeyValuePair: { [key: string]: string } = {}
    let orderByType: string = 'asc' // + -> ASC, - -> DESC
    let limit: number = 5
    let currentPage: number = 0

    // Validate limit and page size query parameters
    if (typeof req.query['limit'] === 'string') {
      limit = parseInt(req.query['limit'])
    }
    if (typeof req.query['page'] === 'string') {
      currentPage = parseInt(req.query['page'])
    }
    let offset: number = limit * currentPage

    // Process filter query input
    const filter = req.query['filter']
    if (typeof filter === 'string') {
      const splitFilter = filter.split(';')
      for (let i = 0; i < splitFilter.length; i++) {
        const singleFilter = splitFilter[i]
        if (singleFilter.includes(':')) {
          const splitSingleFilter = singleFilter.split(':')
          // Translate input and validate
          let translatedFilterKey = ''
          switch (splitSingleFilter[0]) {
            case 'id':
              translatedFilterKey = 'tr.id'
              break
            case 'title':
              translatedFilterKey = 'tr.title'
              break
            case 'category':
              translatedFilterKey = 'tc.name'
              break
            case 'author_last_name':
              translatedFilterKey = 'tu.last_name'
              break
            case 'author_email':
              translatedFilterKey = 'tu.email'
              break
            default:
              res.status(StatusCodes.BAD_REQUEST).json({
                msg: `The parameter "${filter}" is not available for filtering.`,
              })
              return
          }
          filterKeyValuePair[translatedFilterKey] = splitSingleFilter[1]
        } else {
          res.status(StatusCodes.BAD_REQUEST).json({
            msg: `Filter query parameter is incomplete. Make sure the parameter:value pair is complete.`,
          })
          return
        }
      }
    }

    // Process sort parameter
    // Validate order type
    const sortParam = String(req.query['sort'])
    if (typeof sortParam === 'string') {
      switch (sortParam.slice(-1)) {
        case '+':
          orderByType = 'asc'
          orderByColumn = sortParam.slice(0, -1)
          break
        case '-':
          orderByType = 'desc'
          orderByColumn = sortParam.slice(0, -1)
          break
        default:
          orderByType = 'asc'
          orderByColumn = sortParam
      }
    }
    // Translate input and validate
    switch (orderByColumn) {
      case 'id':
        orderByColumn = 'tr.id'
        break
      case 'first_created':
        orderByColumn = 'tr.first_created'
        break
      case 'title':
        orderByColumn = 'tr.title'
        break
      case 'category':
        orderByColumn = 'tc.name'
        break
      case 'author_last_name':
        orderByColumn = 'tu.last_name'
        break
      case 'author_email':
        orderByColumn = 'tu.email'
        break
      default:
        res.status(StatusCodes.BAD_REQUEST).json({
          msg: `The parameter "${orderByColumn}" is not available for sorting.`,
        })
        return
    }

    // Query the database
    let filteredRecipes = null
    const baseSql = `select tr.id,
                            tr.title, 
                            tr.first_created,
                            tu.last_name as "author_last_name" , 
                            tu.email as "author_email" , 
                            tc.name as "category", 
                            tt.text as "description", 
                            tt2.text as "steps" 
                    from t_recipe tr  
                    left join t_user tu
                    on tu.id = tr.author_user_id
                    left join t_category tc
                    on tc.id = tr.category_id
                    left join t_textblock tt
                    on tt.id = tr.description_textblock_id
                    left join t_textblock tt2
                    on tt2.id = tr.steps_textblock_id
                    where 1=1`

    if (Object.keys(filterKeyValuePair).length === 0) {
      let sql = baseSql
      sql += ` order by ${orderByColumn} ${orderByType} limit $1 offset $2`

      filteredRecipes = await Database.getInstance()!.query(sql, [
        limit,
        offset,
      ])
    } else {
      // Dynamically create the sql
      let sql = baseSql
      let values = []
      Object.keys(filterKeyValuePair).forEach((key, index) => {
        sql += ` AND ${key} = $${index + 1}`
        values.push(filterKeyValuePair[key])
      })
      sql += ` order by ${orderByColumn} ${orderByType} limit $${values.length + 1} offset $${values.length + 2}`
      values.push(limit, offset)
      filteredRecipes = await Database.getInstance()!.query(sql, values)
    }

    if (!filteredRecipes) {
      res.status(StatusCodes.NOT_FOUND).json({ msg: `No recipes found ..` })
      return
    }

    res.status(StatusCodes.OK).json({
      total_recipes: filteredRecipes.rows.length,
      currentPage: currentPage,
      offset: offset,
      recipes: filteredRecipes.rows,
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error })
  }
})

// Create recipe
recipeRouter.post(
  '/recipe/:userId',
  validateParameterSchema(userSchema),
  validateBodySchema(recipeSchema),
  async (req: Request, res: Response, next) => {
    /*
    #swagger.tags = ['Recipes']
    #swagger.summary = 'createRecipe'
    #swagger.description = '**description** for createRecipe'

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
  },
)

// Update existing recipe
recipeRouter.patch('/recipe', async (req: Request, res: Response, next) => {
  /*
    #swagger.tags = ['Recipes']
    #swagger.summary = 'patchRecipe'
    #swagger.description = '**description** for patchRecipe'
  */
})

export { recipeRouter }
