/**
 * Scenario Definition — the schema that Part 5 populates.
 *
 * Each scenario contains numerical parameters, domain vocabulary for template substitution
 * (both plural and singular forms), and metadata. The domain vocabulary slots into the
 * parameterised text templates; sentence structure stays constant across scenarios.
 *
 * Generic fallback vocabulary is used when no scenario is loaded:
 *   populationName: "people", conditionName: "have the condition",
 *   testName: "the test", testPositiveName: "test positive", etc.
 */

export interface ScenarioDefinition {
  // ===== Numerical parameters =====

  /** Base rate / prevalence as decimal (e.g. 0.01 for 1%). */
  baseRate: number;
  /** Sensitivity / true positive rate as decimal. */
  sensitivity: number;
  /** False positive rate as decimal. Mutually exclusive with specificity. */
  fpr: number;
  /** Specificity as decimal. If provided, fpr = 1 - specificity. For medical scenarios. */
  specificity?: number;
  /** Author-chosen population size (integer). Deliberate design choice per scenario. */
  n: number;

  // ===== Domain vocabulary — plural-subject forms =====
  // Used in frequency problem statement, compound labels, and all template positions with plural subjects.

  /** e.g. "people", "emails", "items" */
  populationName: string;
  /** e.g. "have the disease", "are spam", "are defective" */
  conditionName: string;
  /** e.g. "do not have the disease", "are not spam", "are not defective" */
  conditionNegativeName: string;
  /** e.g. "the screening test", "the spam filter", "the inspection" */
  testName: string;
  /** e.g. "test positive", "are flagged", "are rejected" */
  testPositiveName: string;
  /** e.g. "test negative", "reach the inbox", "pass inspection" */
  testNegativeName: string;
  /** e.g. "Detection rate". Defaults to "Sensitivity" if not provided. */
  sensitivityDomainName?: string;
  /** e.g. "False rejection rate". Defaults to "False positive rate" if not provided. */
  fprDomainName?: string;

  // ===== Mathematical notation symbols =====
  // Used in probability-mode LaTeX notation. Defaults: D (condition), T (test).

  /** LaTeX symbol for the condition variable. Defaults to 'D'. E.g. 'S' for spam. */
  conditionSymbol?: string;
  /** LaTeX symbol for the test variable. Defaults to 'T'. E.g. 'F' for filter, 'I' for inspection. */
  testSymbol?: string;

  // ===== Domain vocabulary — singular-subject and grammatical forms =====
  // Used in templates where the subject is singular (e.g. probability-mode question).

  /** e.g. "a person", "an email", "an item" */
  populationSingular: string;
  /** e.g. "has the disease", "is spam", "is defective" — singular conjugation of conditionName */
  conditionNameSingular: string;
  /** e.g. "tests positive", "is flagged" — singular conjugation of testPositiveName */
  testPositiveNameSingular: string;
  /** "who" for human populations, "that" for non-human */
  relativePronoun: string;
  /** Verb phrase for frequency problem statement opening. e.g. "are tested", "arrive", "are inspected" */
  testAction: string;
  /** Domain-natural term for base rate in probability-mode text. e.g. "prevalence of the disease", "spam rate" */
  baseRateDomainName: string;

  // ===== Metadata =====

  /** Unique scenario identifier. */
  id: string;
  /** Display name, e.g. "Mammography Screening". */
  name: string;
  /** Category identifier: "medical", "technology", "manufacturing", "workplace". */
  domain: string;
  /** Brief description for scenario selection UI. */
  description?: string;
}

/**
 * Default/fallback vocabulary used when no scenario is loaded.
 * Generic terms that work without domain context.
 */
export const DEFAULT_VOCABULARY = {
  populationName: 'people',
  conditionName: 'have the condition',
  conditionNegativeName: 'do not have the condition',
  testName: 'the test',
  testPositiveName: 'test positive',
  testNegativeName: 'test negative',
  populationSingular: 'a person',
  conditionNameSingular: 'has the condition',
  testPositiveNameSingular: 'tests positive',
  relativePronoun: 'who',
  testAction: 'are tested',
  baseRateDomainName: 'prevalence of the condition',
} as const;
