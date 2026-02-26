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
      const routeCalls = [...content.matchAll(/router\.(get|post|put|patch|delete)\(([\s\S]*?)\);/g)];

      routeCalls.forEach((match) => {
        const routeBlock = match[0];
        const hasVerifyToken = routeBlock.includes("verifyToken");
        if (!hasVerifyToken) return;

        const hasPolicy = routeBlock.includes("can(") || routeBlock.includes("canAny(");
        const usesAllowedOwnershipGuard = routeBlock.includes("verifyRestaurantOwner");

        if (!hasPolicy && !usesAllowedOwnershipGuard) {
          const startLine = content.slice(0, match.index).split(/\r?\n/).length;
          violations.push(
            `${fileName}:${startLine}:${routeBlock.replace(/\s+/g, " ").trim()}`,
          );
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
