import { Pool } from 'pg'
import { Database } from '../database'
import { DatabaseError, NotFoundError, ValidationError } from '../utils/errors'

export const getUser = async (
  filter: string | undefined,
  sortParam: string,
  limit: number,
  currentPage: number,
) => {
  let orderByColumn: string = ''
  let filterKeyValuePair: { [key: string]: string } = {}
  let orderByType: string = 'asc' // + -> ASC, - -> DESC

  let offset: number = limit * currentPage

  // Process filter query input
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
            translatedFilterKey = 'tu.id'
            break
          case 'first_name':
            translatedFilterKey = 'tu.first_name'
            break
          case 'last_name':
            translatedFilterKey = 'tu.last_name'
            break
          case 'email':
            translatedFilterKey = 'tu.email'
            break
          default:
            throw new ValidationError(
              `The parameter "${filter}" is not available for filtering.`,
            )
        }
        filterKeyValuePair[translatedFilterKey] = splitSingleFilter[1]
      } else {
        throw new ValidationError(
          `Filter query parameter "${filter}" is incomplete. Make sure the key:value pair is complete.`,
        )
      }
    }
  }

  // Process and validate sort parameter
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
      orderByColumn = 'tu.id'
      break
    case 'first_name':
      orderByColumn = 'tu.first_name'
      break
    case 'last_name':
      orderByColumn = 'tu.last_name'
      break
    case 'email':
      orderByColumn = 'tu.email'
      break
    default:
      throw new ValidationError(
        `The parameter "${orderByColumn}" is not available for sorting.`,
      )
  }

  // Query the database
  let filteredUsers = null
  const baseSql = `select
                        tu.id,
                        tu.first_name, 
                        tu.last_name,
                        tu.email,
                    from t_user tu
                    where 1=1`

  if (Object.keys(filterKeyValuePair).length === 0) {
    let sql = baseSql
    sql += ` order by ${orderByColumn} ${orderByType} limit $1 offset $2`
    filteredUsers = await Database.getInstance()!.query(sql, [limit, offset])
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
    filteredUsers = await Database.getInstance()!.query(sql, values)
  }

  if (filteredUsers.rows.length === 0) {
    throw new NotFoundError(`No users found.`)
  }

  const filteredData = {
    total_user: filteredUsers.rows.length,
    currentPage: currentPage,
    offset: offset,
    users: filteredUsers.rows,
  }

  return filteredData
}
