import ReactEcharts from "echarts-for-react"
import {EChartsOption} from "echarts-for-react/src/types"
import {useCallback, useEffect, useMemo, useRef, useState} from "react"

import {GenerationsAnimation} from "./generations_animation"
import {ParetoPlotProps} from "./types"
import {NotificationType, sendNotification} from "../notification"

interface EchartPlotProps {
    // Component ID
    id: string

    /**
     Pareto front data. See {@link ParetoPlotProps} for more details.
     */
    paretoProps: ParetoPlotProps

    // Number of objectives across all prescriptors (currently only one prescriptor supported)
    objectivesCount: number

    // Min number of objectives for this plot type
    minObjectives?: number

    // Max number of objectives for this plot type (or null if no limit)
    maxObjectives?: number

    // Delay in milliseconds between animation frames when animating generations
    frameDelayMs?: number

    // Options to pass to ECharts
    optionsGenerator: (genData, objectives, minMaxPerObjective, selectedGen) => EChartsOption

    // Whether chart can display all generations' candidates at the same time
    showAllGenerations?: boolean
}

const ANT_DRAWER_CLASS_NAME = ".ant-drawer-body"

/**
 * This component wraps a generic EChart plot.
 *
 * @param props See {@link EchartPlotProps} for details.
 */
export function EchartParetoPlot(props: EchartPlotProps): JSX.Element {
    const pareto = props.paretoProps.Pareto

    // First (and only, for now) prescriptor node ID
    const firstPrescriptorNodeID = Object.keys(pareto)[0]

    // Associated prescriptor node
    const firstPrescriptorNode = pareto[firstPrescriptorNodeID]

    // Retrieve objectives
    const objectives = firstPrescriptorNode.objectives

    // Unpack params
    const minObjectives = props.minObjectives ?? 2
    const frameDelayMs = props.frameDelayMs ?? 50

    // For now, only one prescriptor per experiment supported, so grab [0]
    const data = firstPrescriptorNode.data

    // Number of generations for this Run
    const numberOfGenerations = useMemo(() => {
        return data.length
    }, [])

    // Build a cache of the results for each generation
    const cachedDataByGen = useMemo(() => {
        const gendata = {}
        for (const row of data) {
            gendata[row.id] = row.data
        }

        return gendata
    }, [data])

    // Maintain the state of the animation if it's playing or not
    const [playing, setPlaying] = useState(false)

    // Generation for which we are displaying data. Default to last generation.
    const [selectedGen, setSelectedGen] = useState(numberOfGenerations)

    // For hidden notifications
    const [notifications, setNotifications] = useState<[string, string][]>([])

    const allGensSelected = selectedGen === numberOfGenerations + 1

    // Calculate min and max values for each objective across all generations (if playing animation) or for current
    // generation (if user is viewing a single generation).
    // This allows us to scale the chart appropriately for the animation or for viewing a single generation
    const minMaxPerObjective = useMemo(() => {
        const genData = cachedDataByGen[`Gen ${selectedGen}`]
        return Object.fromEntries(
            objectives.map((_objective, idx) => {
                const minObjectiveValue =
                    playing || allGensSelected
                        ? Math.min(...data.flatMap((gen) => gen.data.map((cid) => cid[`objective${idx}`])))
                        : Math.min(...genData.map((row) => row[`objective${idx}`]))
                const maxObjectiveValue =
                    playing || allGensSelected
                        ? Math.max(...data.flatMap((gen) => gen.data.map((cid) => cid[`objective${idx}`])))
                        : Math.max(...genData.map((row) => row[`objective${idx}`]))

                return [
                    `objective${idx}`,
                    {
                        min: minObjectiveValue,
                        max: maxObjectiveValue,
                    },
                ]
            })
        )
    }, [data, objectives, playing, selectedGen])

    // Keep a ref to the chart, so we can handle events manually
    const chartRef = useRef(null)

    useEffect(() => {
        const chart = chartRef.current?.getEchartsInstance()
        const container = chart?.getDom()

        // This allows us to scroll the outer container when the mouse is over the chart. Also works for trackpad
        // scrolling.
        // It's a bit hacky since it depends on the antd classname -- but it's the only way I could find to do this.
        const handleWheel = (e) => {
            const parents = container?.closest(ANT_DRAWER_CLASS_NAME)

            // Bubble up the mousewheel event.
            parents && (parents.scrollTop += e.deltaY)
        }

        container?.addEventListener("wheel", handleWheel)

        return () => {
            container?.removeEventListener("wheel", handleWheel)
        }
    }, [])

    // Get data for selected gen from cache, or fall all generations if "All Gens" option selected
    const plotData = allGensSelected ? data : cachedDataByGen[`Gen ${selectedGen}`]

    // Retrieve "options" (all data for EChart and associated options) for selected generation
    const options = props.optionsGenerator(plotData, objectives, minMaxPerObjective, selectedGen)

    // On Click handler - only rendered at the last generation as those are the
    // candidates we persist.
    // The default click handler shows the Notification if the selected Candidate is not of the last generation - we
    // cannot yet perform inference on those as those don't exist.
    const onChartClick = useCallback(
        selectedGen === numberOfGenerations
            ? (params) => {
                  // Bit hacky -- assume that CID (prescriptor ID) is the last item in params. Which is should be unless
                  // the API changes, but there's no doubt a better way to do this.
                  const selectedCID = params.value[params.value.length - 1]
                  selectedCIDStateUpdator(selectedCID)
              }
            : () => {
                  setNotifications((currentNotifications) => {
                      return [
                          ...(currentNotifications ?? []),
                          [NotificationType[NotificationType.error], "Model Selection Error"],
                          [NotificationType[NotificationType.warning], "Sample warning message"],
                      ]
                  })
                  sendNotification(
                      NotificationType.error,
                      "Model Selection Error",
                      "Only models from the last generation can be used with the decision interface"
                  )
              },
        [selectedGen]
    )

    // Build EChart plot.
    /*
    We memoize the plot for two reasons -- a good reason and the real reason.
    Good reason: performance. Don't re-render things you don't need to, like the plot when the source data hasn't 
    changed for example.

    Real reason: letting the plot re-render in onClick was causing crashes in the bowels of ECharts/zrender beyond 
    what any of us knows how to debug. This steps around the issue.
    ECharts ticket for this: https://github.com/apache/echarts/issues/18459
     */
    const plot = useMemo(() => {
        return (
            <div
                id="echart-pareto-plot-div"
                style={{height: "100%"}}
            >
                <ReactEcharts // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    // ReactEcharts lacks an id attribute
                    ref={chartRef}
                    style={{height: "100%"}}
                    option={options}
                    onEvents={{click: onChartClick}}
                />
            </div>
        )
    }, [options, onChartClick])

    // Make sure parent didn't use wrong kind of plot for number of objectives
    if (props.objectivesCount < minObjectives) {
        return <>{`This type of plot is only valid for ≥ ${minObjectives} objectives`}</>
    }

    if (props.maxObjectives && props.objectivesCount > props.maxObjectives) {
        return <>{`This type of plot is only valid for ≤ ${props.maxObjectives} objectives`}</>
    }

    // Handle when user clicks on a prescriptor candidate
    function selectedCIDStateUpdator(cid: string) {
        return props.paretoProps.PrescriptorNodeToCIDMapUpdater((value) => {
            return {
                ...value,
                [firstPrescriptorNodeID]: cid,
            }
        })
    }

    // Wrap plot in animation component and return it
    const id = props.id
    const showAllGenerations = props.showAllGenerations ?? false

    return (
        <>
            <div
                id="notifications"
                style={{display: "none"}}
            >
                {JSON.stringify(notifications, null, 2)}
            </div>
            <GenerationsAnimation
                id={id}
                NumberOfGenerations={numberOfGenerations}
                Plot={plot}
                SetSelectedGen={(gen: number) => setSelectedGen(gen)}
                SelectedGen={selectedGen}
                ShowAllGenerations={showAllGenerations}
                FrameDelayMs={frameDelayMs}
                SetPlaying={setPlaying}
                Playing={playing}
            />
        </>
    )
}
