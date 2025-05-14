import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import * as userServices from '../services/user-service'
import { AppError } from '../utils/errors'

export const getUser = async (req: Request, res: Response) => {
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'getUsers'
    #swagger.description = 'Get basic information of users.'

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
    #swagger.description = 'Get detailed information about a specific user.'

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

  const userId = parseInt(req.params['userId'])

  try {
    const response = await userServices.getUserById(userId)
    res.status(StatusCodes.OK).json({ response })
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error })
  }
}

// Create new user
export const createUser = async (req: Request, res: Response) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'createUser'
    #swagger.description = 'Create **new** user.'

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
    #swagger.responses[400] = { description: 'Bad request.' }
    #swagger.responses[500] = { description: 'Internal server error.'}
    #swagger.responses[1995] = { description: 'Hello World.'}
  */

  const first_name = req.body['first_name']
  const last_name = req.body['last_name']
  const email = req.body['email']
  const country = req.body['country']
  const language = req.body['language']

  try {
    const response = await userServices.createUser(
      first_name,
      last_name,
      email,
      country,
      language,
    )
    res.status(StatusCodes.CREATED).json({ response })
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
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
      #swagger.responses[400] = { description: 'Bad request.' }
      #swagger.responses[404] = { description: 'User not found.' }
      #swagger.responses[500] = { description: 'Internal server error.'}
    */

  const userId = parseInt(req.params['userId'])
  const first_name = req.body['first_name']
  const last_name = req.body['last_name']
  const email = req.body['email']
  const language = req.body['language']
  const country = req.body['country']

  try {
    const response = await userServices.patchUser(
      userId,
      first_name,
      last_name,
      email,
      language,
      country,
    )
    res.status(StatusCodes.OK).json({ response })
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

  const userId = parseInt(req.params['userId'])
  try {
    const response = await userServices.deleteUser(userId)
    res.status(StatusCodes.NO_CONTENT).json()
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error })
  }
}
