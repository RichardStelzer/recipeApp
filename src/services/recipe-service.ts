import { Database } from '../database'
import { NotFoundError, ValidationError } from '../utils/errors'

export const getRecipe = async (
  filter: string | undefined,
  sortParam: string,
  limit: number,
  currentPage: number,
) => {
  let orderByColumn: string = ''
  let filterKeyValuePair: { [key: string]: string } = {}
  let orderByType: string = 'asc' // + -> ASC, - -> DESC

  // Validate limit and page size query parameters
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

  // Process sort parameter
  // Validate order type
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
      throw new ValidationError(
        `The parameter "${orderByColumn}" is not available for sorting.`,
      )
  }

  // Query the database
  let filteredRecipes = null
  const baseSql = `select
                        tr.id,
                        tr.title, 
                        tr.first_created,
                        tu.last_name as "author_last_name",
                        tu.email as "author_email",
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

    filteredRecipes = await Database.getInstance()!.query(sql, [limit, offset])
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

  if (filteredRecipes.rows.length === 0) {
    throw new NotFoundError(`No recipes found.`)
  }
  console.log(filteredRecipes)
  const filteredData = {
    total_recipes: filteredRecipes.rows.length,
    currentPage: currentPage,
    offset: offset,
    recipes: filteredRecipes.rows,
  }

  return filteredData
}
