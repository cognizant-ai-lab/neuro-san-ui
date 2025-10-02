import React, { FC } from 'react';
import { Edge } from 'reactflow';

interface ThoughtBubbleOverlayProps {
    edges: Edge[];
}

export const ThoughtBubbleOverlay: FC<ThoughtBubbleOverlayProps> = ({
    edges,
}) => {
    // Filter thought bubble edges and render them as HTML overlays
    const thoughtBubbleEdges = edges.filter(edge => edge.type === 'thoughtBubbleEdge');
    
    // Debug logging (minimal)
    if (thoughtBubbleEdges.length > 0) {
        console.log('ThoughtBubbleOverlay - Rendering', thoughtBubbleEdges.length, 'thought bubbles');
    }
    
    return (
        <>
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -50%) translateY(8px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%) translateY(0) scale(1);
                    }
                }
            `}</style>
            <div 
                style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%', 
                    pointerEvents: 'none',
                    zIndex: 1000
                }}
            >
            {thoughtBubbleEdges.map((edge, index) => {
                const text = edge.data?.text;
                if (!text) return null;
                
                // Parse text to extract inquiry
                const parseText = (text: string): string => {
                    if (!text) return "";
                    
                    try {
                        // Handle "Invoking: `Tool` with `{json}`" format
                        const invokingMatch = text.match(/Invoking: `[^`]+` with `(.+)`/);
                        if (invokingMatch) {
                            let jsonStr = invokingMatch[1];
                            jsonStr = jsonStr.replace(/'/g, '"');
                            const parsed = JSON.parse(jsonStr);
                            if (parsed.inquiry) return parsed.inquiry;
                            if (parsed.Inquiry) return parsed.Inquiry;
                        }
                        
                        // Handle direct JSON format
                        const parsed = JSON.parse(text);
                        if (parsed.inquiry) return parsed.inquiry;
                        if (parsed.Inquiry) return parsed.Inquiry;
                        
                        return text;
                    } catch {
                        // Handle markdown code blocks
                        const codeBlockMatch = text.match(/```json\s*\n([\s\S]*?)\n```/);
                        if (codeBlockMatch) {
                            try {
                                const parsed = JSON.parse(codeBlockMatch[1]);
                                if (parsed.inquiry) return parsed.inquiry;
                                if (parsed.Inquiry) return parsed.Inquiry;
                            } catch {
                                // Fall through
                            }
                        }
                        
                        return text;
                    }
                };
                
                const parsedText = parseText(text);
                if (!parsedText) return null;
                
                // Position bubbles in a more organic layout
                const baseLeft = 40 + (index % 4) * 15; // Horizontal variation: 40%, 55%, 70%, 85%
                const baseTop = 20 + (index * 5); // Vertical staggering
                const animationDelay = index * 120; // Stagger animation timing
                
                // Subtle color variations for visual hierarchy
                const colorVariants = [
                    '#6366f1', // Indigo
                    '#8b5cf6', // Purple
                    '#06b6d4', // Cyan
                    '#10b981'  // Emerald
                ];
                const dotColor = colorVariants[index % colorVariants.length];
                
                return (
                    <div
                        key={edge.id}
                        style={{
                            position: 'absolute',
                            left: `${baseLeft}%`,
                            top: `${baseTop}%`,
                            transform: 'translate(-50%, -50%)',
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 250, 250, 0.95) 100%)',
                            border: '1px solid rgba(0, 0, 0, 0.06)',
                            borderRadius: '12px',
                            padding: '10px 14px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#2d2d2d',
                            maxWidth: '260px',
                            minWidth: '100px',
                            wordWrap: 'break-word',
                            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.08)',
                            zIndex: 10000,
                            lineHeight: '1.4',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'default',
                            userSelect: 'none',
                            animation: `fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${animationDelay}ms both`
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.02)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                            e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.08)';
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '6px'
                        }}>
                            <div style={{
                                flex: 1,
                                fontSize: '13px',
                                lineHeight: '1.4'
                            }}>
                                {parsedText.length > 180 ? `${parsedText.substring(0, 180)}...` : parsedText}
                            </div>
                        </div>
                    </div>
                );
            })}
            </div>
        </>
    );
};