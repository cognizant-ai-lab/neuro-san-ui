import ClipLoader from "react-spinners/ClipLoader"

import {MaximumBlue} from "../const"

export const PageLoader = ({id}) => (
    <div
        id={`${id}__loader`}
        className="absolute top-50 start-0 right-0 text-center"
    >
        <h3 id={`${id}-loader__message`}>Loading... Please wait</h3>
        <ClipLoader // eslint-disable-line enforce-ids-in-jsx/missing-ids
            color={MaximumBlue}
            loading={true}
            size={100}
        />
    </div>
)
