/**
 * MainArea — Visualisation container (Group 3 controls + vis).
 *
 * Contains the format selector (icon array ↔ frequency tree) at the top,
 * and the visualisation container below. For subtask 3.1, the visualisation
 * area is a placeholder — components will be placed here in subtask 3.2.
 */

type VisFormat = 'iconArray' | 'frequencyTree';

interface MainAreaProps {
  activeFormat: VisFormat;
  onFormatChange: (format: VisFormat) => void;
}

export function MainArea({ activeFormat, onFormatChange }: MainAreaProps) {
  return (
    <div className="main-area">
      {/* Toolbar with format selector */}
      <div className="main-area__toolbar">
        <div className="format-selector">
          <button
            className={activeFormat === 'iconArray' ? 'active' : ''}
            onClick={() => onFormatChange('iconArray')}
          >
            Icon Array
          </button>
          <button
            className={activeFormat === 'frequencyTree' ? 'active' : ''}
            onClick={() => onFormatChange('frequencyTree')}
          >
            Frequency Tree
          </button>
        </div>
      </div>

      {/* Visualisation container — placeholder until subtask 3.2 */}
      <div className="main-area__vis-container">
        <div className="main-area__placeholder">
          <div className="main-area__placeholder-icon">
            {activeFormat === 'iconArray' ? '\u25A6' : '\u2442'}
          </div>
          <div>
            {activeFormat === 'iconArray'
              ? 'Icon Array — will be rendered here'
              : 'Frequency Tree — will be rendered here'
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export type { VisFormat };
