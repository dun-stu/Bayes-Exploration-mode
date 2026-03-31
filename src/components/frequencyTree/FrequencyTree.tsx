/**
 * FrequencyTree component — renders a vertical frequency tree as SVG.
 *
 * Subtask 2.4: full static rendering. Nodes, branches, labels, cross-branch
 * combination bracket, construction states, both display modes.
 *
 * The tree has fixed topology (root → 2 first-level → 4 leaves). Only labels
 * and colours change with parameters. Layout scales proportionally with container.
 *
 * Layer 4 (pending): construction animation, combination animation, format-switching cross-fade.
 */

import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type {
  DataPackageRegionA,
  DataPackageRegionB,
  ByConditionLabels,
  ByTestResultLabels,
  TreeNodeLabels,
  TreeBranchLabels,
  CrossBranchCombinationLabels,
} from '../../types';
import { TreeConstructionState, TreeCombinationState, DisplayMode } from '../../types';
import { TREE_NODE_COLORS, COLORS } from '../../constants';
import { KaTeXLabel } from '../KaTeXLabel';
import {
  computeTreeLayout,
  isNodeVisible,
  isBranchVisible,
  type TreeLayout,
  type TreeNodeId,
  type NodeLayout,
  type BranchLayout,
} from './layout';

// ===== Props =====

interface FrequencyTreeProps {
  regionA: DataPackageRegionA;
  regionB: DataPackageRegionB;
  width: number;
  height: number;
  constructionState?: TreeConstructionState;
  combinationState?: TreeCombinationState;
  displayMode?: DisplayMode;
}

// ===== Node colour mapping =====

const NODE_COLOR_MAP: Record<TreeNodeId, string> = {
  root: TREE_NODE_COLORS.root,
  conditionPositive: TREE_NODE_COLORS.conditionPositive,
  conditionNegative: TREE_NODE_COLORS.conditionNegative,
  truePositive: TREE_NODE_COLORS.truePositive,
  falseNegative: TREE_NODE_COLORS.falseNegative,
  falsePositive: TREE_NODE_COLORS.falsePositive,
  trueNegative: TREE_NODE_COLORS.trueNegative,
};

/** Text colour for adequate contrast against each node's fill. */
function nodeTextColor(nodeId: TreeNodeId): string {
  // Dark fills (root grey, dark warm TP, dark cool TN, dark warm condPos, dark cool condNeg) → white text.
  // Light fills (light warm FN, light cool FP) → dark text.
  switch (nodeId) {
    case 'falseNegative':
    case 'falsePositive':
      return COLORS.text.primary;
    default:
      return '#FFFFFF';
  }
}

// ===== Detecting LaTeX strings =====

function isLatex(label: string): boolean {
  return label.includes('\\') || label.includes('^') || label.includes('_');
}

