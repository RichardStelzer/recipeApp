console.log('Main file started :)')

import express, { Express, Request, Response } from 'express'
import { Database } from './database'

const db1 = Database.getInstance()
const db2 = Database.getInstance()

console.log(db1 === db2) // true

/* const app: Express = express();
const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
}); */
