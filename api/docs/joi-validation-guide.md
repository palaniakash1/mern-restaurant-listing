# Joi Validation Guide (Practical Pattern)

This project currently uses controller-level manual validation.
If you want a clean enterprise pattern, use Joi in route middleware.

## 1) Install Joi

```bash
npm i joi
```

## 2) Create reusable validator middleware

```js
// api/middlewares/validate.js
import { errorHandler } from "../utils/error.js";

export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return next(
        errorHandler(400, error.details.map((d) => d.message).join(", ")),
      );
    }

    req[source] = value;
    next();
  };
```

## 3) Define schema for an endpoint

```js
// api/validators/user.validators.js
import Joi from "joi";

export const createStoreManagerSchema = Joi.object({
  userName: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});
```

## 4) Use in route

```js
import { validate } from "../middlewares/validate.js";
import { createStoreManagerSchema } from "../validators/user.validators.js";

router.post(
  "/",
  verifyToken,
  can("createStoreManager", "user"),
  validate(createStoreManagerSchema),
  createStoreManager,
);
```

## Why this helps

1. Controllers focus on business logic.
2. Validation is consistent and testable.
3. Payload normalization (`stripUnknown`) is centralized.
