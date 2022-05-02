/*
Unit tests for the various small utility modules
 */

import {removeItemOnce} from "../utils/transformation";

describe('Various utilities', () => {
    it('removes first item from an array"', async () => {
        const res = removeItemOnce(["a", "b", "c"], "a")
        expect(res).toEqual(["b", "c", "d"])
    })
})
