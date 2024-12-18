console.log('Main file started :)')

import express, { Express, Request, Response } from 'express'
/* import { Database } from './database'
 */
import { userRouter } from './routes/user-routes'
import bodyParser from 'body-parser'
import cors from 'cors'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import swaggerOutput from '../dist/swagger_output.json'

/* 
const db1 = Database.getInstance()
const db2 = Database.getInstance()

console.log(db1 === db2) // true
 */
const PORT = parseInt(process.env.PORT as string, 10)

const app: Express = express()

// Middleware
app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
)
app.use(cors())
app.use(helmet())

/* // log time for every request to the router
app.use((req, res, next) => {
  console.log('Time:', Date.now())
  next()
}) */

app.use('/', userRouter)

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerOutput))

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`)
})
