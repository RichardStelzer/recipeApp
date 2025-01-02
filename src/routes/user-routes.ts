import express, { Express, Request, Response } from 'express'
import { User } from '../models/user'
import { Database } from '../database'
import { StatusCodes } from 'http-status-codes'

const userRouter = express.Router()
// Get users
userRouter.get('/users', async (req: Request, res: Response) => {
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'getUsers'
    #swagger.description = '*description* for getUsers'

    #swagger.parameters['filter'] = {
      in: 'query',
      description: 'Filter for parameter <parameter:value> and combine multiple filters separated by ;. E.g., <first_name:jane;email:kingKäs@oberschlaumeier.de>. Available parameters [id, first_name, last_name, email,]',
      type: 'string',
      default: '',
    }
    #swagger.parameters['sort'] = {
      in: 'query',
      description: 'Sort by parameter and add + for ascending or - for descending sorting. E.g., <title->. Available parameters [id, first_name, last_name, email,]',
      type: 'string',
      default: 'id+'
    }

    #swagger.parameters['limit'] = {
      in: 'query',
      description: 'Max amount of users per page',
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
    #swagger.responses[404] = { description: 'No users found.' }
    #swagger.responses[500] = { description: 'Internal server error.'}
  */
  try {
    let orderByColumn: string = ''
    let filterKeyValuePair: { [key: string]: string } = {}
    let orderByType: string = 'asc' // + -> ASC, - -> DESC
    let limit: number = 5
    let currentPage: number = 0

    const columnsAvailableForFilter: string[] = [
      'id',
      'first_name',
      'last_name',
      'email',
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
    // Set default column to sort by
    if (!orderByColumn) {
      orderByColumn = 'id'
    }

    if (!columnsAvailableForFilter.includes(orderByColumn)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        msg: `The column "${orderByColumn}" is not available for sorting.`,
      })
      return
    }

    // Query the database
    let filteredUsers = null
    if (Object.keys(filterKeyValuePair).length === 0) {
      filteredUsers = await Database.getInstance()!.query(
        `select * from t_user order by ${orderByColumn} ${orderByType} limit $1 offset $2`,
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
      filteredUsers = await Database.getInstance()!.query(sql, values)
    }

    if (!filteredUsers) {
      res.status(StatusCodes.NOT_FOUND).json({ msg: `No users found ..` })
      return
    }

    res.status(StatusCodes.OK).json({
      total_user: filteredUsers.rows.length,
      currentPage: currentPage,
      offset: offset,
      users: filteredUsers.rows,
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error })
  }
})

// Get user by id
userRouter.get('/users/:userId', async (req: Request, res: Response, next) => {
  /*
    #swagger.tags = ['Users'] 
    #swagger.summary = 'getUserById'
    #swagger.description = '*description* for getUserById'

    #swagger.parameters['userId'] = {
      required: true,
      schema: {
        type: 'number'
      }
    }
    
    #swagger.responses[200] = { description: 'OK.' }
    #swagger.responses[404] = { description: 'User not found.' }
    #swagger.responses[500] = { description: 'Internal server error.'}
  */
  try {
    const userId = parseInt(req.params['userId'])
    const user = await Database.getInstance()!.query(
      'select * from t_user where id = $1',
      [userId],
    )
    if (user.rows.length === 0) {
      res.status(StatusCodes.NOT_FOUND).json({})
    } else {
      res.status(StatusCodes.OK).json({ user: user.rows })
    }
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error })
  }
})

// Create new user
userRouter.post('/user', async (req: Request, res: Response, next) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'createUser'
    #swagger.description = '**description** for createUser'

    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/createUser'
          }
        }
      } 
    }
    #swagger.responses[201] = { description: 'User created successfully.' }
    #swagger.responses[409] = { description: 'No matching country found.' }
    #swagger.responses[500] = { description: 'Internal server error.'}
    #swagger.responses[1995] = { description: 'Hello World.'}
  */

  try {
    //console.log(req)
    const first_name = req.body['first_name']
    const last_name = req.body['last_name']
    const email = req.body['email']
    const country = req.body['country']
    const countryId = await Database.getInstance()!.query(
      'select id from t_country where iso2 = $1',
      [country],
    )
    if (countryId.rows.length === 0) {
      res
        .status(StatusCodes.CONFLICT)
        .json({ noMatchingCountryFoundForCountry: country })
    } else {
      const postResult = await Database.getInstance()!.query(
        'insert into t_user(first_name, last_name, email, country_id) values($1,$2,$3,$4)',
        [first_name, last_name, email, countryId.rows[0].id],
      )
      res.status(StatusCodes.CREATED).json({
        first_name: first_name,
        last_name: last_name,
        email: email,
        country: country,
      })
    }
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error })
  }
})

// Update existing user
userRouter.patch('/users/:userId', async (req: Request, res: Response) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'patchUser'
    #swagger.description = 'Update user data.'

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
            $ref: '#/components/schemas/patchUser'
          }
        }
      } 
    }
    #swagger.responses[200] = { description: 'User updated successfully.' }
    #swagger.responses[404] = { description: 'User not found.' }
    #swagger.responses[409] = { description: 'Country not available.' }
    #swagger.responses[500] = { description: 'Internal server error.'}
  */

  try {
    // Identify user
    const userId = parseInt(req.params['userId'])
    const user = await Database.getInstance()!.query(
      'select * from t_user where id = $1',
      [userId],
    )
    if (user.rows.length === 0) {
      res.status(StatusCodes.NOT_FOUND).json({})
      return
    }

    // Update information
    const first_name = req.body['first_name']
    const last_name = req.body['last_name']
    const email = req.body['email']
    const language = req.body['language']
    const country = req.body['country']

    const countryId = await Database.getInstance()!.query(
      'select id from t_country where iso2 = $1',
      [country],
    )
    if (countryId.rows.length === 0) {
      res
        .status(StatusCodes.CONFLICT)
        .json({ noMatchingCountryFoundForCountry: country })
    } else {
      const postResult = await Database.getInstance()!.query(
        `update t_user 
         set first_name = $1, last_name = $2, email = $3, country_id = $4, language = $5
         where id = $6`,
        [first_name, last_name, email, countryId.rows[0].id, language, userId],
      )
      res.status(StatusCodes.OK).json({
        userId: userId,
        first_name: first_name,
        last_name: last_name,
        email: email,
        language: language,
        country: country,
      })
    }
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error })
  }
})

// Delete existing user
userRouter.delete('/users/:userId', async (req: Request, res: Response) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'deleteUser'
    #swagger.description = 'Delete user.'

    #swagger.parameters['userId'] = {
      required: true,
      schema: {
        type: 'number'
      }
    }
    
    #swagger.responses[204] = { description: 'User removed successfully.' }
    #swagger.responses[404] = { description: 'User not found.' }
    #swagger.responses[500] = { description: 'Internal server error.'}
  */

  try {
    // Identify user
    const userId = parseInt(req.params['userId'])
    const user = await Database.getInstance()!.query(
      'select * from t_user where id = $1',
      [userId],
    )
    if (user.rows.length === 0) {
      res.status(StatusCodes.NOT_FOUND).json({})
      return
    }

    // Delete user
    const deleteResult = await Database.getInstance()!.query(
      `delete from t_user where id = $1`,
      [userId],
    )
    res.status(StatusCodes.NO_CONTENT).json({})
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error })
  }
})

export { userRouter }
