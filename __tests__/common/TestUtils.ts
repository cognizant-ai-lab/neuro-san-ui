// Mock Fetch for NodeJs environment
export const mockFetch = (data: Record<string, unknown>, ok: boolean = true) => {
    return jest.fn().mockImplementation(() =>
        Promise.resolve({
            ok,
            json: () => data,
        })
    )
}
