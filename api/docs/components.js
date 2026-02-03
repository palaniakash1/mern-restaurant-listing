export const components = {
  securitySchemas: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    },
  },

  schemas: {
    Restaurant: {
      type: "object",
      properties: {
        _id: { type: "string" },
        name: { type: "string" },
        slug: { type: "string" },
        status: {
          type: "string",
          enum: ["draft", "published", "blocked"],
        },
        isActive: { type: "boolean" },
      },
    },
  },
};
