/**
 * For various utils used by the various Pareto plot modules
 */

/**
 * Get the data table for the Pareto plot
 * @param data The data for the table
 * @param objectives Array of objectives
 * @return A string contain an HTML table with the data
 */
export function getDataTable(data, objectives) {
    const seriesData = data.map((row) => {
        const rowData = {cid: row.value[row.value.length - 1]}
        objectives.forEach((objective, index) => {
            rowData[objective] = row.value[index]
        })
        return rowData
    })
    return `
<table style="width:100%;user-select: text">
    <thead>
        <tr>
            <th style="text-align: center">Prescriptor</th>
                ${objectives.map((objective) => `<th style="text-align: center">${objective}</th>`).join("\n")}
        </tr>
    </thead>
    <tbody>
        ${seriesData
            .map((row) => {
                let cells = ""
                objectives.forEach((objective) => {
                    cells += `<td style="text-align: center">${row[objective]}</td>`
                })
                return `<tr><td style="text-align: center">${row.cid}</td>${cells}</tr>`
            })
            .join("\n")}
    </tbody>
</table>
`
}

/**
 * Next two functions inspired by this post:
 * https://stackoverflow.com/questions/8506881/nice-label-algorithm-for-charts-with-minimum-ticks/16363437#16363437
 */

/**
 * Calculate the min, max, and tick spacing for a given range. Uses "nice" numbers for min, max and the tick spacing,
 * where "nice" means a round multiple of 1, 2, 5, 10, or powers of 10 multiples of the same.
 *
 * @param min Original minimum value
 * @param max Original maximum value
 * @param maxTicks Maximum number of ticks required for the axis
 */
export function calculateMinMax(
    min: number,
    max: number,
    maxTicks: number = 10
): {niceMin: number; niceMax: number; tickSpacing: number} {
    const originalRange = max - min
    const range = niceNum(originalRange, false)
    const tickSpacing = niceNum(range / (maxTicks - 1), true)
    const niceMin = Math.floor(min / tickSpacing) * tickSpacing - tickSpacing
    const niceMax = Math.ceil(max / tickSpacing) * tickSpacing + tickSpacing

    return {niceMin, niceMax, tickSpacing}
}

/**
 * Returns a "nice" number approximately equal to `input`
 * Rounds the number if roundDown = true. Takes the ceiling if roundDown = false.
 *
 * @Note Only designed to work with positive numbers. For negative numbers, the original value is returned.
 *
 * @param input The number to be converted to a "nice" value
 * @param roundDown whether to round the result
 * @return a "nice" number to be used for the data range
 */
export function niceNum(input: number, roundDown: boolean): number {
    // We don't handle negative values
    if (input < 0) {
        return input
    }

    // exponent of range
    const exponent = Math.floor(Math.log10(input))

    // fractional part of range
    const fraction = input / 10 ** exponent

    // nice, rounded fraction
    let niceFraction: number

    // Two cases, depending whether we're rounding or not.
    // We rather arbitrarily declare that "nice" numbers are multiples of 1, 2, 5, or 10 or multiples of 10^x of the
    // same. Humans like such numbers.
    if (roundDown) {
        if (fraction < 1.5) {
            niceFraction = 1
        } else if (fraction < 3) {
            niceFraction = 2
        } else if (fraction < 7) {
            niceFraction = 5
        } else {
            niceFraction = 10
        }
    }

    if (!roundDown) {
        if (fraction <= 1) {
            niceFraction = 1
        } else if (fraction <= 2) {
            niceFraction = 2
        } else if (fraction <= 5) {
            niceFraction = 5
        } else {
            niceFraction = 10
        }
    }

    return niceFraction * 10 ** exponent
}
