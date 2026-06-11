import CheckIcon from "@mui/icons-material/Check"
import ClearIcon from "@mui/icons-material/Clear"
import ErrorIcon from "@mui/icons-material/Error"
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
    readonly placeholder: string
    readonly vendor: string
}

/**
 * Component for inputting an API key for a given vendor, with the ability to test the key and forget the saved key.
 */
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
    const [inputValue, setInputValue] = useState<string>(persistedValue ?? "")
    const [keyValidated, setKeyValidated] = useState<null | boolean>(null)
    const [isValidating, setIsValidating] = useState<boolean>(false)
    const [confirmationDialogOpen, setConfirmationDialogOpen] = useState<boolean>(false)

    const handleValueChange = (e: ReactChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value)
    }

    const handleOnTest = async () => {
        setIsValidating(true)
        setKeyValidated(null)
        try {
            const isValid = await onTest(inputValue)
            setKeyValidated(isValid)
        } finally {
            setIsValidating(false)
        }
    }

    const disableActions = !inputValue || inputValue === persistedValue || isValidating

    return (
        <Box
            data-testid={`${id}-input`}
            sx={{display: "flex", alignItems: "center", width: "100%", gap: 2}}
        >
            {confirmationDialogOpen ? (
                <ConfirmationModal
                    id={`${id}-forget-key-confirmation-modal`}
                    content={
                        `This will forget the currently saved API key for ${vendor} and you will need to enter ` +
                        " the key again to use networks that require it. Are you sure you want to continue?"
                    }
                    handleCancel={() => {
                        setConfirmationDialogOpen(false)
                    }}
                    handleOk={() => {
                        setConfirmationDialogOpen(false)
                        setInputValue("")
                        forgetKey()
                    }}
                    okBtnLabel="Yes, forget key"
                    title={`Forget ${vendor} API key?`}
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

            <FormLabel
                id={`${id}-label`}
                sx={{width: 90, flexShrink: 0}}
            >
                {vendor}
            </FormLabel>

            <TextField
                aria-labelledby={`${id}-label`}
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
                                    onClick={() => setInputValue("")}
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
                    color: (theme) => (keyValidated ? theme.palette.success.main : theme.palette.error.main),
                }}
            >
                {keyValidated === null ? null : keyValidated ? (
                    <CheckIcon fontSize="small" />
                ) : (
                    <ErrorIcon fontSize="small" />
                )}
            </Box>
            <Button
                disabled={disableActions}
                loading={isValidating}
                onClick={handleOnTest}
                size="small"
                variant="contained"
            >
                Test
            </Button>
            <Button
                onClick={() => onSave(inputValue)}
                size="small"
                variant="contained"
                disabled={disableActions}
            >
                Save
            </Button>
            <Button
                onClick={() => setConfirmationDialogOpen(true)}
                size="small"
                variant="contained"
                disabled={!persistedValue || isValidating}
            >
                Forget
            </Button>
        </Box>
    )
}
