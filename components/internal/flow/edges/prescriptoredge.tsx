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

import SyntaxHighlighter from 'react-syntax-highlighter';
import {docco} from 'react-syntax-highlighter/dist/cjs/styles/hljs';

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

    // XXX  This could use some GetElementIndex love similar to what is going on
    //      in predictornode, prescriptornode, uncertaintyModelNode
    const flowPrefix = `prescriptoredge-${id}`

    const PredictorOverride =
        <Card.Body id={ `${flowPrefix}-output-override-code` }>
            <SyntaxHighlighter id={ `${flowPrefix}-output-override-code-syntax-highlighter` }
                language="python" style={docco} showLineNumbers={true}>
                {data.OutputOverrideCode}
            </SyntaxHighlighter>
        </Card.Body>
    return (
        <>
            <path id={ `${flowPrefix}` }
                style={style}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={markerEnd}
            />
            <foreignObject id={ `${flowPrefix}-settings-div` }
                width={foreignObjectSize}
                height={foreignObjectSize}
                x={edgeCenterX - foreignObjectSize / 2}
                y={edgeCenterY - foreignObjectSize / 2}
                className="edgebutton-foreignobject"
                requiredExtensions="http://www.w3.org/1999/xhtml"
            >
                <Popover    // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // 2/6/23 DEF - Popover does not have an id property when compiling
                    position={Position.LEFT}
                    minWidth='1rem'
                    content={ <>
                        <Tablist id={ `${flowPrefix}-settings-tablist` } 
                            marginBottom={16} 
                            flexBasis={240} 
                            marginRight={24}>
                            {tabs.map((tab, index) => (
                                <Tab
                                    key={tab}
                                    id={ `${flowPrefix}-settings-${tab}` }
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
                    <div id={ `${flowPrefix}-gr-settings-div` } className="flex">
                        <button id={ `${flowPrefix}-gr-settings-button` }
                                type="button" 
                                className="mt-1"
                                style={{height: 0}}>
                            <GrSettingsOption id={ `${flowPrefix}-gr-settings-option` } />
                        </button>
                    </div>
                </Popover>
            </foreignObject>
        </>
    )
}
