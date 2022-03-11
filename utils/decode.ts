import fromBinary from "./conversion"

// This utility was created to decode the Artifact bytes field to 
// display the rules for a given prescriptor
export default function decode(byteArray: Uint8Array): string {
    return new TextDecoder().decode(fromBinary(byteArray))
}