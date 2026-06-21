import ClearIcon from "@mui/icons-material/Clear"
import Visibility from "@mui/icons-material/Visibility"
import VisibilityOff from "@mui/icons-material/VisibilityOff"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import FormLabel from "@mui/material/FormLabel"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import TextField from "@mui/material/TextField"
import Tooltip from "@mui/material/Tooltip"
import {FC, ChangeEvent as ReactChangeEvent, useEffect, useState} from "react"

import {ConfirmationModal} from "../Common/ConfirmationModal"
import {StatusLight} from "../Common/StatusLight"

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
    const [showKey, setShowKey] = useState<boolean>(false)

    const handleValueChange = (e: ReactChangeEvent<HTMLInputElement>) => {
        setKeyValidated(null)
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

    // Sync with persisted value changes - if the persisted value changes from outside
    useEffect(() => {
        setInputValue(persistedValue ?? "")
        setKeyValidated(null)
    }, [persistedValue])

    const handleClearInput = () => {
        setInputValue("")
        setKeyValidated(null)
    }

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
                    alt={`${vendor} logo`}
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
                onChange={handleValueChange}
                placeholder={placeholder}
                size="small"
                slotProps={{
                    input: {
                        endAdornment: (
                            <InputAdornment position="end">
                                <Tooltip title={showKey ? "Hide API key" : "Show API key"}>
                                    {/*"span" required for tooltip when child is disabled. See:*/}
                                    {/*https://github.com/mui/material-ui/issues/8416*/}
                                    <span>
                                        <IconButton
                                            aria-label="toggle key visibility"
                                            disabled={!inputValue}
                                            onClick={() => setShowKey(!showKey)}
                                            onMouseDown={(e) => e.preventDefault()}
                                            size="small"
                                        >
                                            {showKey ? (
                                                <VisibilityOff fontSize="small" />
                                            ) : (
                                                <Visibility fontSize="small" />
                                            )}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <IconButton
                                    aria-label="Clear input"
                                    edge="end"
                                    onClick={handleClearInput}
                                    size="small"
                                >
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ),
                    },
                }}
                sx={{flex: 1}}
                // Type depends on whether we're showing or hiding the key
                type={showKey ? "text" : "password"}
                value={inputValue}
                variant="outlined"
            />
            <StatusLight statusValue={keyValidated === null ? "unknown" : keyValidated ? "green" : "red"} />
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
