export const components = {
  securitySchemes: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    },
  },

  schemas: {
    Error: {
      type: "object",
      required: ["success", "statusCode", "message"],
      properties: {
        success: { type: "boolean", example: false },
        statusCode: { type: "integer", example: 400 },
        message: { type: "string", example: "Validation error" },
      },
    },
    ErrorResponse: {
      type: "object",
      required: ["success", "statusCode", "message"],
      properties: {
        success: { type: "boolean", example: false },
        statusCode: { type: "integer", example: 400 },
        message: { type: "string", example: "Validation error" },
      },
    },
  },

  responses: {
    BadRequest: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Error",
          },
        },
      },
    },
    Unauthorized: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Error",
          },
        },
      },
    },
    Forbidden: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Error",
          },
        },
      },
    },
    NotFound: {
      description: "Resource not found",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Error",
          },
        },
      },
    },
    Conflict: {
      description: "Conflict",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Error",
          },
        },
      },
    },
  },
};
