import express, { Express, Request, Response } from 'express'
import { User } from '../models/user'
import { Database } from '../database'
import { StatusCodes } from 'http-status-codes'

const userRouter = express.Router()
// Get users
userRouter.get('/users', async (_req: Request, res: Response) => {
  try {
    const allUsers = await Database.getInstance()!.query('select * from t_user')
    if (!allUsers) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ msg: `There are no users yet ..` })
    }
    res
      .status(StatusCodes.OK)
      .json({ total_user: allUsers.rows.length, users: allUsers.rows })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error })
  }
})

// Get user by id
userRouter.get('/users/:userId', async (req: Request, res: Response, next) => {
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

export { userRouter }