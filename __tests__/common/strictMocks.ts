/**
 * This function is used to clear and reset all mocks before each test.
 * This helps to ensure that each test is isolated and does not depend on the state of any previous tests, avoiding
 * difficult-to-debug "Heisenbugs".
 *
 * @param resetModules If true, reset the module registry before each test. This slows tests down but is useful for
 * tests that touch global module state or environment variables. Use thoughtfully.
 */
export const withStrictMocks = (resetModules: boolean) => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.resetAllMocks()
        jest.restoreAllMocks()
        if (resetModules) {
            jest.resetModules()
        }
    })
}
