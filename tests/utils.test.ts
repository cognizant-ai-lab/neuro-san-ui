/*
Unit tests for the various small utility modules
 */

import {removeItemOnce} from "../utils/transformation";
import fromBinary from "../utils/conversion";
import {getEnumKeyByEnumValue} from "../utils/enum";
import sortByTime from "../utils/sort";

describe('Various utilities', () => {
    it('removes first item from an array', async () => {
        const res = removeItemOnce(["a", "b", "c"], "a")
        expect(res).toEqual(["b", "c"])
    })

    it('decodes binary string', async () => {
        const res = fromBinary("EycgAOAAIABsAGEAIABtAG8AZABlAA==")
        expect(res).toEqual("✓ à la mode")
    })
    
    it('retrieves enum key by the value', async () => {
        // Create an enum to test enum function
        enum DIRECTION {
            Up = "UP",
            Down = "DOWN",
            Left = "LEFT",
            Right = "RIGHT",
        }

        const res = getEnumKeyByEnumValue(DIRECTION, "UP")
        expect(res).toEqual("UP")
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
})

