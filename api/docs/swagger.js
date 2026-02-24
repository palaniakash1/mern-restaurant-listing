import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { components } from "./components.js";

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "MERN Restaurant API",
      version: "1.1.0",
      description:
        "Enterprise-grade API documentation for authentication, user, restaurant, category, menu, admin, and audit workflows.",
      contact: {
        name: "Palani Akash Team",
      },
    },
    servers: [
      {
        url: "http://localhost:3000/api",
        description: "Local development",
      },
      {
        url: "https://api.example.com/api",
        description: "Production",
      },
    ],
    components,
  },
  apis: ["./api/docs/*.swagger.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
export const swaggerUiHandler = swaggerUi;
