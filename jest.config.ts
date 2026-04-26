import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^chalk$": "<rootDir>/tests/mocks/chalk.ts",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
};

export default config;
