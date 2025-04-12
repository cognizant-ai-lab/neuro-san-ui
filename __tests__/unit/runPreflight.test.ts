import {NotificationType, sendNotification} from "../../components/Common/notification"
import {FlowQueries} from "../../components/Flow/flowqueries"
import {NodeType} from "../../components/Flow/nodes/types"
import {checkValidity} from "../../components/Run/runPreflight"
import conoxFlow from "../fixtures/conoxFlow.json"

jest.mock("../../components/Common/notification")

describe("checkValidity", () => {
    beforeEach(() => {
        ;(sendNotification as jest.Mock).mockReset()
    })

    it("Should reject predictors with more or less than one outcome checked", () => {
        // First, with valid outcomes
        const testFlow = conoxFlow as NodeType[]
        const result: boolean = checkValidity(testFlow)
        expect(result).toBe(true)
        expect(sendNotification).not.toHaveBeenCalled()
        ;(sendNotification as jest.Mock).mockReset()

        // Check multiple outcomes on a predictor; should fail to validate.
        const predictor = FlowQueries.getPredictorNodes(testFlow)[0]
        predictor.data.ParentNodeState.caoState.outcome = {CO: true, NOX: true, TEY: false}

        const multiOutcomesResult: boolean = checkValidity(testFlow)
        expect(multiOutcomesResult).toBe(false)
        expect(sendNotification).toHaveBeenCalledWith(
            NotificationType.warning,
            expect.stringContaining("Please check (enable) exactly one Outcome")
        )
        ;(sendNotification as jest.Mock).mockReset()

        // Check no outcomes on a predictor; should fail to validate.
        predictor.data.ParentNodeState.caoState.outcome = {CO: false, NOX: false, TEY: false}
        const noOutcomesResult: boolean = checkValidity(testFlow)
        expect(noOutcomesResult).toBe(false)
        expect(sendNotification).toHaveBeenCalledWith(
            NotificationType.warning,
            expect.stringContaining("Please check (enable) exactly one Outcome")
        )
    })
})
