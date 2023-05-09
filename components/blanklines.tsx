/**
 * Simple component to inject some amount of blank lines into a page or component. Users like to have blank space
 * at the bottom of pages so the relevant info isn't displayed all the way at the bottom of the browser viewport.
 * 
 * It seems (googling, StackOverflow etc.) there's no built-in way to do this, so here we are.
 * 
 * @param props Accepts a single property -- <code>numLines</code>, the number of lines to add
 * @return A React fragment containing the desired number of blank lines via <code><br></code> tags.
 */
export default function BlankLines(props) {
    return <>
        {[...Array(props.numLines)].map((_, i) => <br id={`end-whitespace-${i}`} key={i}/>)}
    </>
} 
