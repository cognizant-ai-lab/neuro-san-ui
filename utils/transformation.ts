// Miscellaneous object transformation utilities

// Removes the first instance of "value" from array"arr", if found, and returns the modified
// array
export function removeItemOnce(arr, value) {
    const index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}