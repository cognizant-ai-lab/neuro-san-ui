import "@testing-library/jest-dom"
import {render} from "@testing-library/react"

import RunsTable from "../../components/internal/runs_table"

describe("Runs Table Test", () => {
    it("Generates the correct number of rows", () => {
        const {container} = render(
            <RunsTable
                currentUser=""
                editingLoading={[{editing: false, loading: false}]}
                experimentId={0}
                projectId={0}
                projectName=""
                projectCanWrite={true}
                experiment={{name: "test experiment", flow: null}}
                runDrawer={false}
                runs={[
                    {name: "test run", id: 0, status: null, start_time: "2021-01-01T00:00:00Z"},
                    {name: "test run 2", id: 1, status: null, start_time: "2021-01-01T00:00:00Z"},
                ]}
                setEditingLoading={() => null}
                setRunDrawer={() => {
                    void null
                }}
                setSelectedRunID={() => {
                    void null
                }}
                setSelectedRunName={() => {
                    void null
                }}
                setRuns={() => {
                    void null
                }}
            />
        )

        // Get all the rows
        const trs = container.getElementsByTagName("tr")

        // There should be one header row and one row for each run
        expect(trs.length).toBe(1 + 2)
    })
})
