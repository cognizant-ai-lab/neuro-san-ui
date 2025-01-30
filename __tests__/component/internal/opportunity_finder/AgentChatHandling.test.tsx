const mockSyntaxHighlighter = jest.fn(({children}) => <div>{children}</div>)

jest.mock("react-syntax-highlighter", () => {
    const actual = jest.requireActual("react-syntax-highlighter")
    return {
        __esModule: true,
        ...actual,
        default: (children) => mockSyntaxHighlighter(children),
    }
})

jest.mock("../../../../controller/agent/agent", () => ({
    __esModule: true,
    ...jest.requireActual("../../../../controller/agent/agent"),
    getLogs: jest.fn(),
}))

jest.mock("../../../../components/internal/opportunity_finder/common", () => ({
    __esModule: true,
    ...jest.requireActual("../../../../components/internal/opportunity_finder/common"),
    retry: jest.fn(),
}))
