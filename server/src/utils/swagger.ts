import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Game Server API',
            version: '1.0.0',
            description: 'API documentation for the game server',
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:3001',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{
            bearerAuth: [],
        }],
    },
    apis: ['./src/routes/*.ts', './src/types/*.ts'],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: any) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
    app.get('/api-docs.json', (req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(specs);
    });
}; 