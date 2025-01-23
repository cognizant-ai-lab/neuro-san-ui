import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown"
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp"
import ClearIcon from "@mui/icons-material/Clear"
import SearchIcon from "@mui/icons-material/Search"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import Popover from "@mui/material/Popover"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableHead from "@mui/material/TableHead"
import TablePagination from "@mui/material/TablePagination"
import TableRow from "@mui/material/TableRow"
import TableSortLabel from "@mui/material/TableSortLabel"
import TextField from "@mui/material/TextField"
import Tooltip from "@mui/material/Tooltip"
import {NextRouter} from "next/router"
import {ChangeEvent, ReactElement, MouseEvent as ReactMouseEvent, useMemo, useState} from "react"

import {FilterSpecification, SortSpecification} from "./types"
import {Project} from "../../controller/projects/types"

interface HeadCell {
    dataIndex: string
    title: string
    sortable?: boolean
    filterable?: boolean
}

interface ProjectsTableProps {
    readonly id: string
    readonly projectList: Project[]
    readonly router: NextRouter
    readonly getAllowedActions: (project: Project) => {allowDelete: boolean; allowSharing: boolean}
    readonly getSharingIcon: (project: Project) => ReactElement
    readonly getDeleteIcon: (project: Project, idx: number) => ReactElement
    readonly filtering: FilterSpecification
    readonly setFiltering: (filtering: FilterSpecification) => void
    readonly sorting: SortSpecification
    readonly setSorting: (sorting: SortSpecification) => void
    readonly page: number
    readonly setPage: (page: number) => void
    readonly rowsPerPage: number
    readonly setRowsPerPage: (rowsPerPage: number) => void
}

