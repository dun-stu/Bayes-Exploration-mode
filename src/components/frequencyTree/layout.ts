/**
 * Frequency Tree layout engine — positions nodes, branches, and the combination
 * bracket within a container using fixed relative positioning.
 *
 * The tree has a fixed topology (root → 2 first-level → 4 leaves), so the layout
 * is simpler than the icon array's: nodes sit at fixed proportional positions within
 * the container, scaling uniformly with container size. Only labels and colours change
 * with parameters.
 */

// ===== Node identifiers =====

export type TreeNodeId =
  | 'root'
  | 'conditionPositive'
  | 'conditionNegative'
  | 'truePositive'
  | 'falseNegative'
  | 'falsePositive'
  | 'trueNegative';

// ===== Branch identifiers =====

export type TreeBranchId =
  | 'baseRatePositive'
  | 'baseRateNegative'
  | 'sensitivity'
  | 'falseNegativeRate'
  | 'falsePositiveRate'
  | 'trueNegativeRate';

// ===== Layout result types =====

export interface NodeLayout {
  id: TreeNodeId;
  cx: number;  // Centre x
  cy: number;  // Centre y
  width: number;
  height: number;
}

export interface BranchLayout {
  id: TreeBranchId;
  x1: number;  // Parent attachment point
  y1: number;
  x2: number;  // Child attachment point
  y2: number;
  labelX: number;
  labelY: number;
  /** Which side of the branch the label sits on — affects text-anchor. */
  labelSide: 'left' | 'right';
}

export interface BracketLayout {
  /** Left node (TP) bottom-centre x */
  leftX: number;
  /** Right node (FP) bottom-centre x */
  rightX: number;
  /** Y coordinate of the bracket top (just below leaf nodes) */
  topY: number;
  /** Y coordinate of the bracket bottom (where labels sit) */
  bottomY: number;
  /** Centre x for labels below the bracket */
  labelX: number;
  /** Y for the sum label */
  sumLabelY: number;
  /** Y for the posterior label */
  posteriorLabelY: number;
}

export interface TreeLayout {
  nodes: Map<TreeNodeId, NodeLayout>;
  branches: BranchLayout[];
  bracket: BracketLayout;
  /** Scaling factor relative to a 1000×700 reference. */
  scale: number;
  /** Font size for node labels. */
  nodeFontSize: number;
  /** Font size for branch labels. */
  branchFontSize: number;
  /** Font size for bracket/combination labels. */
  bracketFontSize: number;
  /** Node corner radius. */
  nodeRadius: number;
}

// ===== Layout constants (reference design at 1000×700) =====

/** Horizontal positions of nodes as fraction of container width. */
const NODE_X: Record<TreeNodeId, number> = {
  root: 0.5,
  conditionPositive: 0.28,
  conditionNegative: 0.72,
  truePositive: 0.13,
  falseNegative: 0.33,
  falsePositive: 0.67,
  trueNegative: 0.87,
};

/** Vertical positions of node levels as fraction of container height. */
const LEVEL_Y = {
  root: 0.08,
  firstLevel: 0.34,
  leafLevel: 0.60,
};

/** Reference node dimensions (width, height) at scale=1.
 * Sized to accommodate the longer probability-mode labels
 * (e.g. "P(D ∩ T⁺) = 0.009") without clipping. */
const REF_NODE_WIDTH = 150;
const REF_NODE_HEIGHT = 44;

/** Reference font sizes at scale=1. */
const REF_NODE_FONT = 14;
const REF_BRANCH_FONT = 12;
const REF_BRACKET_FONT = 12.5;

/** Reference corner radius at scale=1. */
const REF_NODE_RADIUS = 6;

/** Vertical gap between leaf node bottom and bracket top.
 * Sized to accommodate test-outcome labels below leaf nodes. */
const BRACKET_GAP_FRACTION = 0.065;

/** Bracket arm height as fraction of container height. */
const BRACKET_ARM_FRACTION = 0.04;

/** Gap between bracket bottom and first label. */
const BRACKET_LABEL_GAP_FRACTION = 0.025;

/** Gap between sum and posterior labels. */
const BRACKET_LABEL_SPACING_FRACTION = 0.035;

/** Minimum scale below which the tree is hard to read. */
const MIN_SCALE = 0.35;

// ===== Layout computation =====

/**
 * Compute the tree layout for a given container size.
 *
 * The layout uses proportional positioning: all positions and sizes scale
 * linearly with the container's limiting dimension. The reference design
 * targets a 1000×700 container.
 */
