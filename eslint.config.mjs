import {fixupConfigRules, fixupPluginRules} from "@eslint/compat"
import {FlatCompat} from "@eslint/eslintrc"
import js from "@eslint/js"
import stylisticTs from "@stylistic/eslint-plugin-ts"
import typescriptEslint from "@typescript-eslint/eslint-plugin"
import tsParser from "@typescript-eslint/parser"
import enforceIdsInJsx from "eslint-plugin-enforce-ids-in-jsx"
import jest from "eslint-plugin-jest"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import path from "node:path"
import {fileURLToPath} from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
})

export default [
    {
        settings: {
            react: {
                version: "detect",
            },
        },
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },
    {
        ignores: ["**/generated/", ".next", "eslint.config.mjs"],
    },
    ...fixupConfigRules(
        compat.extends(
            "eslint:all",
            "plugin:@typescript-eslint/all",
            "plugin:import/recommended",
            "plugin:import/typescript",
            "plugin:jest/recommended",
            "plugin:react/all",
            "plugin:react/jsx-runtime",
            "prettier"
        )
    ),
    {
        plugins: {
            "@typescript-eslint": fixupPluginRules(typescriptEslint),
            "enforce-ids-in-jsx": enforceIdsInJsx,
            jest: fixupPluginRules(jest),
            "react-hooks": fixupPluginRules(reactHooks),
            "@stylistic/ts": stylisticTs,
        },

        languageOptions: {
            globals: {
                ...globals.jest,
                React: "readonly",
                JSX: "readonly",
            },

            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: "module",

            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },

                project: ["./tsconfig.json"],
            },
        },

        settings: {
            "import/resolver": {
                typescript: true,
                node: true,
            },
        },

        rules: {
            "enforce-ids-in-jsx/missing-ids": [
                "warn",
                {
                    target: ["all"],
                },
            ],

            "react/jsx-key": [
                "error",
                {
                    checkFragmentShorthand: true,
                    checkKeyMustBeforeSpread: true,
                    warnOnDuplicates: true,
                },
            ],

            "react/jsx-no-useless-fragment": [
                "error",
                {
                    allowExpressions: true,
                },
            ],

            "no-unused-expressions": [
                "error",
                {
                    allowShortCircuit: true,
                    allowTernary: true,
                },
            ],

            "logical-assignment-operators": ["error", "never"],
            "no-warning-comments": "off",

            "max-statements-per-line": [
                "error",
                {
                    max: 2,
                },
            ],

            "no-shadow": [
                "error",
                {
                    builtinGlobals: true,
                    allow: ["event", "model"],
                },
            ],

            "@typescript-eslint/array-type": "error",

            "@typescript-eslint/no-unused-expressions": [
                "error",
                {
                    allowShortCircuit: true,
                    allowTernary: true,
                },
            ],

            "@typescript-eslint/prefer-for-of": "error",

            "@stylistic/ts/quotes": [
                "error",
                "double",
                {
                    avoidEscape: true,
                    allowTemplateLiterals: false,
                },
            ],

            camelcase: [
                "error",
                {
                    properties: "never",
                },
            ],

            eqeqeq: [
                "error",
                "always",
                {
                    null: "ignore",
                },
            ],

            "prefer-template": "error",

            quotes: [
                "error",
                "double",
                {
                    avoidEscape: true,
                    allowTemplateLiterals: false,
                },
            ],

            "consistent-return": "error",
            "constructor-super": "error",
            "default-case": "error",
            "getter-return": "error",
            "max-depth": "error",
            "newline-per-chained-call": "error",
            "no-alert": "error",
            "no-array-constructor": "error",
            "no-const-assign": "error",
            "no-dupe-args": "error",
            "no-dupe-class-members": "error",
            "no-dupe-keys": "error",
            "no-empty-function": "error",
            "no-func-assign": "error",
            "no-import-assign": "error",
            "no-loss-of-precision": "error",
            "no-new-symbol": "error",
            "no-obj-calls": "error",
            "no-param-reassign": "error",
            "no-redeclare": "error",
            "no-setter-return": "error",
            "no-shadow-restricted-names": "error",
            "no-this-before-super": "error",
            "no-undef": "error",
            "no-unreachable": "error",
            "no-unsafe-negation": "error",
            "no-var": "error",
            "prefer-const": "error",
            "prefer-rest-params": "error",
            "prefer-spread": "error",
            "react/jsx-curly-brace-presence": "error",
            "react/no-array-index-key": "error",
            "react/no-object-type-as-default-prop": "error",
            "react/self-closing-comp": "error",
            "valid-typeof": "error",
            "import/no-deprecated": "error",

            "import/order": [
                "error",
                {
                    alphabetize: {
                        caseInsensitive: true,
                        order: "asc",
                    },

                    groups: [
                        ["builtin", "external", "object", "type"],
                        ["internal", "parent", "sibling", "index"],
                    ],

                    "newlines-between": "always",
                },
            ],

            "import/no-extraneous-dependencies": [
                "error",
                {
                    includeInternal: true,
                    includeTypes: true,
                    devDependencies: ["__tests__/**", "jest*.*", "tailwind.config.js"],
                },
            ],

            "import/no-self-import": "error",
            "import/no-useless-path-segments": "error",

            "import/no-unresolved": [
                "error",
                {
                    ignore: ["dotenv"],
                },
            ],

            "sort-imports": [
                "error",
                {
                    allowSeparatedGroups: true,
                    ignoreCase: true,
                    ignoreDeclarationSort: true,
                    ignoreMemberSort: false,
                    memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
                },
            ],

            "@typescript-eslint/member-ordering": "off",
            "@typescript-eslint/no-inferrable-types": "off",
            "no-nested-ternary": "off",
            "no-return-await": "off",
            "import/no-named-as-default-member": "off",
            "import/default": "off",
            "import/namespace": "off",
            "@typescript-eslint/await-thenable": "off",
            "@typescript-eslint/consistent-indexed-object-style": "off",
            "@typescript-eslint/consistent-type-assertions": "off",
            "@typescript-eslint/consistent-type-definitions": "off",
            "@typescript-eslint/consistent-type-exports": "off",
            "@typescript-eslint/consistent-type-imports": "off",
            "@typescript-eslint/dot-notation": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-member-accessibility": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/init-declarations": "off",
            "@typescript-eslint/lines-around-comment": "off",
            "@typescript-eslint/max-params": "off",
            "@typescript-eslint/naming-convention": "off",
            "@typescript-eslint/no-base-to-string": "off",
            "@typescript-eslint/no-confusing-void-expression": "off",
            "@typescript-eslint/no-duplicate-type-constituents": "off",
            "@typescript-eslint/no-extraneous-class": "off",
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/no-implied-eval": "off",
            "@typescript-eslint/no-invalid-this": "off",
            "@typescript-eslint/no-magic-numbers": "off",
            "@typescript-eslint/no-misused-promises": "off",
            "@typescript-eslint/no-mixed-enums": "off",
            "@typescript-eslint/no-redundant-type-constituents": "off",
            "@typescript-eslint/no-throw-literal": "off",
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/no-unnecessary-qualifier": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unnecessary-type-arguments": "off",
            "@typescript-eslint/no-unsafe-enum-comparison": "off",
            "@typescript-eslint/non-nullable-type-assertion-style": "off",
            "@typescript-eslint/prefer-includes": "off",
            "@typescript-eslint/no-unsafe-type-assertion": "off",
            "@typescript-eslint/no-use-before-define": "off",
            "@typescript-eslint/prefer-readonly": "off",
            "@typescript-eslint/prefer-reduce-type-parameter": "off",
            "@typescript-eslint/prefer-return-this-type": "off",
            "@typescript-eslint/prefer-string-starts-ends-with": "off",
            "@typescript-eslint/require-array-sort-compare": "off",
            "@typescript-eslint/switch-exhaustiveness-check": "off",
            "@typescript-eslint/unbound-method": "off",
            "@typescript-eslint/no-for-in-array": "off",
            "@typescript-eslint/object-curly-spacing": "off",
            "@typescript-eslint/prefer-destructuring": "off",
            "@typescript-eslint/prefer-enum-initializers": "off",
            "@typescript-eslint/prefer-nullish-coalescing": "off",
            "@typescript-eslint/prefer-readonly-parameter-types": "off",
            "@typescript-eslint/promise-function-async": "off",
            "@typescript-eslint/require-await": "off",
            "@typescript-eslint/restrict-plus-operands": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/sort-type-constituents": "off",
            "@typescript-eslint/strict-boolean-expressions": "off",
            "arrow-body-style": "off",
            "capitalized-comments": "off",
            complexity: "off",
            "enforce-ids-in-jsx/unique-ids": "off",
            "func-names": "off",
            "func-style": "off",
            "id-length": "off",
            "init-declarations": "off",
            "line-comment-position": "off",
            "lines-around-comment": "off",

            "max-len": [
                "error",
                {
                    code: 120,
                    ignoreUrls: true,
                    ignorePattern: "^import .*",
                },
            ],

            "max-lines": "off",
            "max-lines-per-function": "off",
            "max-params": "off",
            "max-statements": "off",
            "multiline-comment-style": "off",
            "new-cap": "off",
            "no-await-in-loop": "off",
            "no-console": "off",
            "no-duplicate-imports": "off",
            "no-else-return": "off",
            "no-eq-null": "off",
            "no-inline-comments": "off",
            "no-magic-numbers": "off",
            "no-mixed-operators": "off",
            "no-negated-condition": "off",
            "no-ternary": "off",
            "no-trailing-spaces": "off",
            "no-undefined": "off",
            "no-underscore-dangle": "off",
            "no-use-before-define": "off",
            "no-void": "off",
            "object-shorthand": "off",
            "one-var": "off",
            "prefer-destructuring": "off",
            radix: "off",
            "react-hooks/exhaustive-deps": "off",
            "react/button-has-type": "off",
            "react/destructuring-assignment": "off",
            "react/forbid-component-props": "off",
            "react/function-component-definition": "off",
            "react/jsx-boolean-value": "off",
            "react/jsx-closing-bracket-location": "off",
            "react/jsx-closing-tag-location": "off",
            "react/jsx-curly-newline": "off",
            "react/jsx-curly-spacing": "off",
            "react/jsx-filename-extension": "off",
            "react/jsx-first-prop-new-line": "off",
            "react/jsx-indent": "off",
            "react/jsx-indent-props": "off",
            "react/jsx-max-depth": "off",
            "react/jsx-max-props-per-line": "off",
            "react/jsx-newline": "off",
            "react/jsx-no-bind": "off",
            "react/jsx-no-leaked-render": "off",
            "react/jsx-no-literals": "off",
            "react/jsx-one-expression-per-line": "off",
            "react/jsx-props-no-multi-spaces": "off",
            "react/jsx-props-no-spreading": "off",
            "react/jsx-sort-props": "off",
            "react/jsx-tag-spacing": "off",
            "react/jsx-wrap-multilines": "off",
            "react/no-unstable-nested-components": "off",
            "react/prefer-read-only-props": "off",
            "react/prop-types": "off",
            "react/require-default-props": "off",
            "react/require-optimization": "off",
            "require-await": "off",
            "sort-keys": "off",
            "spaced-comment": "off",
        },
    },
]
