import { describe, it, expect } from 'vitest';
import {
  MAMMOGRAPHY,
  COVID_ANTIGEN,
  BLOOD_DONATION,
  SPAM_FILTER,
  FACTORY_INSPECTION,
  DRUG_SCREENING,
  SCENARIOS,
  getScenarioById,
} from './scenarios';
import { computeRegionA } from '../computation/computeRegionA';
import type { ScenarioDefinition } from '../types';

// ===== Collection tests =====

describe('Scenario collection', () => {
  it('contains exactly 6 scenarios', () => {
    expect(SCENARIOS).toHaveLength(6);
  });

  it('has unique ids', () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(6);
  });

  it('has unique names', () => {
    const names = SCENARIOS.map((s) => s.name);
    expect(new Set(names).size).toBe(6);
  });

  it('getScenarioById returns correct scenario', () => {
    expect(getScenarioById('mammography')).toBe(MAMMOGRAPHY);
    expect(getScenarioById('covid_antigen')).toBe(COVID_ANTIGEN);
    expect(getScenarioById('blood_donation')).toBe(BLOOD_DONATION);
    expect(getScenarioById('spam_filter')).toBe(SPAM_FILTER);
    expect(getScenarioById('factory_inspection')).toBe(FACTORY_INSPECTION);
    expect(getScenarioById('drug_screening')).toBe(DRUG_SCREENING);
  });

  it('getScenarioById returns undefined for unknown id', () => {
    expect(getScenarioById('nonexistent')).toBeUndefined();
  });
});

// ===== Required fields validation =====

describe('Required fields', () => {
  const requiredStringFields: (keyof ScenarioDefinition)[] = [
    'populationName',
    'conditionName',
    'conditionNegativeName',
    'testName',
    'testPositiveName',
    'testNegativeName',
    'populationSingular',
    'conditionNameSingular',
    'testPositiveNameSingular',
    'relativePronoun',
    'testAction',
    'baseRateDomainName',
    'id',
    'name',
    'domain',
  ];

  for (const scenario of SCENARIOS) {
    describe(scenario.name, () => {
      for (const field of requiredStringFields) {
        it(`has non-empty ${field}`, () => {
          const value = scenario[field];
          expect(typeof value).toBe('string');
          expect((value as string).length).toBeGreaterThan(0);
        });
      }

      it('has valid numerical parameters', () => {
        expect(scenario.baseRate).toBeGreaterThan(0);
        expect(scenario.baseRate).toBeLessThan(1);
        expect(scenario.sensitivity).toBeGreaterThan(0);
        expect(scenario.sensitivity).toBeLessThanOrEqual(1);
        expect(scenario.fpr).toBeGreaterThan(0);
        expect(scenario.fpr).toBeLessThan(1);
        expect(scenario.n).toBeGreaterThan(0);
        expect(Number.isInteger(scenario.n)).toBe(true);
      });

      it('has consistent specificity/fpr if specificity provided', () => {
        if (scenario.specificity !== undefined) {
          expect(scenario.fpr).toBeCloseTo(1 - scenario.specificity, 10);
        }
      });
    });
  }
});

// ===== Integer verification via computeRegionA =====
// Test oracles from the Implementation Details doc's integer verification tables.

