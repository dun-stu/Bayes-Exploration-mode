/**
 * KaTeXLabel — renders a LaTeX string inside an SVG foreignObject.
 *
 * This component enables mathematical notation (e.g. P(T^+ | D) = 0.90) in SVG contexts.
 * The template system (subtask 1.2) will produce LaTeX strings for probability-mode labels;
 * this component renders them.
 *
 * Approach: foreignObject wrapping KaTeX HTML output. This works in all modern browsers
 * and avoids the complexity of converting KaTeX output to SVG paths. The foreignObject
 * creates an embedded HTML rendering context within SVG, where KaTeX renders normally.
 */

import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface KaTeXLabelProps {
  /** LaTeX expression to render (e.g. "P(T^+ | D) = 0.90"). */
  latex: string;
  /** X position within the SVG. */
  x: number;
  /** Y position within the SVG. */
  y: number;
  /** Width of the foreignObject container. */
  width?: number;
  /** Height of the foreignObject container. */
  height?: number;
  /** Font size in pixels. */
  fontSize?: number;
  /** CSS color for the rendered text. */
  color?: string;
  /** Additional CSS class name. */
  className?: string;
  /** Text alignment within the foreignObject (default: 'left'). */
  textAlign?: 'left' | 'right' | 'center';
}

export function KaTeXLabel({
  latex,
  x,
  y,
  width = 200,
  height = 40,
  fontSize = 14,
  color = '#212121',
  className,
  textAlign = 'left',
}: KaTeXLabelProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: false,
        output: 'html',
      });
    } catch {
      return latex;
    }
  }, [latex]);

  return (
    <foreignObject x={x} y={y} width={width} height={height} className={className}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{ fontSize: `${fontSize}px`, color, lineHeight: 1.2, textAlign }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </foreignObject>
  );
}
