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
    const seriesData = data.map(row => {
        const rowData = {cid: row.value[row.value.length - 1]};
        objectives.forEach((objective, index) => {
            rowData[objective] = row.value[index];
        });
        return rowData;
    });
    return `
<table style="width:100%;user-select: text">
    <thead>
        <tr>
            <th style="text-align: center">Prescriptor</th>
                ${objectives.map(objective => 
                    `<th style="text-align: center">${objective}</th>`)
                .join("\n")}
        </tr>
    </thead>
    <tbody>
        ${seriesData.map(row => {
            let cells = ""
            objectives.forEach(objective => {
                cells += `<td style="text-align: center">${row[objective]}</td>`
            })
            return `<tr><td style="text-align: center">${row.cid}</td>${cells}</tr>`})
        .join("\n")}
    </tbody>
</table>
`
}
