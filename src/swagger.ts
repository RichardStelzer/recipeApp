import swaggerAutogen from 'swagger-autogen'

const doc = {
  info: {
    version: 'v1.0.0',
    title: 'Swagger for recipeApp',
    description: 'Implementation of Swagger with TypeScript',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'super server haja',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
    schemas: {
      /* User API */
      getUserById: {
        userId: 1,
      },
      patchUser: {
        first_name: 'Max',
        last_name: 'Mustermann',
        $email: 'max.mustermann@muster.de',
        language: {
          '@enum': ['de', 'es', 'fr', 'be', 'en'],
        },
        country: {
          '@enum': ['DE', 'ES', 'FR', 'BE', 'GB'],
        },
      },
      createUser: {
        first_name: 'Max',
        last_name: 'Mustermann',
        $email: 'max.mustermann@muster.de',
        language: {
          '@enum': ['de', 'es', 'fr', 'be', 'en'],
        },
        country: {
          '@enum': ['DE', 'ES', 'FR', 'BE', 'GB'],
        },
      },
      deleteUser: {
        userId: 1,
      },

      /* Recipe API */
      getRecipes: {
        'filter by columns': {
          '@enum': [
            'id',
            'title',
            'category',
            'author_last_name',
            'author_email',
          ],
        },
        'sort by columns': {
          '@enum': [
            'id',
            'first_created',
            'title',
            'author_last_name',
            'author_email',
            'category',
          ],
        },
      },
      createRecipe: {
        title: 'Pfannkuchen deluxe',
        category: {
          name: 'Pfannengericht',
          text: 'Alles was in der Pfanne zubereitet wird.',
        },
        ingredient: [
          {
            name: 'Ei',
            text: 'Na ein Ei halt',
            name_plural: 'Eier',
            measurement_unit: 'mittelgroß',
            measurement_quantity: 3,
          },
          {
            name: 'Butter',
            text: 'Na Butter halt',
            name_plural: 'Butter',
            measurement_unit: 'g',
            measurement_quantity: 250,
          },
        ],
        description:
          'Solides Gericht geht so und so bla bla super Beschreibung.',
        steps: '1. Tu dies 2. Tu das 3. Aha 4. Oho 5. Oh no',
      },
    },
  },
}

const outputFile = './swagger_output.json'
const endpointsFiles = [
  './src/routes/user-routes.ts',
  './src/routes/recipe-routes.ts',
]

swaggerAutogen({ openapi: '3.0.0' })(outputFile, endpointsFiles, doc)
