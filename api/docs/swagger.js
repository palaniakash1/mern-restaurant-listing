import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { components } from "./components.js";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "MERN Restaurant API",
      version: "1.0.0",
      description: "Production-grade API documentation",
    },
    servers: [
      {
        url: "http://localhost:3000/api",
        description: "Local development",
      },
    ],
    components,
  },
  apis: ["./api/docs/*.swagger.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
export const swaggerUiHandler = swaggerUi;
