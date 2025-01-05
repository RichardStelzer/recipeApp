import { Pool } from 'pg'
import { Database } from '../database'
import { DatabaseError, NotFoundError, ValidationError } from '../utils/errors'

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
  const filteredData = {
    total_recipes: filteredRecipes.rows.length,
    currentPage: currentPage,
    offset: offset,
    recipes: filteredRecipes.rows,
  }

  return filteredData
}

export const createRecipe = async (
  userId: number,
  categoryName: string,
  categoryText: string,
  recipeDescription: string,
  recipeSteps: string,
  recipeTitle: string,
  ingredients: any,
) => {
  // Get client from pg pool
  const pool = Database.getInstance() as Pool
  const client = await pool.connect()

  try {
    // Start Transaction
    await client.query('BEGIN')

    // Create category if it does not exist yet
    const insertCategoryTextblockResult = await client.query(
      'insert into t_textblock(text, first_created_by) values($1,$2) returning id',
      [categoryText, userId],
    )
    const categoryDescriptionTextblockId =
      insertCategoryTextblockResult['rows'][0].id
    const insertCategoryResult = await client.query(
      `insert into t_category(name, description_textblock_id, first_created_by)
           values($1,$2,$3) 
           on conflict (name) do update 
           set name = excluded.name 
           returning id`,
      [categoryName, categoryDescriptionTextblockId, userId],
    )
    const categoryId = insertCategoryResult['rows'][0].id
    // Create description
    const insertRecipeDescriptionResult = await client.query(
      'insert into t_textblock(text, first_created_by) values($1,$2) returning id',
      [recipeDescription, userId],
    )
    const recipeDescriptionId = insertRecipeDescriptionResult['rows'][0].id
    // Create steps
    const insertRecipeStepsResult = await client.query(
      'insert into t_textblock(text, first_created_by) values($1,$2) returning id',
      [recipeSteps, userId],
    )
    const recipeStepsId = insertRecipeStepsResult['rows'][0].id

    // Create recipe if it does not exist yet
    const insertRecipeResult = await client.query(
      `insert into t_recipe(title, description_textblock_id, author_user_id, steps_textblock_id, category_id, first_created_by) 
           values($1,$2,$3,$4,$5,$6) 
           on conflict (title, description_textblock_id, steps_textblock_id, category_id) do update 
           set title = excluded.title 
           returning id`,
      [
        recipeTitle,
        recipeDescriptionId,
        userId,
        recipeStepsId,
        categoryId,
        userId,
      ],
    )
    const recipeId = insertRecipeResult['rows'][0].id
    // Process ingredients
    let ingredientArray = []
    for (let i = 0; i < ingredients.length; i++) {
      const ingredientName = ingredients[i].name
      const ingredientDescriptionText = ingredients[i].text
      const ingredientNamePlural = ingredients[i].name_plural
      const ingredientMeasurementUnit = ingredients[i].measurement_unit
      const ingredientMeasurementQuantity = ingredients[i].measurement_quantity

      // Create ingredient description textblock
      const insertIngredientDescriptionTextResult = await client.query(
        'insert into t_textblock(text, first_created_by) values($1,$2) returning id',
        [ingredientDescriptionText, userId],
      )
      const ingredientDescriptionTextblockId =
        insertIngredientDescriptionTextResult['rows'][0].id
      // Create ingredient if it does not exist yet
      const insertIngredientResult = await client.query(
        `insert into t_ingredient(name, ingredient_description_textblock, name_plural, created_by) 
             values($1,$2,$3,$4) 
             on conflict (name, name_plural) do update 
             set name = excluded.name 
             returning id`,
        [
          ingredientName,
          ingredientDescriptionTextblockId,
          ingredientNamePlural,
          userId,
        ],
      )
      const ingredientId = insertIngredientResult['rows'][0].id
      // Create measurement quantity if it does not exist yet
      const insertMeasurementQuantityResult = await client.query(
        `insert into t_measurement_quantity(quantity, first_created_by) values($1,$2) 
             on conflict (quantity) do update 
             set quantity = excluded.quantity 
             returning id`,
        [ingredientMeasurementQuantity, userId],
      )
      const measurementQuantityId =
        insertMeasurementQuantityResult['rows'][0].id
      // Create measurement unit if it does not exist yet
      const insertMeasurementUnitResult = await client.query(
        `insert into t_measurement_unit(unit, first_created_by) 
             values($1,$2) on conflict (unit) do update 
             set unit = excluded.unit 
             returning id`,
        [ingredientMeasurementUnit, userId],
      )
      const measurementUnitId = insertMeasurementUnitResult['rows'][0].id
      // Create connection between ingredient, measurement unit, measurement quantity and recipe
      const insertRecipeIngredientResult = await client.query(
        `insert into t_recipe_ingredient(recipe_id, ingredient_id, measurement_unit_id, measurement_quantity_id, first_created_by) 
             values($1,$2,$3,$4,$5) 
             on conflict (recipe_id, ingredient_id, measurement_unit_id, measurement_quantity_id) do nothing`,
        [
          recipeId,
          ingredientId,
          measurementUnitId,
          measurementQuantityId,
          userId,
        ],
      )
      ingredientArray.push({
        name: ingredientName,
        namePlural: ingredientNamePlural,
        description: ingredientDescriptionText,
        measurementUnit: ingredientMeasurementUnit,
        measurementQuantity: ingredientMeasurementQuantity,
      })
    }

    // Commit transaction
    await client.query('COMMIT')

    return {
      title: recipeTitle,
      description: recipeDescription,
      categoryName: categoryName,
      categoryText: categoryText,
      steps: recipeSteps,
      ingredients: ingredientArray,
    }
  } catch (error) {
    // Rollback
    await client.query('ROLLBACK')
    throw new DatabaseError(`Something went wrong, recipe was not created.`)
  } finally {
    client.release()
  }
}
