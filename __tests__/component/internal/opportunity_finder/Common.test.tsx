import {Alert} from "antd"

import {retry} from "../../../../components/internal/opportunity_finder/common"
import {MAX_ORCHESTRATION_ATTEMPTS} from "../../../../components/internal/opportunity_finder/const"

describe("Common component tests", () => {
    const retryMessage = "Test retry message"
    const failureMessage = "Test failure message"
    const updateOutput = jest.fn()

    afterEach(() => {
        jest.resetAllMocks()
    })

    it("Should fail when we hit the max retry attempts", async () => {
        const handling = {
            orchestrationAttemptNumber: MAX_ORCHESTRATION_ATTEMPTS,
            endOrchestration: jest.fn(),
            initiateOrchestration: jest.fn(),
        }
        await retry(retryMessage, failureMessage, handling, updateOutput)

        expect(updateOutput).toHaveBeenCalledTimes(1)
        expect(updateOutput).toHaveBeenCalledWith(
            expect.objectContaining({
                props: expect.objectContaining({
                    children: expect.objectContaining({
                        type: Alert,
                        props: expect.objectContaining({
                            message: failureMessage,
                        }),
                    }),
                }),
            })
        )
    })

    it("Should retry when we haven't hit the max retry attempts", async () => {
        const handling = {
            orchestrationAttemptNumber: MAX_ORCHESTRATION_ATTEMPTS - 1,
            endOrchestration: jest.fn(),
            initiateOrchestration: jest.fn(),
        }

        await retry(retryMessage, failureMessage, handling, updateOutput)

        expect(updateOutput).toHaveBeenCalledTimes(1)
        expect(updateOutput).toHaveBeenCalledWith(
            expect.objectContaining({
                props: expect.objectContaining({
                    children: expect.objectContaining({
                        type: Alert,
                        props: expect.objectContaining({
                            message: retryMessage,
                        }),
                    }),
                }),
            })
        )
    })
})
