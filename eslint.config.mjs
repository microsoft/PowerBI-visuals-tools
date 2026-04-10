import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";

const __dirname = import.meta.dirname; // built-in, no imports needed

export default [ 
    {
        ignores: [
            "node_modules/**",
            "dist/**",
            "templates/**",
            "spec/**",
            "lib/**",
            "bin/**",
        ],
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },
        languageOptions: {
            globals: {
                ...globals.node,
            },
            parser: tsParser,
            ecmaVersion: 2023,
            sourceType: "module",
            parserOptions: {
                project: "tsconfig.json",
                tsconfigRootDir: __dirname,
            },
        },
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": "error",
        },
    }
];