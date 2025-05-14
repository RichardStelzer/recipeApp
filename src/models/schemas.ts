import { z } from 'zod'

export const userSchema = z.object({
  userId: z
    .string()
    .refine(
      (value) => {
        const parsed = Number(value)
        return Number.isInteger(parsed) && !isNaN(parsed)
      },
      {
        message: 'Value should be convertible to an integer',
      },
    )
    .optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z
    .string()
    .min(1, { message: 'This field has to be filled.' })
    .email('This is not a valid email.')
    .optional(),
  language: z.enum(['de', 'es', 'fr', 'be', 'en']).optional(),
  country: z.enum(['DE', 'ES', 'FR', 'BE', 'GB']).optional(),
})

export const ingredientSchema = z.object({
  name: z.string(),
  text: z.string().optional(),
  name_plural: z.string(),
  measurement_unit: z.string(),
  measurement_quantity: z.number(),
})

export const categorySchema = z.object({
  name: z.string(),
  text: z.string(),
})

export const recipeSchema = z.object({
  title: z.string(),
  category: categorySchema,
  ingredient: z.array(ingredientSchema),
  description: z.string(),
  steps: z.string(),
})