/** Renders KaTeX HTML inline (for use inside a foreignObject that's already open). */
function KaTeXInline({ latex, fontSize, color }: { latex: string; fontSize: number; color: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, { throwOnError: false, displayMode: false, output: 'html' });
    } catch {
      return latex;
    }
  }, [latex]);

  return (
    <span
      style={{ fontSize: `${fontSize}px`, color, lineHeight: 1.2, whiteSpace: 'nowrap' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ===== Domain label mapping for tree nodes =====

/**
 * Extract domain labels for root and first-level tree nodes from ByConditionLabels.
 * These appear ABOVE their respective nodes.
 *
 * Root gets the population name; first-level nodes get condition group names.
 */
function getNodeDomainLabels(byCondition: ByConditionLabels): Partial<Record<TreeNodeId, string>> {
  return {
    root: byCondition.population.domainLabel,
    conditionPositive: byCondition.conditionPositive.group.domainLabel,
    conditionNegative: byCondition.conditionNegative.group.domainLabel,
  };
}

/**
 * Extract test-outcome labels for leaf nodes from ByTestResultLabels.
 * These appear BELOW their respective leaf nodes.
 *
 * The first-level domain label already tells the user the condition group
 * ("Have the disease" / "Do not have the disease"), so the leaf label
 * just needs the test outcome to complete the 2×2 classification.
 *
 * TP and FP → test-positive domain label (e.g., "Are flagged", "Test positive")
 * FN and TN → test-negative domain label (e.g., "Reach the inbox", "Test negative")
 */
function getLeafTestOutcomeLabels(byTestResult: ByTestResultLabels): Partial<Record<TreeNodeId, string>> {
  const testPosLabel = byTestResult.testPositive.group.domainLabel;
  const testNegLabel = byTestResult.testNegative.group.domainLabel;
  return {
    truePositive: testPosLabel,
    falseNegative: testNegLabel,
    falsePositive: testPosLabel,
    trueNegative: testNegLabel,
  };
}

// ===== Component =====

export function FrequencyTree({
  regionA,
  regionB,
  width,
  height,
  constructionState = TreeConstructionState.FullyBranched,
  combinationState = TreeCombinationState.CombinationHidden,
  displayMode = DisplayMode.Frequency,
}: FrequencyTreeProps) {
  const layout: TreeLayout = useMemo(
    () => computeTreeLayout(width, height),
    [width, height],
  );

  // Select the active label sets based on display mode.
  const modeLabels = displayMode === DisplayMode.Frequency
    ? regionB.frequency
    : regionB.probability;

  const nodeLabels: TreeNodeLabels = modeLabels.treeNodes;
  const branchLabels: TreeBranchLabels = modeLabels.treeBranches;
  const combinationLabels: CrossBranchCombinationLabels = modeLabels.crossBranchCombination;

  // Domain labels above nodes come from the by-condition grouping (same in both display modes).
  const domainLabels = useMemo(
    () => getNodeDomainLabels(modeLabels.byCondition),
    [modeLabels.byCondition],
  );

  // Leaf labels below nodes come from the by-test-result grouping (test outcome names).
  const leafLabels = useMemo(
    () => getLeafTestOutcomeLabels(modeLabels.byTestResult),
    [modeLabels.byTestResult],
  );

  const showCombination =
    combinationState === TreeCombinationState.CombinationShown &&
    constructionState === TreeConstructionState.FullyBranched;

  // Font size for domain labels above nodes — slightly smaller than node labels.
  const domainFontSize = layout.branchFontSize * 0.9;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Frequency tree showing population of ${regionA.n}`}
    >
      {/* Branches (rendered behind nodes) */}
      {layout.branches.map((branch) => {
        if (!isBranchVisible(branch.id, constructionState)) return null;
        return (
          <TreeBranch
            key={branch.id}
            branch={branch}
            label={branchLabels[branch.id]}
            fontSize={layout.branchFontSize}
            scale={layout.scale}
            isLatexMode={displayMode === DisplayMode.Probability}
          />
        );
      })}

      {/* Nodes with domain labels above (root + first-level) and leaf labels below */}
      {Array.from(layout.nodes.entries()).map(([nodeId, node]) => {
        if (!isNodeVisible(nodeId, constructionState)) return null;
        const domainLabel = domainLabels[nodeId];
        const leafLabel = leafLabels[nodeId];
        return (
          <g key={nodeId}>
            {/* Domain label above node (root + first-level nodes only) */}
            {domainLabel && (
              <text
                x={node.cx}
                y={node.cy - node.height / 2 - domainFontSize * 0.4}
                textAnchor="middle"
                dominantBaseline="auto"
                fontSize={domainFontSize}
                fontWeight={500}
                fontFamily="system-ui, sans-serif"
                fill={COLORS.text.secondary}
              >
                {domainLabel}
              </text>
            )}

            {/* Node rectangle + value label */}
            <TreeNode
              node={node}
              nodeId={nodeId}
              label={nodeLabels[nodeId]}
              fontSize={layout.nodeFontSize}
              radius={layout.nodeRadius}
              isLatexMode={displayMode === DisplayMode.Probability}
            />

            {/* Test-outcome label below leaf nodes */}
            {leafLabel && (
              <text
                x={node.cx}
                y={node.cy + node.height / 2 + domainFontSize * 1.1}
                textAnchor="middle"
                dominantBaseline="auto"
                fontSize={domainFontSize}
                fontWeight={500}
                fontFamily="system-ui, sans-serif"
                fill={COLORS.text.secondary}
              >
                {leafLabel}
              </text>
            )}
          </g>
        );
      })}

      {/* Cross-branch combination bracket */}
      {showCombination && (
        <CombinationBracket
          layout={layout}
          combinationLabels={combinationLabels}
          isLatexMode={displayMode === DisplayMode.Probability}
        />
      )}
    </svg>
  );
}

// ===== TreeNode sub-component =====

interface TreeNodeProps {
  node: NodeLayout;
  nodeId: TreeNodeId;
  label: string;
  fontSize: number;
  radius: number;
  isLatexMode: boolean;
}

function TreeNode({ node, nodeId, label, fontSize, radius, isLatexMode }: TreeNodeProps) {
  const x = node.cx - node.width / 2;
  const y = node.cy - node.height / 2;
  const fill = NODE_COLOR_MAP[nodeId];
  const textColor = nodeTextColor(nodeId);
  const useKatex = isLatexMode && isLatex(label);

  return (
    <g className={`tree-node tree-node-${nodeId}`}>
      {/* Node background */}
      <rect
        x={x}
        y={y}
        width={node.width}
        height={node.height}
        rx={radius}
        ry={radius}
        fill={fill}
        stroke={fill === TREE_NODE_COLORS.root ? '#757575' : fill}
        strokeWidth={1}
      />
      {/* Node label */}
      {useKatex ? (
        <foreignObject x={x} y={y} width={node.width} height={node.height}>
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <KaTeXInline latex={label} fontSize={fontSize * 0.72} color={textColor} />
          </div>
        </foreignObject>
      ) : (
        <text
          x={node.cx}
          y={node.cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight={600}
          fontFamily="system-ui, sans-serif"
          fill={textColor}
        >
          {label}
        </text>
      )}
    </g>
  );
}

// ===== TreeBranch sub-component =====

interface TreeBranchProps {
  branch: BranchLayout;
  label: string;
  fontSize: number;
  scale: number;
  isLatexMode: boolean;
}

function TreeBranch({ branch, label, fontSize, scale, isLatexMode }: TreeBranchProps) {
  const useKatex = isLatexMode && isLatex(label);
  const textAnchor = branch.labelSide === 'left' ? 'end' : 'start';

  return (
    <g className={`tree-branch tree-branch-${branch.id}`}>
      {/* Branch line */}
      <line
        x1={branch.x1}
        y1={branch.y1}
        x2={branch.x2}
        y2={branch.y2}
        stroke={COLORS.branch}
        strokeWidth={Math.max(1, 1.5 * scale)}
        strokeLinecap="round"
      />
      {/* Branch label */}
      {useKatex ? (
        <KaTeXLabel
          latex={label}
          x={branch.labelSide === 'left'
            ? branch.labelX - 160 * scale
            : branch.labelX}
          y={branch.labelY - fontSize * 0.7}
          width={160 * scale}
          height={fontSize * 2}
          fontSize={fontSize * 0.9}
          color={COLORS.text.secondary}
        />
      ) : (
        <text
          x={branch.labelX}
          y={branch.labelY}
          textAnchor={textAnchor}
          dominantBaseline="central"
          fontSize={fontSize}
          fontFamily="system-ui, sans-serif"
          fill={COLORS.text.secondary}
        >
          {label}
        </text>
      )}
    </g>
  );
}

// ===== CombinationBracket sub-component =====

interface CombinationBracketProps {
  layout: TreeLayout;
  combinationLabels: CrossBranchCombinationLabels;
  isLatexMode: boolean;
}

function CombinationBracket({ layout, combinationLabels, isLatexMode }: CombinationBracketProps) {
  const { bracket, bracketFontSize, scale } = layout;
  const armHeight = bracket.bottomY - bracket.topY;

  // Draw the bracket as a path: left arm down, horizontal across, right arm up.
  const bracketPath = [
    `M ${bracket.leftX} ${bracket.topY}`,
    `L ${bracket.leftX} ${bracket.bottomY}`,
    `L ${bracket.rightX} ${bracket.bottomY}`,
    `L ${bracket.rightX} ${bracket.topY}`,
  ].join(' ');

  // Small tick marks at the top of each arm for visual crispness.
  const tickSize = Math.max(3, 4 * scale);

  const useKatexSum = isLatexMode && isLatex(combinationLabels.sumLabel);
  const useKatexPosterior = isLatexMode && isLatex(combinationLabels.posteriorLabel);

  // Label width for KaTeX foreignObjects — generous to avoid clipping.
  const katexWidth = Math.max(300, (bracket.rightX - bracket.leftX) * 1.2);

  return (
    <g className="combination-bracket">
      {/* Bracket shape */}
      <path
        d={bracketPath}
        fill="none"
        stroke={COLORS.text.secondary}
        strokeWidth={Math.max(1, 1.5 * scale)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Small horizontal ticks at top of arms */}
      <line
        x1={bracket.leftX - tickSize}
        y1={bracket.topY}
        x2={bracket.leftX + tickSize}
        y2={bracket.topY}
        stroke={COLORS.text.secondary}
        strokeWidth={Math.max(1, 1.5 * scale)}
      />
      <line
        x1={bracket.rightX - tickSize}
        y1={bracket.topY}
        x2={bracket.rightX + tickSize}
        y2={bracket.topY}
        stroke={COLORS.text.secondary}
        strokeWidth={Math.max(1, 1.5 * scale)}
      />

      {/* Sum label */}
      {useKatexSum ? (
        <KaTeXLabel
          latex={combinationLabels.sumLabel}
          x={bracket.labelX - katexWidth / 2}
          y={bracket.sumLabelY - bracketFontSize * 0.3}
          width={katexWidth}
          height={bracketFontSize * 2.5}
          fontSize={bracketFontSize * 0.85}
          color={COLORS.text.primary}
        />
      ) : (
        <text
          x={bracket.labelX}
          y={bracket.sumLabelY}
          textAnchor="middle"
          dominantBaseline="hanging"
          fontSize={bracketFontSize}
          fontWeight={600}
          fontFamily="system-ui, sans-serif"
          fill={COLORS.text.primary}
        >
          {combinationLabels.sumLabel}
        </text>
      )}

      {/* Posterior label */}
      {useKatexPosterior ? (
        <KaTeXLabel
          latex={combinationLabels.posteriorLabel}
          x={bracket.labelX - katexWidth / 2}
          y={bracket.posteriorLabelY - bracketFontSize * 0.3}
          width={katexWidth}
          height={bracketFontSize * 2.5}
          fontSize={bracketFontSize * 0.85}
          color={COLORS.text.primary}
        />
      ) : (
        <text
          x={bracket.labelX}
          y={bracket.posteriorLabelY}
          textAnchor="middle"
          dominantBaseline="hanging"
          fontSize={bracketFontSize}
          fontWeight={600}
          fontFamily="system-ui, sans-serif"
          fill={COLORS.text.primary}
        >
          {combinationLabels.posteriorLabel}
        </text>
      )}
    </g>
  );
}