export function computeTreeLayout(containerWidth: number, containerHeight: number): TreeLayout {
  // Scale from reference dimensions (use the more constrained axis).
  const scaleX = containerWidth / 1000;
  const scaleY = containerHeight / 700;
  const scale = Math.max(MIN_SCALE, Math.min(scaleX, scaleY));

  const nodeW = REF_NODE_WIDTH * scale;
  const nodeH = REF_NODE_HEIGHT * scale;

  // Build node map.
  const nodes = new Map<TreeNodeId, NodeLayout>();
  const nodeIds: TreeNodeId[] = [
    'root',
    'conditionPositive', 'conditionNegative',
    'truePositive', 'falseNegative', 'falsePositive', 'trueNegative',
  ];

  for (const id of nodeIds) {
    const levelY = id === 'root'
      ? LEVEL_Y.root
      : (id === 'conditionPositive' || id === 'conditionNegative')
        ? LEVEL_Y.firstLevel
        : LEVEL_Y.leafLevel;

    nodes.set(id, {
      id,
      cx: containerWidth * NODE_X[id],
      cy: containerHeight * levelY,
      width: nodeW,
      height: nodeH,
    });
  }

  // Build branches.
  const branchDefs: Array<{ id: TreeBranchId; parent: TreeNodeId; child: TreeNodeId; side: 'left' | 'right' }> = [
    { id: 'baseRatePositive', parent: 'root', child: 'conditionPositive', side: 'left' },
    { id: 'baseRateNegative', parent: 'root', child: 'conditionNegative', side: 'right' },
    { id: 'sensitivity', parent: 'conditionPositive', child: 'truePositive', side: 'left' },
    { id: 'falseNegativeRate', parent: 'conditionPositive', child: 'falseNegative', side: 'right' },
    { id: 'falsePositiveRate', parent: 'conditionNegative', child: 'falsePositive', side: 'left' },
    { id: 'trueNegativeRate', parent: 'conditionNegative', child: 'trueNegative', side: 'right' },
  ];

  const branches: BranchLayout[] = branchDefs.map(({ id, parent, child, side }) => {
    const pNode = nodes.get(parent)!;
    const cNode = nodes.get(child)!;

    // Attach at bottom-centre of parent, top-centre of child.
    const x1 = pNode.cx;
    const y1 = pNode.cy + pNode.height / 2;
    const x2 = cNode.cx;
    const y2 = cNode.cy - cNode.height / 2;

    // Label at midpoint, offset perpendicular to the branch line.
    // Using perpendicular offset ensures left and right labels appear at
    // equal visual distance from their branch regardless of branch angle.
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const perpDist = 8 * scale; // perpendicular distance from branch line
    // Perpendicular unit vector (pointing left of the branch direction).
    const perpX = -dy / len;
    const perpY = dx / len;
    // Left-side labels go in the direction where perpX < 0 (left of downward branch),
    // right-side labels go the opposite direction.
    const sign = side === 'left' ? 1 : -1;
    const labelX = midX + sign * perpX * perpDist;
    const labelY = midY + sign * perpY * perpDist;

    return { id, x1, y1, x2, y2, labelX, labelY, labelSide: side };
  });

  // Build bracket layout (beneath TP and FP leaf nodes).
  const tpNode = nodes.get('truePositive')!;
  const fpNode = nodes.get('falsePositive')!;

  const bracketTopY = Math.max(tpNode.cy + tpNode.height / 2, fpNode.cy + fpNode.height / 2)
    + containerHeight * BRACKET_GAP_FRACTION;
  const bracketBottomY = bracketTopY + containerHeight * BRACKET_ARM_FRACTION;
  const bracketLabelX = (tpNode.cx + fpNode.cx) / 2;
  const sumLabelY = bracketBottomY + containerHeight * BRACKET_LABEL_GAP_FRACTION;
  const posteriorLabelY = sumLabelY + containerHeight * BRACKET_LABEL_SPACING_FRACTION;

  const bracket: BracketLayout = {
    leftX: tpNode.cx,
    rightX: fpNode.cx,
    topY: bracketTopY,
    bottomY: bracketBottomY,
    labelX: bracketLabelX,
    sumLabelY,
    posteriorLabelY,
  };

  return {
    nodes,
    branches,
    bracket,
    scale,
    nodeFontSize: Math.max(9, REF_NODE_FONT * scale),
    branchFontSize: Math.max(8, REF_BRANCH_FONT * scale),
    bracketFontSize: Math.max(8, REF_BRACKET_FONT * scale),
    nodeRadius: REF_NODE_RADIUS * scale,
  };
}

// ===== Visibility per construction state =====

import { TreeConstructionState } from '../../types';

const VISIBLE_NODES: Record<TreeConstructionState, Set<TreeNodeId>> = {
  [TreeConstructionState.RootOnly]: new Set(['root']),
  [TreeConstructionState.FirstBranch]: new Set([
    'root', 'conditionPositive', 'conditionNegative',
  ]),
  [TreeConstructionState.ConditionPositiveSecondBranch]: new Set([
    'root', 'conditionPositive', 'conditionNegative',
    'truePositive', 'falseNegative',
  ]),
  [TreeConstructionState.FullyBranched]: new Set([
    'root', 'conditionPositive', 'conditionNegative',
    'truePositive', 'falseNegative', 'falsePositive', 'trueNegative',
  ]),
};

const VISIBLE_BRANCHES: Record<TreeConstructionState, Set<TreeBranchId>> = {
  [TreeConstructionState.RootOnly]: new Set(),
  [TreeConstructionState.FirstBranch]: new Set([
    'baseRatePositive', 'baseRateNegative',
  ]),
  [TreeConstructionState.ConditionPositiveSecondBranch]: new Set([
    'baseRatePositive', 'baseRateNegative',
    'sensitivity', 'falseNegativeRate',
  ]),
  [TreeConstructionState.FullyBranched]: new Set([
    'baseRatePositive', 'baseRateNegative',
    'sensitivity', 'falseNegativeRate',
    'falsePositiveRate', 'trueNegativeRate',
  ]),
};

export function isNodeVisible(nodeId: TreeNodeId, state: TreeConstructionState): boolean {
  return VISIBLE_NODES[state].has(nodeId);
}

export function isBranchVisible(branchId: TreeBranchId, state: TreeConstructionState): boolean {
  return VISIBLE_BRANCHES[state].has(branchId);
}

/** Returns the set of visible node IDs for a construction state. */
export function getVisibleNodes(state: TreeConstructionState): Set<TreeNodeId> {
  return VISIBLE_NODES[state];
}

/** Returns the set of visible branch IDs for a construction state. */
export function getVisibleBranches(state: TreeConstructionState): Set<TreeBranchId> {
  return VISIBLE_BRANCHES[state];
}
