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
    },
  },
}

const outputFile = './swagger_output.json'
const endpointsFiles = ['./src/routes/user-routes.ts']

swaggerAutogen({ openapi: '3.0.0' })(outputFile, endpointsFiles, doc)
