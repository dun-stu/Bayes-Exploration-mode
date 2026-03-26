/**
 * Unit tests for the computation pipeline (computeRegionA).
 *
 * Covers:
 *   - Mammography reference scenario (spec fixture)
 *   - Additional scenario profiles at varied parameter ranges
 *   - Edge cases: degenerate parameters, zero-from-rounding, extreme values
 *   - Partition constraint verification on every test case
 */

import { describe, it, expect } from 'vitest';
import { computeRegionA, type ComputationInputs } from './computeRegionA';
import type { DataPackageRegionA } from '../types';

// ===== Helpers =====

/** Verify all partition constraints hold for a computed Region A. */
function assertPartitionConstraints(r: DataPackageRegionA) {
  // Constraint 1: N_D + N_¬D = N
  expect(r.nD + r.nNotD).toBe(r.n);

  // Constraint 2: N_TP + N_FN = N_D
  expect(r.nTP + r.nFN).toBe(r.nD);

  // Constraint 3: N_FP + N_TN = N_¬D
  expect(r.nFP + r.nTN).toBe(r.nNotD);

  // Constraint 4: N_T+ = N_TP + N_FP
  expect(r.nTestPos).toBe(r.nTP + r.nFP);

  // Constraint 5: N_T- = N_FN + N_TN
  expect(r.nTestNeg).toBe(r.nFN + r.nTN);

  // Constraint 6: N_T+ + N_T- = N
  expect(r.nTestPos + r.nTestNeg).toBe(r.n);

  // Constraint 7: All counts >= 0
  expect(r.nD).toBeGreaterThanOrEqual(0);
  expect(r.nNotD).toBeGreaterThanOrEqual(0);
  expect(r.nTP).toBeGreaterThanOrEqual(0);
  expect(r.nFN).toBeGreaterThanOrEqual(0);
  expect(r.nFP).toBeGreaterThanOrEqual(0);
  expect(r.nTN).toBeGreaterThanOrEqual(0);
  expect(r.nTestPos).toBeGreaterThanOrEqual(0);
  expect(r.nTestNeg).toBeGreaterThanOrEqual(0);

  // Constraint 8: All counts are integers
  expect(Number.isInteger(r.nD)).toBe(true);
  expect(Number.isInteger(r.nNotD)).toBe(true);
  expect(Number.isInteger(r.nTP)).toBe(true);
  expect(Number.isInteger(r.nFN)).toBe(true);
  expect(Number.isInteger(r.nFP)).toBe(true);
  expect(Number.isInteger(r.nTN)).toBe(true);
  expect(Number.isInteger(r.nTestPos)).toBe(true);
  expect(Number.isInteger(r.nTestNeg)).toBe(true);
}

// ===== Tests =====

