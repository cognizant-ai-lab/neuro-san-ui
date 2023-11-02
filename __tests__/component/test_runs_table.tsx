import "@testing-library/jest-dom"
import RunsTable from "../../components/internal/runs_table"
import {render} from "@testing-library/react"

describe("Runs Table Test", () => {
    it("Generates the correct number of rows", () => {
        const {container} = render(
            <RunsTable
                currentUser={""}
                editingLoading={[]}
                experimentId={0}
                projectId={0}
                projectName={""}
                experiment={{name: "test experiment", flow: null}}
                runDrawer={false}
                runs={[]}
                setEditingLoading={() => null}
                setRunDrawer={() => {void null}}
                setSelectedRunID={() => {void null}}
                setSelectedRunName={() => {void null}}
                setRuns={() => {void null}}
            />)

        const trs = container.getElementsByTagName("tr")
        expect(trs.length).toBe(0)
    })
})
