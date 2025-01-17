import {retry} from "../../../../components/internal/opportunity_finder/common"
import {MAX_ORCHESTRATION_ATTEMPTS} from "../../../../components/internal/opportunity_finder/const"
import {MUIAlert} from "../../../../components/MUIAlert"

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
            <MUIAlert
                id="failure-message-alert"
                severity="error"
            >
                {failureMessage}
            </MUIAlert>
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
            <MUIAlert
                id="retry-message-alert"
                severity="warning"
            >
                {retryMessage}
            </MUIAlert>
        )
    })
})
