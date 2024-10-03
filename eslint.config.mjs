import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";

export default [ 
    {
        files: ["*.ts", "*tsx"],
        ignores: [
            "node_modules/",
            "dist/",
            "templates/",
            "spec/*/**",
            "**/lib/",
            "bin/",
            "eslint.config.mjs",
        ],
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
                tsconfigRootDir: ".",
            },
        },
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": "error",
        },
    }
];