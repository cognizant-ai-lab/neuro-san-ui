import {fixupConfigRules, fixupPluginRules} from "@eslint/compat"
import {FlatCompat} from "@eslint/eslintrc"
import js from "@eslint/js"
import next from "@next/eslint-plugin-next"
import typescriptEslint from "@typescript-eslint/eslint-plugin"
// @ts-expect-error: parser has no types, but works
import tsParser from "@typescript-eslint/parser"
import eslintConfigPrettier from "eslint-config-prettier/flat"
import enforceIdsInJsx from "eslint-plugin-enforce-ids-in-jsx"
import eslintPluginImport from "eslint-plugin-import"
// eslint-disable-next-line no-shadow
import jest from "eslint-plugin-jest"
import jestDom from "eslint-plugin-jest-dom"
import eslintPluginReact from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import testingLibrary from "eslint-plugin-testing-library"
import eslintPluginUnicorn from "eslint-plugin-unicorn"
import globals from "globals"
import path from "node:path"
import {fileURLToPath} from "node:url"

const ___filename = fileURLToPath(import.meta.url)
const ___dirname = path.dirname(___filename)
const compat = new FlatCompat({
    baseDirectory: ___dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
})

const config = [
    eslintPluginUnicorn.configs.all,
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
        ignores: [".next", "coverage", "generated", "embed"],
    },
    ...fixupConfigRules(
        compat.extends(
            // This enables *all* base ESLint rules. We selectively disable those we are not yet ready for in the
            // "rules" section below.
            "eslint:all",
            "plugin:@next/next/recommended",
            // See: https://nextjs.org/docs/pages/building-your-application/configuring/eslint
            "plugin:@next/next/core-web-vitals",
            "plugin:@typescript-eslint/all",
            "plugin:import/recommended",
            "plugin:import/typescript",
            "plugin:jest/recommended",
            "plugin:react-hooks/recommended",
            "plugin:react/all",
            // This next one has to be included or else the React rules will complain that "React is not in scope".
            // But those rules are wrong -- as of React 17, "React" automatically gets included in the transpilation
            // process and doesn't *need* to be in scope.
            "plugin:react/jsx-runtime",
            "prettier"
        )
    ),
    {
        plugins: {
            "@typescript-eslint": fixupPluginRules(typescriptEslint),
            "enforce-ids-in-jsx": enforceIdsInJsx,
            "jest-dom": fixupPluginRules(jestDom),
            "react-hooks": fixupPluginRules(reactHooks),
            "testing-library": fixupPluginRules(testingLibrary),
            import: fixupPluginRules(eslintPluginImport),
            jest: fixupPluginRules(jest),
            next: fixupPluginRules(next),
            react: fixupPluginRules(eslintPluginReact),
        },
        linterOptions: {
            reportUnusedDisableDirectives: "error",
            reportUnusedInlineConfigs: "error",
        },
        languageOptions: {
            // Define these globals to avoid false positives from the no-undef rule, which we want to enable as it's
            // useful
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
            // Want to enforce this on all compoments, which the default setting does not do.
            "enforce-ids-in-jsx/missing-ids": [
                "warn",
                {
                    target: ["all"],
                },
            ],
            // Turn on some optional, stricter settings for this rule
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
            // Want to allow short circuit like foo && useFoo(foo)
            "no-unused-expressions": [
                "error",
                {
                    allowShortCircuit: true,
                    allowTernary: true,
                },
            ],

            // Disallow this syntax -- confusing
            "logical-assignment-operators": ["error", "never"],

            // We want to allow TODO: and FIXME: type comments in the code
            "no-warning-comments": "off",

            // We exempt a couple of identifiers that are too ubiquitous and useful to disallow
            // Other than that, prevent and shadowing of outer scope variables and system globals
            "no-shadow": [
                "error",
                {
                    builtinGlobals: true,
                    allow: ["event", "model", "screen"],
                },
            ],

            // Some extra rules that are enabled by eslint:all but somehow end up getting disabled -- maybe conflict
            // with other plugins we're using?
            // Also the place for rules we want to explicitly enable.
            //
            // How to see which rules are enabled: ./node_modules/.bin/eslint --print-config jest.config.ts
            // In any case, more rules keep us safe, so explicitly enable them here.
            "@typescript-eslint/array-type": "error",

            "@typescript-eslint/no-unused-expressions": [
                "error",
                {
                    allowShortCircuit: true,
                    allowTernary: true,
                },
            ],

            "@typescript-eslint/prefer-for-of": "error",

            camelcase: [
                "error",
                {
                    properties: "never",
                },
            ],
            // Enforce === and !== everywhere, except for null checks which are a special case (== tests for both null
            // and undefined which is useful)
            eqeqeq: [
                "error",
                "always",
                {
                    null: "ignore",
                },
            ],

            "prefer-template": "error",

            // Enforce double quotes (already handled by prettier) _and_ prevent backtick expressions with no
            // interpolation
            // See: https://github.com/prettier/eslint-config-prettier "special rules" "quotes"
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

            // Plugins for tidying imports. They seem to work harmoniously together with these settings.
            // Note: sorting is done by "from" path, not by symbol name.
            // See here for explanation: https://github.com/lydell/eslint-plugin-simple-import-sort?tab=readme-ov-file#why-sort-on-from
            // Note: there are other rules this plugin can enforce but not included in the default set. We may want to
            // look into enabling the ones we want later. Doc: https://github.com/import-js/eslint-plugin-import/tree/main
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
                    devDependencies: ["__tests__/**", "jest*.*", "eslint.config.mjs"],
                },
            ],

            "import/no-self-import": "error",
            "import/no-useless-path-segments": "error",

            "import/no-unresolved": [
                "error",
                {
                    // Was causing false positives in CI. Needs to be investigated. Probably related to it being used
                    // in a subdirectory with its own package.json.
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

            // Rules we're not ready to enable yet

            // Requires strict type checks enabled in tsc which we're not ready for yet
            "@typescript-eslint/no-unnecessary-boolean-literal-compare": "off",

            // Conflicts with react/sort-comp
            "@typescript-eslint/member-ordering": "off",
            // We like being explicit about types even when "obvious"
            "@typescript-eslint/no-inferrable-types": "off",
            // Controversial, but it's hard to do JSX without these. Probably should be policed in code reviews.
            "no-nested-ternary": "off",
            // Deprecated rule: see https://eslint.org/docs/latest/rules/no-return-await
            "no-return-await": "off",
            // Not needed -- Typescript handles these.
            // Reference: https://typescript-eslint.io/linting/troubleshooting/performance-troubleshooting/
            "import/no-named-as-default-member": "off",
            "import/default": "off",
            "import/namespace": "off",

            // End permanently off category

            // Rules from the various plugins and base ESLint that we are not yet ready to enable
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
            "unicorn/consistent-existence-index-check": "off",
            "unicorn/no-await-expression-member": "off",
            "unicorn/no-static-only-class": "off",
            "unicorn/prefer-set-has": "off",
            "unicorn/prefer-string-raw": "off",
            "unicorn/no-useless-undefined": "off",
            "unicorn/prefer-node-protocol": "off",
            "unicorn/prefer-string-slice": "off",
            "unicorn/no-named-default": "off",
            "unicorn/no-array-reduce": "off",
            "unicorn/no-useless-switch-case": "off",
            "unicorn/prefer-at": "off",
            "unicorn/explicit-length-check": "off",
            "unicorn/prefer-string-replace-all": "off",
            "unicorn/consistent-destructuring": "off",
            "unicorn/numeric-separators-style": "off",
            "unicorn/prefer-query-selector": "off",
            "unicorn/catch-error-name": "off",
            "unicorn/prefer-ternary": "off",
            "unicorn/consistent-function-scoping": "off",
            "unicorn/no-negated-condition": "off",
            "unicorn/prefer-spread": "off",
            "unicorn/no-zero-fractions": "off",
            "unicorn/prefer-number-properties": "off",
            "unicorn/prefer-global-this": "off",
            "unicorn/switch-case-braces": "off",
            "unicorn/no-array-for-each": "off",
            "unicorn/no-keyword-prefix": "off",
            "unicorn/filename-case": "off",
            "unicorn/no-null": "off",
            "unicorn/prevent-abbreviations": "off",
        },
    },
    {
        // Test-specific rule configuration
        files: ["__tests__/**/*.{js,ts,jsx,tsx}"],
        rules: {
            // Extra rules for Jest tests
            "testing-library/await-async-queries": "error",
            "testing-library/no-await-sync-queries": "error",
            "testing-library/no-dom-import": "error",
            "testing-library/no-manual-cleanup": "error",

            // Sorry testing-library: these are too useful to block.
            "testing-library/no-container": "off",
            "testing-library/no-debugging-utils": "off",
            "testing-library/no-node-access": "off",

            // Don't care about these rules in tests
            "@next/next/no-img-element": "off",
            "enforce-ids-in-jsx/missing-ids": "off",
            "react/display-name": "off",
            "react/no-array-index-key": "off",
        },
    },
    {
        // Want to allow devDependencies in these files
        files: ["next.config.ts"],
        rules: {
            "import/no-extraneous-dependencies": [
                "error",
                {
                    devDependencies: true, // allow in these files
                },
            ],
        },
    },
    eslintConfigPrettier,
    {
        // re-enable these rules _after_ prettier since prettier disables them
        rules: {
            // TODO: eventually these "formatting" rules should be replaced by stylistic as they are deprecated
            // by eslint, but still function for now.
            // See: https://eslint.org/blog/2023/10/deprecating-formatting-rules/

            "max-len": [
                "error",
                {
                    code: 120,
                    ignoreUrls: true,
                    ignorePattern: "^import .*",
                },
            ],

            "newline-per-chained-call": "error",

            // Enforce double quotes (already handled by prettier) _and_ prevent backtick expressions with no
            // interpolation See: https://github.com/prettier/eslint-config-prettier "special rules" "quotes"
            quotes: [
                "error",
                "double",
                {
                    avoidEscape: true,
                    allowTemplateLiterals: false,
                },
            ],
            // Would like to leave this at the default setting (max = 1) but that excludes functional incantations that
            // we would like to allow such as nodes.forEach(node => {node.doSomething})
            // See: https://github.com/eslint/eslint/issues/9210
            "max-statements-per-line": ["error", {max: 2}],

            "no-new-native-nonconstructor": "error",
            "no-class-assign": "error",
            "import/no-anonymous-default-export": "error",
            "@typescript-eslint/no-empty-interface": "error",
        },
    },
]

// Has to be exported for ESLint to use it
// ts-prune-ignore-next
export default config