// Define the columns for the table
const HEAD_CELLS: HeadCell[] = [
    {
        title: "ID",
        dataIndex: "id",
    },
    {
        title: "Name",
        dataIndex: "name",
        filterable: true,
    },
    {
        title: "Owner",
        dataIndex: "owner",
        filterable: true,
    },
    {
        title: "Created at",
        dataIndex: "created_at",
    },
    {
        title: "Last edited by",
        dataIndex: "lastEditedBy",
        filterable: true,
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

/**
 * Get the table of projects for the "List" view
 *
 * @returns React element representing the project table
 */
export default function ProjectsTable(props: ProjectsTableProps): ReactElement<ProjectsTableProps> {
    // Extract all props
    const {
        id,
        projectList,
        router,
        getAllowedActions,
        getSharingIcon,
        getDeleteIcon,
        filtering,
        setFiltering,
        sorting,
        setSorting,
        page,
        setPage,
        rowsPerPage,
        setRowsPerPage,
    } = props

    // For handling Popover.

    // Anchor of element that wants the Popover
    const [anchorEl, setAnchorEl] = useState<SVGSVGElement | null>(null)

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
                    // would be to attempt to parse it as such (leading to false positives...) or use our intrinsic
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
    const lowerCaseFilterText = filtering.filterText?.toLocaleLowerCase()
    const filteredSortedData = useMemo(
        () =>
            (filtering.columnKey && filtering.filterText
                ? sortedData.filter(
                      (datum) =>
                          filtering.filterText.length < 2 ||
                          datum[filtering.columnKey].toLocaleLowerCase().includes(lowerCaseFilterText)
                  )
                : sortedData
            ).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [sortedData, filtering, lowerCaseFilterText, page, rowsPerPage]
    )

    const handleHeaderClick = (_event: ReactMouseEvent<unknown>, clickedHeaderId: string) => {
        if (clickedHeaderId !== sorting.columnKey) {
            // If a new column is clicked, clear previous sorting
            setSorting({
                columnKey: clickedHeaderId,
                sortOrder: "asc",
            })
        } else {
            // Toggle sorting order for the same column
            const newSortOrder = sorting.sortOrder === "desc" ? "asc" : "desc"

            setSorting({
                ...sorting,
                sortOrder: newSortOrder,
            })
        }
    }

    function getTableHeaderCell(headCell: HeadCell, index: number): ReactElement<typeof Tooltip> {
        const handleTableHeaderClick = (event: ReactMouseEvent<SVGSVGElement>, columnId: string) => {
            event.stopPropagation()
            setAnchorEl((current) => (!current ? event.currentTarget : null))

            setFiltering({
                ...filtering,
                columnKey: columnId,
            })
        }

        return (
            <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                id={`${headCell.title}-tooltip`}
                title={`Click to sort ${sorting?.sortOrder === "asc" ? "descending" : "ascending"}`}
                key={`${headCell.title}-tooltip`}
            >
                <TableCell // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    id={`${headCell.title}-header`}
                    key={headCell.title}
                    align="center"
                    sortDirection={sorting?.columnKey === headCell.dataIndex ? sorting?.sortOrder : false}
                    sx={{
                        color: "var(--bs-white)",
                        backgroundColor: "var(--bs-secondary)",
                        fontSize: "14px",
                        position: "relative",
                        paddingTop: "14px",
                        paddingBottom: "14px",
                        lineHeight: "1.0",
                        borderTopLeftRadius: index === 0 ? "var(--bs-border-radius)" : 0,
                        borderTopRightRadius: index === HEAD_CELLS.length - 1 ? "var(--bs-border-radius)" : 0,
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
                    onClick={(event) =>
                        (!headCell.sortable || headCell.sortable) && handleHeaderClick(event, headCell.dataIndex)
                    }
                >
                    <Box // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        id={`${headCell.title}-header-box`}
                        sx={{display: "flex", alignItems: "center", justifyContent: "space-between"}}
                    >
                        <Box // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            id={`${headCell.title}-header-box-inner`}
                            component="span"
                            sx={{
                                textAlign: "left",
                                flexGrow: 1,
                            }}
                        >
                            {headCell.title}
                        </Box>
                        <Box // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            id={`${headCell.title}-header-box-inner-2`}
                            sx={{display: "flex", alignItems: "center"}}
                        >
                            <Box // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                id={`${headCell.title}-header-box-inner-2-box`}
                            >
                                <TableSortLabel // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                    id={`${headCell.title}-header-sort-label`}
                                    active={sorting?.columnKey === headCell.dataIndex}
                                    direction={sorting.columnKey === headCell.dataIndex ? sorting.sortOrder : "asc"}
                                    sx={{
                                        color: "var(--bs-white)",
                                        fontSize: "14px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        "&.Mui-active": {
                                            color: "var(--bs-white)",
                                        },
                                    }}
                                    IconComponent={() =>
                                        (headCell?.sortable == null || headCell?.sortable) && (
                                            <Box // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                                id={`${headCell.title}-header-sort-label-box`}
                                                component="span"
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                }}
                                            >
                                                <ArrowDropUpIcon // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                                    id={`${headCell.title}-header-sort-label-arrow-up`}
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
                                                <ArrowDropDownIcon // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                                    id={`${headCell.title}-header-sort-label-arrow-down`}
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
                                />
                            </Box>
                            {headCell?.filterable && (
                                <SearchIcon // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                    id={`${headCell.title}-header-search-icon`}
                                    sx={{
                                        display: "flex",
                                        fontSize: "1rem",
                                        color:
                                            headCell.dataIndex === filtering.columnKey && filtering.filterText
                                                ? "var(--bs-red)"
                                                : "var(--bs-gray-medium-dark)",
                                    }}
                                    onClick={(event) => handleTableHeaderClick(event, headCell.dataIndex)}
                                />
                            )}
                        </Box>
                    </Box>
                </TableCell>
            </Tooltip>
        )
    }

    function getTableHead() {
        return (
            <TableHead id={`${id}-table-head`}>
                <TableRow
                    id={`${id}-table-head-row`}
                    sx={{
                        "&:first-of-type": {
                            borderTopLeftRadius: "var(--bs-border-radius)",
                            borderTopRightRadius: "var(--bs-border-radius)",
                        },
                    }}
                >
                    {HEAD_CELLS.map((headCell, index) => getTableHeaderCell(headCell, index))}
                </TableRow>
            </TableHead>
        )
    }

    function getTableRow(project: Project, idx: number) {
        const {allowDelete, allowSharing} = getAllowedActions(project)
        const columnKey = sorting?.columnKey

        return (
            <TableRow // eslint-disable-line enforce-ids-in-jsx/missing-ids
                id={`project-${project.id}`}
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
                            <Box // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                id={`project-${project.id}-delete`}
                                sx={{marginLeft: "0.5rem", display: "flex"}}
                            >
                                {getDeleteIcon(project, idx)}
                            </Box>
                        ) : null}
                    </Box>
                </TableCell>
            </TableRow>
        )
    }

    function getTableBody() {
        return (
            <TableBody
                id={`${id}-table-body`}
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
            const newItemsPerPageValue = parseInt(event.target.value, 10)
            setRowsPerPage(newItemsPerPageValue)
            setPage(0)
            setRowsPerPage(newItemsPerPageValue)
        }

        return (
            <TablePagination
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

    // Generates popup for editing column filter value
    function getPopover() {
        const isOpen = Boolean(anchorEl)
        return (
            <Popover // eslint-disable-line enforce-ids-in-jsx/missing-ids
                id={isOpen ? "input-filter-div" : undefined}
                open={isOpen}
                anchorEl={anchorEl}
                onClose={() => {
                    setAnchorEl(null)
                }}
                anchorOrigin={{
                    vertical: "top",
                    horizontal: "left",
                }}
                sx={{padding: 0, margin: 0, minHeight: 0}}
            >
                <TextField
                    id="filter-input"
                    autoFocus={true}
                    value={filtering.filterText}
                    label="Filter value"
                    variant="outlined"
                    sx={{
                        width: "15rem",
                        margin: "0.5rem",
                    }}
                    slotProps={{
                        inputLabel: {
                            shrink: true,
                        },
                        input: {
                            sx: {borderRadius: "var(--bs-border-radius)", height: "2.5rem"},
                            endAdornment: (
                                <InputAdornment
                                    id="clear-input-adornment"
                                    position="end"
                                >
                                    <IconButton
                                        id="filter-clear-button"
                                        onClick={() => {
                                            setFiltering({columnKey: "", filterText: ""})
                                        }}
                                        size="large"
                                        disabled={!filtering.filterText}
                                        tabIndex={-1}
                                        edge="end"
                                    >
                                        <ClearIcon
                                            id="clear-input-icon"
                                            sx={{
                                                fontSize: "1rem",
                                                color: "var(--bs-primary)",
                                                opacity: filtering.filterText ? "100%" : "25%",
                                            }}
                                        />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                    }}
                    onChange={(event) => setFiltering({...filtering, filterText: event.target.value})}
                />
            </Popover>
        )
    }

    return (
        <Box id={id}>
            {/* Show pagination at the top as well as bottom for long pages with lots of rows */}
            {rowsPerPage >= 15 && getTablePagination()}

            {/*Main Table*/}
            <Table
                id={`${id}-table`}
                sx={{
                    cursor: "pointer",
                    boxShadow: 10,
                }}
                size="medium"
            >
                {getPopover()}
                {getTableHead()}
                {getTableBody()}
            </Table>
            {getTablePagination()}
        </Box>
    )
}
