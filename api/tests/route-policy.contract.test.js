import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const routesDir = path.resolve("api/routes");
const routeFiles = [
  "admin.route.js",
  "auditLog.routes.js",
  "auth.route.js",
  "category.route.js",
  "menu.route.js",
  "restaurant.routes.js",
  "review.route.js",
  "user.route.js",
];

describe("Route policy contract", { concurrency: false }, () => {
  it("protected routes should use centralized can/canAny policy checks", () => {
    const violations = [];

    for (const fileName of routeFiles) {
      const fullPath = path.join(routesDir, fileName);
      const content = fs.readFileSync(fullPath, "utf8");
      const lines = content.split(/\r?\n/);

      lines.forEach((line, idx) => {
        const hasVerifyToken = line.includes("verifyToken");
        const hasPolicy = line.includes("can(") || line.includes("canAny(");
        const usesAllowedOwnershipGuard = line.includes("verifyRestaurantOwner");

        if (hasVerifyToken && !hasPolicy && !usesAllowedOwnershipGuard) {
          violations.push(`${fileName}:${idx + 1}:${line.trim()}`);
        }
      });
    }

    assert.deepEqual(
      violations,
      [],
      `Found protected routes without centralized policy:\n${violations.join("\n")}`,
    );
  });
});
