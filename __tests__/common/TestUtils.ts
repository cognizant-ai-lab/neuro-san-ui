// Mock Fetch for NodeJs environment
export const mockFetch = (data: Record<string, unknown>) => {
    return jest.fn().mockImplementation(() =>
        Promise.resolve({
            ok: true,
            json: () => data,
        })
    )
}
