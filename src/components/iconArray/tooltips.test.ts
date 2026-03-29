/**
 * Tests for hover tooltip generation on icon array compound labels.
 *
 * Subtask 5.4a: vocabulary bridging — expanding structural abbreviations
 * (TP, FN, FP, TN) with domain-specific descriptions on hover.
 */

import { describe, it, expect } from 'vitest';
import { generateTooltipDescriptions, buildCompositionTooltip, type GroupTooltipDescriptions } from './IconArray';
import { MAMMOGRAPHY, SPAM_FILTER, FACTORY_INSPECTION } from '../../data/scenarios';

describe('generateTooltipDescriptions', () => {
  it('produces all four group descriptions for mammography', () => {
    const desc = generateTooltipDescriptions(MAMMOGRAPHY);
    expect(desc.TP).toBe('True Positive — have the disease and test positive');
    expect(desc.FN).toBe('False Negative — have the disease but test negative');
    expect(desc.FP).toBe('False Positive — do not have the disease but test positive');
    expect(desc.TN).toBe('True Negative — do not have the disease and test negative');
  });

  it('uses scenario-specific vocabulary for spam filter', () => {
    const desc = generateTooltipDescriptions(SPAM_FILTER);
    expect(desc.TP).toBe('True Positive — are spam and are flagged');
    expect(desc.FN).toBe('False Negative — are spam but reach the inbox');
    expect(desc.FP).toBe('False Positive — are not spam but are flagged');
    expect(desc.TN).toBe('True Negative — are not spam and reach the inbox');
  });

  it('uses scenario-specific vocabulary for factory inspection', () => {
    const desc = generateTooltipDescriptions(FACTORY_INSPECTION);
    expect(desc.TP).toContain('True Positive');
    expect(desc.FN).toContain('False Negative');
    expect(desc.FP).toContain('False Positive');
    expect(desc.TN).toContain('True Negative');
    // Factory uses "are defective" / "are not defective"
    expect(desc.TP).toContain('are defective');
    expect(desc.FP).toContain('are not defective');
  });

  it('uses default vocabulary when scenario is null', () => {
    const desc = generateTooltipDescriptions(null);
    expect(desc.TP).toBe('True Positive — have the condition and test positive');
    expect(desc.FN).toBe('False Negative — have the condition but test negative');
    expect(desc.FP).toBe('False Positive — do not have the condition but test positive');
    expect(desc.TN).toBe('True Negative — do not have the condition and test negative');
  });
});

describe('buildCompositionTooltip', () => {
  const mammoDesc = generateTooltipDescriptions(MAMMOGRAPHY);

  it('expands by-condition composition (TP + FN)', () => {
    const tooltip = buildCompositionTooltip('(TP: 9, FN: 1)', mammoDesc);
    expect(tooltip).toBe(
      'True Positive — have the disease and test positive: 9\n' +
      'False Negative — have the disease but test negative: 1',
    );
  });

  it('expands by-condition composition (FP + TN)', () => {
    const tooltip = buildCompositionTooltip('(FP: 89, TN: 901)', mammoDesc);
    expect(tooltip).toBe(
      'False Positive — do not have the disease but test positive: 89\n' +
      'True Negative — do not have the disease and test negative: 901',
    );
  });

  it('expands by-test-result composition (TP + FP)', () => {
    const tooltip = buildCompositionTooltip('(TP: 9, FP: 89)', mammoDesc);
    expect(tooltip).toBe(
      'True Positive — have the disease and test positive: 9\n' +
      'False Positive — do not have the disease but test positive: 89',
    );
  });

  it('expands by-test-result composition (FN + TN)', () => {
    const tooltip = buildCompositionTooltip('(FN: 1, TN: 901)', mammoDesc);
    expect(tooltip).toBe(
      'False Negative — have the disease but test negative: 1\n' +
      'True Negative — do not have the disease and test negative: 901',
    );
  });

  it('handles percentage values in probability mode', () => {
    const tooltip = buildCompositionTooltip('(TP: 0.9%, FN: 0.1%)', mammoDesc);
    expect(tooltip).toContain('True Positive — have the disease and test positive: 0.9%');
    expect(tooltip).toContain('False Negative — have the disease but test negative: 0.1%');
  });

  it('works without outer parentheses', () => {
    const tooltip = buildCompositionTooltip('TP: 9, FN: 1', mammoDesc);
    expect(tooltip).toContain('True Positive');
    expect(tooltip).toContain('False Negative');
  });

  it('uses spam scenario vocabulary', () => {
    const spamDesc = generateTooltipDescriptions(SPAM_FILTER);
    const tooltip = buildCompositionTooltip('(TP: 45, FP: 15)', spamDesc);
    expect(tooltip).toBe(
      'True Positive — are spam and are flagged: 45\n' +
      'False Positive — are not spam but are flagged: 15',
    );
  });
});
