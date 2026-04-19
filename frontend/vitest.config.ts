import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
    test: {
        environment: "node",
        setupFiles: ["./test/setup.ts"],
        include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            include: [
                "features/diagram/store/helpers.ts",
                "features/diagram/store/nodeActions.ts",
                "features/diagram/store/edgeActions.ts",
                "features/diagram/store/clipboard.ts",
                "features/diagram/store/clipboardActions.ts",
                "features/diagram/utils/*.ts",
                "features/diagram/hooks/useConnectMode.ts",
                "features/diagram/components/edges/ConnectionDialog.tsx",
                "features/diagram/nodes/ColumnBadges.tsx",
            ],
            exclude: ["**/*.d.ts"],
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 60,
                statements: 70,
            },
        },
    },
});
