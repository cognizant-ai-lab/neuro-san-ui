// This file is used by Jest to configure the testing environment for component tests

// This file cargo culted from here:
// https://nextjs.org/docs/pages/building-your-application/optimizing/testing#jest-and-react-testing-library

import type {Config} from "@jest/types"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
    dir: "./",
})

/** @type {import('jest').Config} */
const config: Config.InitialOptions = {
    // Add more setup options before each test is run
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

    testEnvironment: "jest-environment-jsdom",
}

// Required for Jest to function so tell ts-prune to ignore it
// ts-prune-ignore-next
export default createJestConfig(config)
