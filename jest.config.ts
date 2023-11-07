import type {Config} from '@jest/types';

const config: Config.InitialOptions = {
    verbose: true,
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },

    // Because NextJS told us to:
    // https://nextjs.org/docs/pages/building-your-application/optimizing/testing#jest-and-react-testing-library
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']
};

// Voodoo to speed up Jest, from here: https://stackoverflow.com/a/60905543
module.exports = {
    preset: 'ts-jest',
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                // Doc: https://kulshekhar.github.io/ts-jest/docs/getting-started/options/isolatedModules/
                isolatedModules: true,
            },
        ],

    }
}

// Required for Jest to function so tell ts-prune to ignore it
// ts-prune-ignore-next
export default config;
