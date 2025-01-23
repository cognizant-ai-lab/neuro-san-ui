import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown"
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp"
import Box from "@mui/material/Box"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableHead from "@mui/material/TableHead"
import TablePagination from "@mui/material/TablePagination"
import TableRow from "@mui/material/TableRow"
import TableSortLabel from "@mui/material/TableSortLabel"
import Tooltip from "@mui/material/Tooltip"
import {NextRouter} from "next/router"
import {ChangeEvent, ReactElement, MouseEvent as ReactMouseEvent, useMemo, useState} from "react"

import {DisplayOption, FilterSpecification, ProjectPagePreferences, ShowAsOption, SortSpecification} from "./types"
import {Project} from "../../controller/projects/types"

interface ProjectsTableProps {
    readonly id: string
    readonly projectList: Project[]
    readonly router: NextRouter
    readonly getAllowedActions: (project: Project) => {allowDelete: boolean; allowSharing: boolean}
    readonly getSharingIcon: (project: Project) => ReactElement
    readonly getDeleteIcon: (project: Project, idx: number) => ReactElement
    readonly preferences: ProjectPagePreferences

    // setPreferences is a React state setter that takes either a value as input or a function argument
    readonly setPreferences: (
        value: (currentPreferences: ProjectPagePreferences) => {
            sorting: {columnKey: string; sortOrder: string}
            readonly itemsPerPage: number
            readonly showAsOption: ShowAsOption
            readonly displayOption: DisplayOption
            readonly filterSpecification: FilterSpecification
        }
    ) => void
}

/**
 * Get the table of projects for the "List" view
 *
 * @returns React element representing the project table
 */