describe('computeRegionA', () => {
  describe('Mammography reference scenario', () => {
    // N=1000, base rate=1%, sensitivity=90%, FPR=9%
    // Expected from spec: N_D=10, N_¬D=990, N_TP=9, N_FN=1, N_FP=89, N_TN=901,
    // N_T+=98, N_T-=902, posterior≈0.0918
    const result = computeRegionA({
      n: 1000,
      baseRate: 0.01,
      sensitivity: 0.90,
      fpr: 0.09,
    });

    it('computes correct first-level partition', () => {
      expect(result.nD).toBe(10);
      expect(result.nNotD).toBe(990);
    });

    it('computes correct second-level partition', () => {
      expect(result.nTP).toBe(9);
      expect(result.nFN).toBe(1);
      expect(result.nFP).toBe(89);
      expect(result.nTN).toBe(901);
    });

    it('computes correct regrouped counts', () => {
      expect(result.nTestPos).toBe(98);
      expect(result.nTestNeg).toBe(902);
    });

    it('computes correct posterior from integer counts', () => {
      expect(result.posterior).toBeCloseTo(9 / 98, 10);
    });

    it('computes correct effective rates', () => {
      expect(result.effectiveSensitivity).toBeCloseTo(9 / 10, 10);
      expect(result.effectiveFPR).toBeCloseTo(89 / 990, 10);
      expect(result.effectiveSpecificity).toBeCloseTo(901 / 990, 10);
      expect(result.totalTestPositiveRate).toBeCloseTo(98 / 1000, 10);
    });

    it('computes correct joint probabilities', () => {
      expect(result.jointProbDAndTestPos).toBeCloseTo(9 / 1000, 10);
      expect(result.jointProbDAndTestNeg).toBeCloseTo(1 / 1000, 10);
      expect(result.jointProbNotDAndTestPos).toBeCloseTo(89 / 1000, 10);
      expect(result.jointProbNotDAndTestNeg).toBeCloseTo(901 / 1000, 10);
    });

    it('preserves raw input rates', () => {
      expect(result.inputBaseRate).toBe(0.01);
      expect(result.inputSensitivity).toBe(0.90);
      expect(result.inputFPR).toBe(0.09);
    });

    it('satisfies all partition constraints', () => {
      assertPartitionConstraints(result);
    });
  });

  describe('High base rate scenario', () => {
    // N=200, base rate=25%, sensitivity=90%, FPR=10%
    // N_D=50, N_¬D=150, N_TP=round(45)=45, N_FN=5, N_FP=round(15)=15, N_TN=135
    const result = computeRegionA({
      n: 200,
      baseRate: 0.25,
      sensitivity: 0.90,
      fpr: 0.10,
    });

    it('computes correct counts', () => {
      expect(result.nD).toBe(50);
      expect(result.nNotD).toBe(150);
      expect(result.nTP).toBe(45);
      expect(result.nFN).toBe(5);
      expect(result.nFP).toBe(15);
      expect(result.nTN).toBe(135);
      expect(result.nTestPos).toBe(60);
      expect(result.nTestNeg).toBe(140);
    });

    it('computes correct posterior', () => {
      expect(result.posterior).toBeCloseTo(45 / 60, 10);
    });

    it('satisfies all partition constraints', () => {
      assertPartitionConstraints(result);
    });
  });

  describe('Low base rate, high N scenario', () => {
    // N=1000, base rate=0.5%, sensitivity=95%, FPR=5%
    // N_D=5, N_¬D=995, N_TP=round(4.75)=5, N_FN=0, N_FP=round(49.75)=50, N_TN=945
    const result = computeRegionA({
      n: 1000,
      baseRate: 0.005,
      sensitivity: 0.95,
      fpr: 0.05,
    });

    it('computes correct counts', () => {
      expect(result.nD).toBe(5);
      expect(result.nNotD).toBe(995);
      expect(result.nTP).toBe(5);
      expect(result.nFN).toBe(0);
      expect(result.nFP).toBe(50);
      expect(result.nTN).toBe(945);
      expect(result.nTestPos).toBe(55);
    });

    it('computes correct posterior', () => {
      expect(result.posterior).toBeCloseTo(5 / 55, 10);
    });

    it('satisfies all partition constraints', () => {
      assertPartitionConstraints(result);
    });
  });

  describe('Moderate base rate, low N scenario', () => {
    // N=100, base rate=10%, sensitivity=85%, FPR=5%
    // N_D=10, N_¬D=90, N_TP=round(8.5)=9, N_FN=1, N_FP=round(4.5)=5, N_TN=85
    const result = computeRegionA({
      n: 100,
      baseRate: 0.10,
      sensitivity: 0.85,
      fpr: 0.05,
    });

    it('computes correct counts', () => {
      expect(result.nD).toBe(10);
      expect(result.nNotD).toBe(90);
      expect(result.nTP).toBe(9);
      expect(result.nFN).toBe(1);
      expect(result.nFP).toBe(5);
      expect(result.nTN).toBe(85);
      expect(result.nTestPos).toBe(14);
    });

    it('satisfies all partition constraints', () => {
      assertPartitionConstraints(result);
    });
  });

  describe('Edge cases', () => {
    it('handles N_T+ = 0 (sensitivity=0, FPR=0) — posterior is null', () => {
      const result = computeRegionA({
        n: 1000,
        baseRate: 0.01,
        sensitivity: 0,
        fpr: 0,
      });

      expect(result.nTP).toBe(0);
      expect(result.nFP).toBe(0);
      expect(result.nTestPos).toBe(0);
      expect(result.posterior).toBeNull();
      assertPartitionConstraints(result);
    });

    it('handles sensitivity=100% — no false negatives', () => {
      const result = computeRegionA({
        n: 1000,
        baseRate: 0.01,
        sensitivity: 1.0,
        fpr: 0.09,
      });

      expect(result.nTP).toBe(10);
      expect(result.nFN).toBe(0);
      assertPartitionConstraints(result);
    });

    it('handles FPR=100% — all condition-negative test positive', () => {
      const result = computeRegionA({
        n: 1000,
        baseRate: 0.01,
        sensitivity: 0.90,
        fpr: 1.0,
      });

      expect(result.nFP).toBe(990);
      expect(result.nTN).toBe(0);
      assertPartitionConstraints(result);
    });

    it('handles very small N_D (N=100, base rate=1%)', () => {
      const result = computeRegionA({
        n: 100,
        baseRate: 0.01,
        sensitivity: 0.90,
        fpr: 0.09,
      });

      expect(result.nD).toBe(1);
      expect(result.nNotD).toBe(99);
      // sensitivity 90% of 1 person rounds to 1
      expect(result.nTP).toBe(1);
      expect(result.nFN).toBe(0);
      assertPartitionConstraints(result);
    });

    it('handles zero-from-rounding (N_D=3, sensitivity=15%)', () => {
      // N=100, base rate=3% → N_D=3
      // 3 × 0.15 = 0.45, rounds to 0
      const result = computeRegionA({
        n: 100,
        baseRate: 0.03,
        sensitivity: 0.15,
        fpr: 0.05,
      });

      expect(result.nD).toBe(3);
      expect(result.nTP).toBe(0);
      expect(result.nFN).toBe(3);
      assertPartitionConstraints(result);
    });

    it('handles both sensitivity=100% and FPR=100% — everyone tests positive', () => {
      const result = computeRegionA({
        n: 1000,
        baseRate: 0.01,
        sensitivity: 1.0,
        fpr: 1.0,
      });

      expect(result.nTestPos).toBe(1000);
      expect(result.nTestNeg).toBe(0);
      // Posterior equals base rate
      expect(result.posterior).toBeCloseTo(10 / 1000, 10);
      assertPartitionConstraints(result);
    });

    it('handles N=100, base rate=99% — very large N_D', () => {
      const result = computeRegionA({
        n: 100,
        baseRate: 0.99,
        sensitivity: 0.90,
        fpr: 0.05,
      });

      expect(result.nD).toBe(99);
      expect(result.nNotD).toBe(1);
      assertPartitionConstraints(result);
    });
  });

  describe('Joint probability consistency', () => {
    it('joint probabilities sum to 1', () => {
      const result = computeRegionA({
        n: 1000,
        baseRate: 0.01,
        sensitivity: 0.90,
        fpr: 0.09,
      });

      const sum =
        result.jointProbDAndTestPos +
        result.jointProbDAndTestNeg +
        result.jointProbNotDAndTestPos +
        result.jointProbNotDAndTestNeg;

      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('posterior can be derived from joint probabilities', () => {
      const result = computeRegionA({
        n: 1000,
        baseRate: 0.01,
        sensitivity: 0.90,
        fpr: 0.09,
      });

      const posteriorFromJoints =
        result.jointProbDAndTestPos /
        (result.jointProbDAndTestPos + result.jointProbNotDAndTestPos);

      expect(result.posterior).toBeCloseTo(posteriorFromJoints, 10);
    });
  });
});
