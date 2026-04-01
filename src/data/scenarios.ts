/**
 * Scenario Library — Six fully specified scenarios for the Bayesian reasoning tool.
 *
 * Each scenario conforms to the ScenarioDefinition interface and provides:
 * - Numerical parameters (base rate, sensitivity, FPR, author-chosen N)
 * - Domain vocabulary (plural and singular forms for template substitution)
 * - Metadata (id, name, domain, description)
 *
 * The scenarios span medical, technology, manufacturing, and workplace domains
 * with parameter profiles covering the pedagogically significant regions of the
 * base-rate × test-quality space.
 */

import type { ScenarioDefinition } from '../types';

// ===== Scenario 1: Mammography Screening =====
// Profile A — Low base rate + moderate test → shockingly low PPV (~9.2%)
// The canonical Bayesian reasoning benchmark (Gigerenzer & Hoffrage, 1995).

export const MAMMOGRAPHY: ScenarioDefinition = {
  // Numerical parameters
  baseRate: 0.01,
  sensitivity: 0.90,
  fpr: 0.09,
  specificity: 0.91,
  n: 1000,

  // Domain vocabulary — plural
  populationName: 'people',
  conditionName: 'have the disease',
  conditionNegativeName: 'do not have the disease',
  testName: 'the mammogram',
  testPositiveName: 'test positive',
  testNegativeName: 'test negative',

  // Domain vocabulary — singular/grammatical
  populationSingular: 'a person',
  conditionNameSingular: 'has the disease',
  testPositiveNameSingular: 'tests positive',
  relativePronoun: 'who',
  testAction: 'are tested',
  baseRateDomainName: 'prevalence of the disease',

  // Metadata
  id: 'mammography',
  name: 'Mammography Screening',
  domain: 'medical',
  description: 'Breast cancer screening — the most studied Bayesian reasoning problem',
};

// ===== Scenario 2: Rapid COVID Antigen Test =====
// Profile C — Moderate base rate + mediocre sensitivity → many missed cases (PPV ~64%)
// Shifts lesson from false positives to false negatives.

export const COVID_ANTIGEN: ScenarioDefinition = {
  baseRate: 0.10,
  sensitivity: 0.80,
  fpr: 0.05,
  specificity: 0.95,
  n: 200,

  populationName: 'symptomatic patients',
  conditionName: 'have COVID',
  conditionNegativeName: 'do not have COVID',
  testName: 'the rapid antigen test',
  testPositiveName: 'test positive',
  testNegativeName: 'test negative',

  populationSingular: 'a symptomatic patient',
  conditionNameSingular: 'has COVID',
  testPositiveNameSingular: 'tests positive',
  relativePronoun: 'who',
  testAction: 'are tested',
  baseRateDomainName: 'COVID prevalence among symptomatic patients',

  id: 'covid_antigen',
  name: 'Rapid COVID Antigen Test',
  domain: 'medical',
  description: 'Rapid testing of symptomatic patients — illustrating the missed-cases problem',
};

// ===== Scenario 3: Blood Donation Screening =====
// Profile B — Very low base rate + excellent test → still surprisingly low PPV (~33.3%)
// Isolates the base-rate effect from test quality. N_FN = 0 is deliberate.

export const BLOOD_DONATION: ScenarioDefinition = {
  baseRate: 0.005,
  sensitivity: 0.99,
  fpr: 0.01,
  specificity: 0.99,
  n: 1000,

  populationName: 'blood donations',
  conditionName: 'carry the virus',
  conditionNegativeName: 'do not carry the virus',
  testName: 'the screening test',
  testPositiveName: 'are flagged',
  testNegativeName: 'are cleared',

  populationSingular: 'a blood donation',
  conditionNameSingular: 'carries the virus',
  testPositiveNameSingular: 'is flagged',
  relativePronoun: 'that',
  testAction: 'are screened',
  baseRateDomainName: 'virus prevalence among donations',

  id: 'blood_donation',
  name: 'Blood Donation Screening',
  domain: 'medical',
  description: 'Screening blood donations for infectious diseases — even a 99% accurate test produces many false alarms at very low prevalence',
};

