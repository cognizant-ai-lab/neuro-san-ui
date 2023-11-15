/**
 * Types for pareto chart plots
 */

/**
 * Data for Pareto chart
 */
export interface ParetoPlotProps {
    // HTML id attribute for component
    id: string

    // The pareto front data
    readonly Pareto

    // The Node mapping to the CID Map of selected prescriptor
    NodeToCIDMap

    // A state handler for the parent object whoever needs to use it
    // that maps the node id of the prescriptor(ESP Experiment) to the
    // selected CID within that experiment so it can be used for inference
    readonly PrescriptorNodeToCIDMapUpdater

    // Count of objectives across all prescriptors
    readonly ObjectivesCount: number

    // Some plots have a sub-type, e.g. there are several 3D plots.
    readonly PlotSubtype?: string
}
