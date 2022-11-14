// Import React framework
import React, { useState } from 'react';

// Import Flow Renderer
import {
  getBezierPath,
  getEdgeCenter,
  getMarkerEnd,
} from 'react-flow-renderer';

// Import third party components
import { 
    Card
} from "react-bootstrap"
import { 
    Popover, 
    Position, 
    Tablist, 
    Tab
} from "evergreen-ui"
import { 
    GrSettingsOption 
} from "react-icons/gr"

// Import Code Mirror
import { Controlled as CodeMirror } from 'react-codemirror2'
// require('codemirror/mode/python/python');


const foreignObjectSize = 20;

export default function PrescriptorEdge({ id, sourceX, sourceY,
                                        targetX, targetY,
                                        sourcePosition, targetPosition,
                                        style = {}, data, arrowHeadType,
                                        markerEndId
                                        }) {
    const edgePath = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    })
    const markerEnd = getMarkerEnd(arrowHeadType, markerEndId)
    const [edgeCenterX, edgeCenterY] = getEdgeCenter({
        sourceX,
        sourceY,
        targetX,
        targetY,
    })

    // We want to have a tabbed predictor configuration
    // and thus we build the following component
    // Declare state to keep track of the Tabs
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [tabs] = useState(['Override Predictor Output'])

    const PredictorOverride = <Card.Body> 
                                    <CodeMirror
                                        value={data.OutputOverrideCode}
                                        options={{
                                            tabSize: 4,
                                            theme: 'material',
                                            lineNumbers: true,
                                            mode: 'python',
                                        }}
                                        onBeforeChange={
                                            (editor, editorData, value) => data.UpdateOutputOverrideCode(value)

                                        }
                                    />
                                </Card.Body>
    const buttonId  = `gr-settings-option-${id}`
    return (
        <>
            <path
                id={id}
                style={style}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={markerEnd}
            />
            <foreignObject
                width={foreignObjectSize}
                height={foreignObjectSize}
                x={edgeCenterX - foreignObjectSize / 2}
                y={edgeCenterY - foreignObjectSize / 2}
                className="edgebutton-foreignobject"
                requiredExtensions="http://www.w3.org/1999/xhtml"
            >
                <Popover
                position={Position.LEFT}
                minWidth='1rem'
                content={
                    <>
                        <Tablist 
                        marginBottom={16} 
                        flexBasis={240} 
                        marginRight={24}>
                                {tabs.map((tab, index) => (
                            <Tab
                                key={tab}
                                id={tab}
                                onSelect={() => setSelectedIndex(index)}
                                isSelected={index === selectedIndex}
                                aria-controls={`panel-${tab}`}
                            >
                                {tab}
                            </Tab>
                            ))}
                        </Tablist>
                        { selectedIndex === 0  && PredictorOverride }
                    </>
                }
                >   
                    <div className="flex">
                        <button type="button" 
                                className="mt-1"
                                id={buttonId}
                                style={{height: 0}}>
                            <GrSettingsOption />
                        </button>
                    </div>
                </Popover>
            </foreignObject>
        </>
    )
}
