import * as z from "zod"

/**
 * Zod schema for sly_data BYOK structure
 */
export const BYOK = z.looseObject({
    type: z.string().optional(),
    required: z.tuple([z.literal("llm_config")]).optional(),
    properties: z
        .looseObject({
            llm_config: z
                .looseObject({
                    type: z.string().optional(),
                    properties: z
                        .record(
                            z.string(),
                            z.looseObject({
                                type: z.string().optional(),
                                description: z.string().optional(),
                            })
                        )
                        .optional(),
                })
                .optional(),
        })
        .optional(),
})