// ===== Scenario 4: Email Spam Filter =====
// Profile E — Higher base rate + good test → PPV is high (~75%)
// First non-medical scenario. "Base rate rescues test performance."

export const SPAM_FILTER: ScenarioDefinition = {
  baseRate: 0.25,
  sensitivity: 0.90,
  fpr: 0.10,
  n: 200,

  populationName: 'emails',
  conditionName: 'are spam',
  conditionNegativeName: 'are not spam',
  testName: 'the spam filter',
  testPositiveName: 'are flagged',
  testNegativeName: 'reach the inbox',
  sensitivityDomainName: 'Detection rate',
  conditionSymbol: 'S',
  testSymbol: 'F',

  populationSingular: 'an email',
  conditionNameSingular: 'is spam',
  testPositiveNameSingular: 'is flagged',
  relativePronoun: 'that',
  testAction: 'arrive',
  baseRateDomainName: 'spam rate',

  id: 'spam_filter',
  name: 'Email Spam Filter',
  domain: 'technology',
  description: 'Spam detection — when the base rate is high, a decent filter mostly gets it right',
};

// ===== Scenario 5: Factory Quality Inspection =====
// Profile D — Low base rate + decent test → about half of flagged items are actually fine (PPV ~48.6%)
// The "coin flip" scenario: N_TP ≈ N_FP makes the ~50% PPV geometrically self-evident.

export const FACTORY_INSPECTION: ScenarioDefinition = {
  baseRate: 0.05,
  sensitivity: 0.90,
  fpr: 0.05,
  n: 400,

  populationName: 'items',
  conditionName: 'are defective',
  conditionNegativeName: 'are not defective',
  testName: 'the inspection',
  testPositiveName: 'are flagged',
  testNegativeName: 'pass inspection',
  sensitivityDomainName: 'Detection rate',
  fprDomainName: 'False rejection rate',
  testSymbol: 'I',

  populationSingular: 'an item',
  conditionNameSingular: 'is defective',
  testPositiveNameSingular: 'is flagged',
  relativePronoun: 'that',
  testAction: 'are inspected',
  baseRateDomainName: 'defect rate',

  id: 'factory_inspection',
  name: 'Factory Quality Inspection',
  domain: 'manufacturing',
  description: 'Quality inspection — when defects are rare, about half of flagged items are actually fine',
};

// ===== Scenario 6: Workplace Drug Screening =====
// Profile D variant — Low-moderate base rate + good test → FPs with social consequences (PPV ~67.9%)
// Adds the decision-cost dimension: false positives accuse people, not products.

export const DRUG_SCREENING: ScenarioDefinition = {
  baseRate: 0.10,
  sensitivity: 0.95,
  fpr: 0.05,
  n: 200,

  populationName: 'employees',
  conditionName: 'use drugs',
  conditionNegativeName: 'do not use drugs',
  testName: 'the screening test',
  testPositiveName: 'test positive',
  testNegativeName: 'test negative',

  populationSingular: 'an employee',
  conditionNameSingular: 'uses drugs',
  testPositiveNameSingular: 'tests positive',
  relativePronoun: 'who',
  testAction: 'are tested',
  baseRateDomainName: 'drug use rate',

  id: 'drug_screening',
  name: 'Workplace Drug Screening',
  domain: 'workplace',
  description: 'Routine workplace drug testing — about 1 in 3 positive results is a false accusation',
};

// ===== Collection =====

/** All scenarios in library order (by parameter profile: A, C, B, E, D, D-variant). */
export const SCENARIOS: ScenarioDefinition[] = [
  MAMMOGRAPHY,
  COVID_ANTIGEN,
  BLOOD_DONATION,
  SPAM_FILTER,
  FACTORY_INSPECTION,
  DRUG_SCREENING,
];

/** Scenario lookup by id. */
const SCENARIO_MAP: Record<string, ScenarioDefinition> = Object.fromEntries(
  SCENARIOS.map((s) => [s.id, s])
);

/** Get a scenario by its unique id. Returns undefined if not found. */
export function getScenarioById(id: string): ScenarioDefinition | undefined {
  return SCENARIO_MAP[id];
}
