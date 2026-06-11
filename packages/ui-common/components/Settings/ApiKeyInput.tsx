import CheckIcon from "@mui/icons-material/Check"
import ClearIcon from "@mui/icons-material/Clear"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import FormLabel from "@mui/material/FormLabel"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import TextField from "@mui/material/TextField"
import {FC, ChangeEvent as ReactChangeEvent, useState} from "react"

import {ConfirmationModal} from "../Common/ConfirmationModal"

interface ApiKeyInputProps {
    readonly forgetKey: () => void
    readonly id: string
    readonly logo: string
    readonly onSave: (key: string) => void
    readonly onTest: (key: string) => Promise<boolean>
    readonly persistedValue: string
    readonly placeholder?: string
    readonly vendor: string
}

export const ApiKeyInput: FC<ApiKeyInputProps> = ({
    forgetKey,
    id,
    logo,
    onSave,
    onTest,
    persistedValue,
    placeholder,
    vendor,
}) => {
    const [inputValue, setInputValue] = useState<string>(persistedValue)
    const [keyValidated, setKeyValidated] = useState<null | boolean>(null)
    const [isValidating, setIsValidating] = useState<boolean>(false)
    const [forgetKeyConfirmationModalOpen, setForgetKeyConfirmationModalOpen] = useState<boolean>(false)

    const handleValueChange = (e: ReactChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value)
    }

    const handleOnTest = async () => {
        setIsValidating(true)
        try {
            const isValid = await onTest(inputValue)
            setKeyValidated(isValid)
        } finally {
            setIsValidating(false)
        }
    }

    const disableActions = !inputValue || inputValue === persistedValue || isValidating

    return (
        <Box sx={{display: "flex", alignItems: "center", width: "100%", gap: 2}}>
            {forgetKeyConfirmationModalOpen ? (
                <ConfirmationModal
                    id={`${id}-forget-key-confirmation-modal`}
                    content={
                        `This will forget the currently saved API key for ${vendor} and you will need to enter ` +
                        " the key again to use networks that require it. Are you sure you want to continue?"
                    }
                    handleCancel={() => {
                        setForgetKeyConfirmationModalOpen(false)
                    }}
                    handleOk={() => {
                        setForgetKeyConfirmationModalOpen(false)
                        setInputValue("")
                        forgetKey()
                    }}
                    title="Reset to default settings"
                />
            ) : null}
            <Box
                sx={{
                    width: 25,
                    height: 25,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <img
                    src={logo}
                    alt="Logo"
                    style={{maxWidth: "100%", maxHeight: "100%", objectFit: "contain"}}
                />
            </Box>

            <FormLabel sx={{width: 90, flexShrink: 0}}>{vendor}</FormLabel>

            <TextField
                autoComplete="off"
                placeholder={placeholder}
                size="small"
                slotProps={{
                    input: {
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label="Clear input"
                                    edge="end"
                                    onClick={() => setForgetKeyConfirmationModalOpen(true)}
                                    size="small"
                                >
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ),
                    },
                }}
                value={inputValue}
                onChange={handleValueChange}
                sx={{flex: 1}}
                type="password"
                variant="outlined"
            />
            <Box
                sx={{
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: (theme) => (keyValidated ? theme.palette.success.main : theme.palette.error.main),
                }}
            >
                {keyValidated === null ? null : keyValidated ? (
                    <CheckIcon fontSize="small" />
                ) : (
                    <ClearIcon fontSize="small" />
                )}
            </Box>
            <Button
                disabled={disableActions}
                loading={isValidating}
                onClick={handleOnTest}
                size="small"
                sx={{height: (theme) => theme.spacing(5)}}
                variant="contained"
            >
                Test
            </Button>
            <Button
                onClick={() => onSave(inputValue)}
                size="small"
                variant="contained"
                sx={{height: (theme) => theme.spacing(5)}}
                disabled={disableActions}
            >
                Save
            </Button>
        </Box>
    )
}
