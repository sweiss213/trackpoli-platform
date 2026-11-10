// Cucumber.js runner configuration (BDD executable harness, ADR-0011).
//
// PR 0 installs the @cucumber/cucumber runner and this config as the SKELETON for the executable BDD
// run that the design-system scenarios (authored in later PRs) will drive. The structural gates
// (check:gherkin, check:bdd-tags) already run today over features/. This profile declares the
// reports/cucumber.json output that check:bdd-executed reconciles once step definitions exist under
// features/step-definitions/. No scenarios or step definitions are authored here, so `npm run test:bdd`
// reports undefined steps (fails closed) by design until those step definitions land with their PRs.
const config = {
  paths: ["features/**/*.feature"],
  import: ["features/step-definitions/**/*.mjs"],
  format: ["summary", "json:reports/cucumber.json"],
  publishQuiet: true,
};

export default config;
