/*
Unit tests for the various small utility modules
 */

import {arraysEqual} from "../utils/objects";
import {removeItemOnce} from "../utils/transformation";
import {getEnumKeyByEnumValue} from "../utils/enum";
import sortByTime from "../utils/sort";
import decode from "../utils/conversion";

describe('Various utilities', () => {
    it('removes first item from an array', async () => {
        const res = removeItemOnce(["a", "b", "c"], "a")
        expect(res).toEqual(["b", "c"])
    })

    it('decodes binary string', async () => {
        const res: string = decode("4pyTIMOgIGxhIG1vZGU=")
        expect(res).toEqual("✓ à la mode")
    })
    
    it('retrieves enum key by the value', async () => {
        // Create an enum to test enum function
        // no-shadow doesn't do well with enums. Search their github issues if you're curious.
        // eslint-disable-next-line no-shadow
        enum DIRECTION {
            Up = "UP",
            Down = "DOWN",
            Left = "LEFT",
            Right = "RIGHT",
        }

        const res = getEnumKeyByEnumValue(DIRECTION, "UP")
        expect(res).toEqual("Up")
    })

    it('sorts objects based on value of updated_at', async () => {
        // Values pulled from a runs request by experiment_id
        const runs = [
            {"updated_at": "2022-04-26T00:41:46.823011Z"},
            {"updated_at": "2022-05-03T23:09:10.293151Z"},
            {"updated_at": "2022-04-29T16:17:06.865579Z"}
        ]

        sortByTime(runs)

        expect(runs).toEqual([
            {"updated_at": "2022-05-03T23:09:10.293151Z"},
            {"updated_at": "2022-04-29T16:17:06.865579Z"},
            {"updated_at": "2022-04-26T00:41:46.823011Z"}
        ])
    })

    it('compares arrays correctly', async () => {
        let res

        res = arraysEqual([], [])
        expect(res).toEqual(true)

        res = arraysEqual(undefined, [])
        expect(res).toEqual(true) // non-array things get promoted to []

        // happy path
        res = arraysEqual(["a", "b", "c"], ["a", "b", "c"])
        expect(res).toEqual(true)

        // order doesn't matter
        res = arraysEqual(["c", "b", "a"], ["a", "b", "c"])
        expect(res).toEqual(true)

        // different lengths
        res = arraysEqual(["a", "b", "c"], ["a", "b"])
        expect(res).toEqual(false)

        // different contents
        res = arraysEqual(["a", "b", "c"], ["a", "b", "d"])
        expect(res).toEqual(false)
    })
})
