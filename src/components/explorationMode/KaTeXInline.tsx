/**
 * KaTeXInline — renders a LaTeX string as inline HTML (not SVG).
 *
 * Used in the parameter panel for probability-mode notation.
 * Falls back to plain text if KaTeX parsing fails.
 */

import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface KaTeXInlineProps {
  latex: string;
  className?: string;
}

export function KaTeXInline({ latex, className }: KaTeXInlineProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: false,
        output: 'html',
      });
    } catch {
      return null;
    }
  }, [latex]);

  if (!html) {
    return <span className={className}>{latex}</span>;
  }

  return (
    <span
      className={`katex-inline ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