describe('Integer verification — computeRegionA produces expected counts', () => {
  it('Mammography (N=1000, BR=1%, sens=90%, FPR=9%)', () => {
    const result = computeRegionA({
      n: MAMMOGRAPHY.n,
      baseRate: MAMMOGRAPHY.baseRate,
      sensitivity: MAMMOGRAPHY.sensitivity,
      fpr: MAMMOGRAPHY.fpr,
    });
    expect(result.nD).toBe(10);
    expect(result.nNotD).toBe(990);
    expect(result.nTP).toBe(9);
    expect(result.nFN).toBe(1);
    expect(result.nFP).toBe(89);
    expect(result.nTN).toBe(901);
    expect(result.nTestPos).toBe(98);
    expect(result.posterior).toBeCloseTo(9 / 98, 6);
  });

  it('COVID Antigen (N=200, BR=10%, sens=80%, FPR=5%)', () => {
    const result = computeRegionA({
      n: COVID_ANTIGEN.n,
      baseRate: COVID_ANTIGEN.baseRate,
      sensitivity: COVID_ANTIGEN.sensitivity,
      fpr: COVID_ANTIGEN.fpr,
    });
    expect(result.nD).toBe(20);
    expect(result.nNotD).toBe(180);
    expect(result.nTP).toBe(16);
    expect(result.nFN).toBe(4);
    expect(result.nFP).toBe(9);
    expect(result.nTN).toBe(171);
    expect(result.nTestPos).toBe(25);
    expect(result.posterior).toBeCloseTo(16 / 25, 6);
  });

  it('Blood Donation (N=1000, BR=0.5%, sens=99%, FPR=1%) — N_FN=0 deliberate', () => {
    const result = computeRegionA({
      n: BLOOD_DONATION.n,
      baseRate: BLOOD_DONATION.baseRate,
      sensitivity: BLOOD_DONATION.sensitivity,
      fpr: BLOOD_DONATION.fpr,
    });
    expect(result.nD).toBe(5);
    expect(result.nNotD).toBe(995);
    expect(result.nTP).toBe(5);
    expect(result.nFN).toBe(0); // Deliberate empty cell
    expect(result.nFP).toBe(10);
    expect(result.nTN).toBe(985);
    expect(result.nTestPos).toBe(15);
    expect(result.posterior).toBeCloseTo(5 / 15, 6);
  });

  it('Spam Filter (N=200, BR=25%, sens=90%, FPR=10%) — perfectly clean', () => {
    const result = computeRegionA({
      n: SPAM_FILTER.n,
      baseRate: SPAM_FILTER.baseRate,
      sensitivity: SPAM_FILTER.sensitivity,
      fpr: SPAM_FILTER.fpr,
    });
    expect(result.nD).toBe(50);
    expect(result.nNotD).toBe(150);
    expect(result.nTP).toBe(45);
    expect(result.nFN).toBe(5);
    expect(result.nFP).toBe(15);
    expect(result.nTN).toBe(135);
    expect(result.nTestPos).toBe(60);
    expect(result.posterior).toBeCloseTo(45 / 60, 6);
  });

  it('Factory Inspection (N=400, BR=5%, sens=90%, FPR=5%) — perfectly clean', () => {
    const result = computeRegionA({
      n: FACTORY_INSPECTION.n,
      baseRate: FACTORY_INSPECTION.baseRate,
      sensitivity: FACTORY_INSPECTION.sensitivity,
      fpr: FACTORY_INSPECTION.fpr,
    });
    expect(result.nD).toBe(20);
    expect(result.nNotD).toBe(380);
    expect(result.nTP).toBe(18);
    expect(result.nFN).toBe(2);
    expect(result.nFP).toBe(19);
    expect(result.nTN).toBe(361);
    expect(result.nTestPos).toBe(37);
    expect(result.posterior).toBeCloseTo(18 / 37, 6);
  });

  it('Drug Screening (N=200, BR=10%, sens=95%, FPR=5%) — perfectly clean', () => {
    const result = computeRegionA({
      n: DRUG_SCREENING.n,
      baseRate: DRUG_SCREENING.baseRate,
      sensitivity: DRUG_SCREENING.sensitivity,
      fpr: DRUG_SCREENING.fpr,
    });
    expect(result.nD).toBe(20);
    expect(result.nNotD).toBe(180);
    expect(result.nTP).toBe(19);
    expect(result.nFN).toBe(1);
    expect(result.nFP).toBe(9);
    expect(result.nTN).toBe(171);
    expect(result.nTestPos).toBe(28);
    expect(result.posterior).toBeCloseTo(19 / 28, 6);
  });
});

// ===== Domain-specific field checks =====

describe('Domain-specific optional fields', () => {
  it('medical scenarios have specificity', () => {
    expect(MAMMOGRAPHY.specificity).toBe(0.91);
    expect(COVID_ANTIGEN.specificity).toBe(0.95);
    expect(BLOOD_DONATION.specificity).toBe(0.99);
  });

  it('non-medical scenarios omit specificity', () => {
    expect(SPAM_FILTER.specificity).toBeUndefined();
    expect(FACTORY_INSPECTION.specificity).toBeUndefined();
    expect(DRUG_SCREENING.specificity).toBeUndefined();
  });

  it('spam filter uses "Detection rate" for sensitivity label', () => {
    expect(SPAM_FILTER.sensitivityDomainName).toBe('Detection rate');
  });

  it('factory inspection uses custom domain names', () => {
    expect(FACTORY_INSPECTION.sensitivityDomainName).toBe('Detection rate');
    expect(FACTORY_INSPECTION.fprDomainName).toBe('False rejection rate');
  });

  it('scenarios without custom domain names leave them undefined', () => {
    expect(MAMMOGRAPHY.sensitivityDomainName).toBeUndefined();
    expect(MAMMOGRAPHY.fprDomainName).toBeUndefined();
    expect(COVID_ANTIGEN.sensitivityDomainName).toBeUndefined();
    expect(DRUG_SCREENING.sensitivityDomainName).toBeUndefined();
  });

  it('factory inspection uses "are flagged" vocabulary', () => {
    expect(FACTORY_INSPECTION.testPositiveName).toBe('are flagged');
    expect(FACTORY_INSPECTION.testPositiveNameSingular).toBe('is flagged');
  });

  it('spam filter uses S/F notation symbols', () => {
    expect(SPAM_FILTER.conditionSymbol).toBe('S');
    expect(SPAM_FILTER.testSymbol).toBe('F');
  });

  it('factory inspection uses I for test symbol', () => {
    expect(FACTORY_INSPECTION.testSymbol).toBe('I');
    expect(FACTORY_INSPECTION.conditionSymbol).toBeUndefined(); // defaults to D
  });

  it('medical scenarios have no notation symbol overrides', () => {
    expect(MAMMOGRAPHY.conditionSymbol).toBeUndefined();
    expect(MAMMOGRAPHY.testSymbol).toBeUndefined();
    expect(COVID_ANTIGEN.conditionSymbol).toBeUndefined();
    expect(COVID_ANTIGEN.testSymbol).toBeUndefined();
    expect(BLOOD_DONATION.conditionSymbol).toBeUndefined();
    expect(BLOOD_DONATION.testSymbol).toBeUndefined();
    expect(DRUG_SCREENING.conditionSymbol).toBeUndefined();
    expect(DRUG_SCREENING.testSymbol).toBeUndefined();
  });
});