export default function ProjectsTable(props: ProjectsTableProps): ReactElement<ProjectsTableProps> {
    // Extract props
    const {id, projectList, preferences, setPreferences, router, getAllowedActions, getSharingIcon, getDeleteIcon} =
        props

    // For sorting -- column and order
    const [sorting, setSorting] = useState<SortSpecification>({
        columnKey: preferences?.sorting?.columnKey || "updated_at",
        sortOrder: preferences?.sorting?.sortOrder || "desc",
    })

    // For pagination
    const [rowsPerPage, setRowsPerPage] = useState<number>(preferences?.itemsPerPage || 15)
    const [page, setPage] = useState<number>(0)

    // Sort the project list based on the column and order
    const sortedData = useMemo(
        () =>
            [...projectList].sort((a, b) => {
                const sortOrderNumeric = sorting.sortOrder === "desc" ? -1 : 1

                if (sorting.columnKey) {
                    const valueA = a[sorting.columnKey]
                    const valueB = b[sorting.columnKey]

                    if (typeof valueA !== typeof valueB) {
                        // Can't compare apples and oranges. Should never happen since we're comparing two rows from the
                        // same column.
                        return 0
                    }

                    // HACK: since the backend sends us dates as strings, we have to encode knowledge about fields types
                    // here. For example, "updated_at": "5/26/2023, 1:07:24 PM". The only ways to know this is a date
                    // would be to attempt to parse it as such (leading to false positives...) or use our intrinstic
                    // knowledge of which type each field name is.
                    switch (sorting.columnKey) {
                        case "name":
                        case "description":
                        case "owner":
                        case "lastEditedBy":
                            return sortOrderNumeric * valueA.localeCompare(valueB)
                        case "updated_at":
                        case "created_at":
                            return sortOrderNumeric * (new Date(valueA) > new Date(valueB) ? 1 : -1)
                        case "id":
                            return sortOrderNumeric * (parseInt(valueA) - parseInt(valueB))
                        default:
                            return 0
                    }
                }

                return 0
            }),
        [projectList, sorting]
    )

    // Apply the filter if there is one. We only start filtering at 2 characters+
    const lowerCaseFilterText = preferences?.filterSpecification?.filterText?.toLocaleLowerCase()
    const filteredSortedData = (
        preferences?.filterSpecification?.columnKey && preferences?.filterSpecification?.filterText
            ? sortedData.filter(
                  (datum) =>
                      preferences?.filterSpecification?.filterText.length < 2 ||
                      datum[preferences?.filterSpecification?.columnKey]
                          .toLocaleLowerCase()
                          .includes(lowerCaseFilterText)
              )
            : sortedData
    ).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

    const handleHeaderClick = (_event: ReactMouseEvent<unknown>, clickedHeaderId: string) => {
        if (clickedHeaderId !== sorting.columnKey) {
            // If a new column is clicked, clear previous sorting
            setSorting({
                columnKey: clickedHeaderId,
                sortOrder: "asc",
            })

            // Record in persisted preferences
            setPreferences((currentPreferences: ProjectPagePreferences) => ({
                ...currentPreferences,
                sorting: {
                    columnKey: clickedHeaderId,
                    sortOrder: "asc",
                },
            }))
        } else {
            // Toggle sorting order for the same column
            const newSortOrder = sorting.sortOrder === "desc" ? "asc" : "desc"

            setSorting({
                ...sorting,
                sortOrder: newSortOrder,
            })

            // Record in persisted preferences
            setPreferences((currentPreferences: ProjectPagePreferences) => ({
                ...currentPreferences,
                sorting: {
                    ...sorting,
                    sortOrder: newSortOrder,
                },
            }))
        }
    }

    interface HeadCell {
        dataIndex: string
        title: string
        sortable?: boolean
    }

    // Define the columns for the table
    const headCells: HeadCell[] = [
        {
            title: "ID",
            dataIndex: "id",
        },
        {
            title: "Name",
            dataIndex: "name",
        },
        {
            title: "Owner",
            dataIndex: "owner",
        },
        {
            title: "Created at",
            dataIndex: "created_at",
        },
        {
            title: "Last edited by",
            dataIndex: "lastEditedBy",
        },
        {
            title: "Updated at",
            dataIndex: "updated_at",
        },
        {
            title: "Actions",
            dataIndex: "actions",
            sortable: false,
        },
    ]

    function getTableHead() {
        return (
            <TableHead>
                <TableRow
                    sx={{
                        "&:first-of-type": {
                            borderTopLeftRadius: "var(--bs-border-radius)",
                            borderTopRightRadius: "var(--bs-border-radius)",
                        },
                    }}
                >
                    {headCells.map((headCell, index) => {
                        return (
                            <Tooltip
                                title={`Click to sort ${sorting.sortOrder === "asc" ? "descending" : "ascending"}`}
                            >
                                <TableCell // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                    id={`${headCell.title}-header`}
                                    key={headCell.title}
                                    align="center"
                                    sortDirection={sorting.columnKey === headCell.dataIndex ? sorting.sortOrder : false}
                                    sx={{
                                        color: "var(--bs-white)",
                                        backgroundColor: "var(--bs-secondary)",
                                        fontSize: "14px",
                                        position: "relative",
                                        paddingTop: "14px",
                                        paddingBottom: "14px",
                                        lineHeight: "1.0",
                                        borderTopLeftRadius: index === 0 ? "var(--bs-border-radius)" : 0,
                                        borderTopRightRadius:
                                            index === headCells.length - 1 ? "var(--bs-border-radius)" : 0,
                                        // This next part adds the cutesy separator bar between column headers
                                        "&:not(:last-child)::after": {
                                            content: '""',
                                            position: "absolute",
                                            right: 0,
                                            top: "30%",
                                            height: "40%",
                                            width: "1px",
                                            backgroundColor: "white",
                                        },
                                    }}
                                >
                                    <TableSortLabel
                                        active={sorting.columnKey === headCell.dataIndex}
                                        direction={sorting.columnKey === headCell.dataIndex ? sorting.sortOrder : "asc"}
                                        onClick={(event) =>
                                            (!headCell.sortable || headCell.sortable) &&
                                            handleHeaderClick(event, headCell.dataIndex)
                                        }
                                        sx={{
                                            color: "var(--bs-white)",
                                            ontSize: "14px",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            "&.Mui-active": {
                                                color: "var(--bs-white)",
                                            },
                                        }}
                                        IconComponent={() =>
                                            (headCell?.sortable == null || headCell?.sortable) && (
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <ArrowDropUpIcon
                                                        sx={{
                                                            color:
                                                                sorting.columnKey === headCell.dataIndex &&
                                                                sorting.sortOrder === "asc"
                                                                    ? "white"
                                                                    : "var(--bs-gray-medium-dark)",
                                                            fontSize: "large",
                                                            marginBottom: "-5px",
                                                        }}
                                                    />
                                                    <ArrowDropDownIcon
                                                        sx={{
                                                            color:
                                                                sorting.columnKey === headCell.dataIndex &&
                                                                sorting.sortOrder === "desc"
                                                                    ? "white"
                                                                    : "var(--bs-gray-medium-dark)",
                                                            fontSize: "large",
                                                            marginTop: "-5px",
                                                        }}
                                                    />
                                                </Box>
                                            )
                                        }
                                    >
                                        <Box
                                            component="span"
                                            sx={{
                                                flexGrow: 1,
                                                textAlign: "left",
                                            }}
                                        >
                                            {headCell.title}
                                        </Box>
                                    </TableSortLabel>
                                </TableCell>
                            </Tooltip>
                        )
                    })}
                </TableRow>
            </TableHead>
        )
    }

    function getTableRow(project: Project, idx: number) {
        const {allowDelete, allowSharing} = getAllowedActions(project)
        const columnKey = sorting?.columnKey

        return (
            <TableRow
                hover={true}
                role="checkbox"
                tabIndex={-1}
                key={project.id}
                sx={{
                    "& .MuiTableCell-root": {
                        paddingTop: "16px",
                        paddingBottom: "16px",
                        lineHeight: "1.5",
                    },
                }}
                onClick={() => {
                    void router.push({
                        pathname: "/projects/[projectID]",
                        query: {...router.query, projectID: project.id},
                    })
                }}
            >
                <TableCell // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    id={`project-${project.id}-id`}
                    align="left"
                    sx={{
                        backgroundColor: columnKey === "id" ? "var(--bs-gray-lightest)" : null,
                    }}
                >
                    {project.id}
                </TableCell>
                <TableCell // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    id={`project-${project.id}-name`}
                    align="left"
                    sx={{
                        backgroundColor: columnKey === "name" ? "var(--bs-gray-lightest)" : null,
                    }}
                >
                    {project.name}
                </TableCell>
                <TableCell // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    id={`project-${project.id}-owner`}
                    align="left"
                    sx={{
                        backgroundColor: columnKey === "owner" ? "var(--bs-gray-lightest)" : null,
                    }}
                >
                    {project.owner}
                </TableCell>
                <TableCell // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    id={`project-${project.id}-created-at`}
                    align="left"
                    sx={{
                        backgroundColor: columnKey === "created_at" ? "var(--bs-gray-lightest)" : null,
                    }}
                >
                    {project.created_at}
                </TableCell>
                <TableCell // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    id={`project-${project.id}-last-edited-by`}
                    align="left"
                    sx={{
                        backgroundColor: columnKey === "lastEditedBy" ? "var(--bs-gray-lightest)" : null,
                    }}
                >
                    {project.lastEditedBy}
                </TableCell>
                <TableCell // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    id={`project-${project.id}-updated-at`}
                    align="left"
                    sx={{
                        backgroundColor: columnKey === "updated_at" ? "var(--bs-gray-lightest)" : null,
                    }}
                >
                    {project.updated_at}
                </TableCell>
                <TableCell // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    id={`project-${project.id}-actions`}
                >
                    <Box // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        id={`project-${project.id}-actions-div`}
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        {allowSharing ? getSharingIcon(project) : null}
                        {allowDelete ? (
                            <Box sx={{marginLeft: "0.5rem", display: "flex"}}>{getDeleteIcon(project, idx)}</Box>
                        ) : null}
                    </Box>
                </TableCell>
            </TableRow>
        )
    }

    function getTableBody() {
        return (
            <TableBody
                sx={{
                    "& .MuiTableCell-root": {
                        fontSize: "14px",
                    },
                }}
            >
                {filteredSortedData.map((project, idx) => {
                    return getTableRow(project, idx)
                })}
            </TableBody>
        )
    }

    function getTablePagination() {
        const handleChangePage = (_event: unknown, newPage: number) => {
            setPage(newPage)
        }

        const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
            setRowsPerPage(parseInt(event.target.value, 10))
            setPage(0)
        }

        return (
            <TablePagination // eslint-disable-line enforce-ids-in-jsx/missing-ids
                id={`${id}-pagination`}
                rowsPerPageOptions={[5, 10, 15, 20, 50, 100, {label: "All", value: -1}]}
                component="div"
                count={projectList.length}
                rowsPerPage={rowsPerPage}
                page={page}
                showFirstButton={true}
                showLastButton={true}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                // Hack to make the pagination items line up. Maybe still some bootstrap classes lurking or
                // interference from TW?
                // Reference: https://github.com/mui/mui-x/issues/4076#issuecomment-1262736377
                sx={{
                    ".MuiTablePagination-displayedRows": {
                        "margin-top": "1em",
                        "margin-bottom": "1em",
                    },
                    ".MuiTablePagination-displayedRows, .MuiTablePagination-selectLabel": {
                        "margin-top": "1em",
                        "margin-bottom": "1em",
                    },
                }}
            />
        )
    }

    return (
        <Box id={id}>
            {/* Show pagination at the top as well as bottom for long pages with lots of rows */}
            {rowsPerPage >= 15 && getTablePagination()}
            <Table
                id={`${id}-table`}
                sx={{
                    cursor: "pointer",
                    boxShadow: 10,
                }}
                size="medium"
            >
                {getTableHead()}
                {getTableBody()}
            </Table>
            {getTablePagination()}
        </Box>
    )
}
