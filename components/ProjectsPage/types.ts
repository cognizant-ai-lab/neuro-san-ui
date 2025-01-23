// For sorting
// no-shadow doesn't do well with enums. Search their github issues if you're curious.
// eslint-disable-next-line no-shadow
export const enum ShowAsOption {
    CARDS,
    LIST,
}

// eslint-disable-next-line no-shadow
export const enum DisplayOption {
    ALL_PROJECTS = 1,
    MY_PROJECTS_ONLY = 2,
    DEMO_PROJECTS = 3,
}

/**
 * Specification for sorting a column. Includes the column name and sort order (direction).
 */
export interface SortSpecification {
    readonly columnKey: string
    readonly sortOrder: SortOrder
}

/**
 * Specification for filtering a column. Includes the column name and filter text.
 */
export interface FilterSpecification {
    readonly columnKey: string
    readonly filterText: string
}

/**
 * Preferences for the project page.
 */
export interface ProjectPagePreferences {
    readonly rowsPerPage: number
    readonly showAsOption: ShowAsOption
    readonly displayOption: DisplayOption
    readonly sortSpecification: SortSpecification
    readonly filterSpecification: FilterSpecification
}

/**
 * For column sort order
 */
type SortOrder = "asc" | "desc"
