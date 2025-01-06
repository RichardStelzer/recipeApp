import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import * as userServices from '../services/user-service'
import { AppError } from '../utils/errors'

export const getUser = async (req: Request, res: Response) => {
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'getUsers'
    #swagger.description = '*description* for getUsers.'

    #swagger.parameters['filter'] = {
      in: 'query',
      description: 'Filter for parameter <parameter:value> and combine multiple filters separated by ;. E.g., <first_name:jane;email:kingKäs@oberschlaumeier.de>. Available parameters [id, first_name, last_name, email].',
      type: 'string',
      default: '',
    }
    #swagger.parameters['sort'] = {
      in: 'query',
      description: 'Sort by parameter and add + for ascending or - for descending sorting. E.g., <title->. Available parameters [id, first_name, last_name, email].',
      type: 'string',
      default: 'id+'
    }

    #swagger.parameters['limit'] = {
      in: 'query',
      description: 'Max amount of users per page.',
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
    #swagger.responses[404] = { description: 'No users found.' }
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
    const response = await userServices.getUser(
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

export const getUserById = async (req: Request, res: Response) => {
  /*
    #swagger.tags = ['Users'] 
    #swagger.summary = 'getUserById'
    #swagger.description = '*description* for getUserById.'

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
}

// Create new user
export const createUser = async (req: Request, res: Response) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'createUser'
    #swagger.description = '**description** for createUser.'

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
}

export const patchUser = async (req: Request, res: Response) => {
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
}

export const deleteUser = async (req: Request, res: Response) => {
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
}
