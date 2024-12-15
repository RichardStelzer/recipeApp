import { Pool } from 'pg'

// Singleton class - only one instance available
export class Database {
  private static poolInstance: Pool | null = null
  // private to prevent direct construction calls with the "new" operator
  //private constructor() {}

  // static getter controls access to singleton instance
  public static getInstance() {
    if (!Database.poolInstance) {
      this.poolInstance = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT),
        database: process.env.DB_NAME,
      })
      this.poolInstance.on('error', (err, _client) => {
        //https://node-postgres.com/apis/pool#events / https://node-postgres.com/features/pooling
        console.error('Unexpected error on idle client database class: ', err)
        process.exit(-1)
      })
      console.log('Database connection pool created -> ', this.poolInstance)
    }

    return this.poolInstance
  }
}
