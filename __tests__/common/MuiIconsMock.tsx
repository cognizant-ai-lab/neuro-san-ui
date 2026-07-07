import {createElement} from "react"

// Tests should use this constant to test for invalid icon names.
export const INVALID_MUI_ICON_NAME = "NonExistentIcon"

/**
 * Global mock for MUI icons. Why? Because in a couple of places in the code we import the whole MUI Icons barrel
 * via `import * as Icons from "@mui/icons-material"` in order to choose icons dynamically at runtime. This is slow
 * for tests and unnecessary, so we mock the whole module here.
 *
 * @use `mockMuiIcons()` in your test setup to enable this mock.
 */
vi.mock("@mui/icons-material", async () => {
    const moduleBase = {
        __esModule: true,
    } as const

    const iconCache = new Map<string, unknown>()

    const createMockMuiIcon = (iconName: string) => {
        const MockMuiIcon = (props: Record<string, unknown>) =>
            createElement("svg", {
                ...props,
                "data-testid": (props["data-testid"] as string | undefined) ?? `${iconName}Icon`,
            })

        MockMuiIcon.displayName = `${iconName}Icon`

        return MockMuiIcon
    }

    const getMockIcon = (iconName: string) => {
        if (iconName === INVALID_MUI_ICON_NAME) {
            return undefined
        }

        if (!iconCache.has(iconName)) {
            iconCache.set(iconName, createMockMuiIcon(iconName))
        }

        return iconCache.get(iconName)
    }

    const getMockExport = (target: typeof moduleBase, prop: PropertyKey) => {
        if (prop in target) {
            return target[prop as keyof typeof moduleBase]
        }

        return typeof prop === "string" ? getMockIcon(prop) : undefined
    }

    return new Proxy(moduleBase, {
        get: (target, prop) => (prop === "then" ? undefined : getMockExport(target, prop)),

        has: (target, prop) => prop !== "then" && (prop in target || typeof prop === "string"),

        getOwnPropertyDescriptor: (target, prop) =>
            prop === "then"
                ? undefined
                : {
                      configurable: true,
                      enumerable: true,
                      value: getMockExport(target, prop),
                  },
    })
})
