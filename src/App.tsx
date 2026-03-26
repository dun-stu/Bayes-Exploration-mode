import { AppStateProvider, useAppState } from './state';
import { COLORS, ICON_COLORS } from './constants';
import { KaTeXLabel } from './components/KaTeXLabel';
import { DisplayMode } from './types';

/**
 * Temporary demo component — verifies that the foundation layer works:
 * context provider, colour constants, types, and KaTeX rendering in SVG.
 * Will be replaced by the exploration mode layout in subtask 3.1.
 */
function FoundationDemo() {
  const { parameters, dispatch } = useAppState();

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2>Subtask 0.1 — Foundation Verification</h2>

      {/* State architecture test */}
      <section style={{ marginBottom: 24 }}>
        <h3>State Architecture</h3>
        <p>
          N = {parameters.n}, Base rate = {parameters.baseRate},
          Sensitivity = {parameters.sensitivity}, FPR = {parameters.fpr}
        </p>
        <p>Display mode: {parameters.displayMode}</p>
        <button onClick={() =>
          dispatch({
            type: 'SET_DISPLAY_MODE',
            mode: parameters.displayMode === DisplayMode.Frequency
              ? DisplayMode.Probability
              : DisplayMode.Frequency,
          })
        }>
          Toggle display mode
        </button>
      </section>

      {/* Colour scheme test */}
      <section style={{ marginBottom: 24 }}>
        <h3>Colour Scheme</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {Object.entries(ICON_COLORS).map(([group, colour]) => (
            <div key={group} style={{ textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 6,
                backgroundColor: colour, border: '1px solid #ccc',
              }} />
              <small>{group}</small>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 8, fontSize: 12, color: COLORS.text.secondary }}>
          Background: {COLORS.background} | Branch: {COLORS.branch}
        </p>
      </section>

      {/* KaTeX in SVG test */}
      <section>
        <h3>KaTeX in SVG</h3>
        <svg width={500} height={120} style={{ border: '1px solid #eee', background: '#fff' }}>
          <KaTeXLabel latex={String.raw`P(D \mid T^+) \approx 0.092`} x={10} y={10} width={300} height={40} />
          <KaTeXLabel latex={String.raw`P(T^+ \mid D) = 0.90`} x={10} y={50} width={300} height={40} />
          <KaTeXLabel latex={String.raw`\frac{N_{TP}}{N_{T^+}} = \frac{9}{98}`} x={10} y={80} width={300} height={40} />
        </svg>
      </section>
    </div>
  );
}

function App() {
  return (
    <AppStateProvider>
      <FoundationDemo />
    </AppStateProvider>
  );
}

export default App;
