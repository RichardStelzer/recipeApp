import express, { Express, Request, Response } from 'express'
/* import { Recipe } from '../models/recipe'
 */ import { Database } from '../database'
import { StatusCodes } from 'http-status-codes'

const recipeRouter = express.Router()
// Get recipes
recipeRouter.get('/recipes', async (req: Request, res: Response) => {
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'getRecipes'
    #swagger.description = 'Get available recipes with optional filters.'
    
    #swagger.parameters['filter'] = {
      in: 'query',
      description: 'Filter for parameter <parameter:value> and combine multiple filters separated by ;. E.g., <category:grilled dishes;author_last_name:jane> | Available parameters [id, first_created, title, category, author_last_name, ingredient]',
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

    const columnsAvailableForFilter: string[] = [
      'tr.id',
      'tr.title',
      'tr.first_created',
      'tu.last_name',
      'tu.email',
      'tc.name',
      'tt.text',
      'tt2.text',
    ]

    const columnsAvailableForSort: string[] = [
      'tr.id',
      'tr.title',
      'tr.first_created',
      'tu.last_name',
      'tu.email',
      'tc.name',
    ]

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
          filterKeyValuePair[splitSingleFilter[0]] = splitSingleFilter[1]
        } else {
          res.status(StatusCodes.BAD_REQUEST).json({
            msg: `Filter query parameter is incomplete. Make sure the parameter:value pair is complete.`,
          })
          return
        }
      }
    }
    // Validate columns from query parameters
    for (let i = 0; i < Object.keys(filterKeyValuePair).length; i++) {
      const key = Object.keys(filterKeyValuePair)[i]
      if (!columnsAvailableForFilter.includes(key)) {
        res.status(StatusCodes.BAD_REQUEST).json({
          msg: `The parameter "${filter}" is not available for filtering.`,
        })
        return
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
    // Translate sort param to table
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
        orderByColumn = 'tr.id'
    }

    if (!columnsAvailableForSort.includes(orderByColumn)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        msg: `The column "${orderByColumn}" is not available for sorting.`,
      })
      return
    }

    // Query the database
    let filteredRecipes = null
    if (Object.keys(filterKeyValuePair).length === 0) {
      filteredRecipes = await Database.getInstance()!.query(
        `select tr.id,
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
         order by ${orderByColumn} ${orderByType} limit $1 offset $2`,
        [limit, offset],
      )
    } else {
      // Dynamically create the sql
      let sql = 'select * from t_user where 1=1'
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

export { recipeRouter }
