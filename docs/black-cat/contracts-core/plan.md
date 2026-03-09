# Contracts Core

Deterministic Foundry mapping for BlackCat contracts.

---

#### BC-CON-1: BlackCat Foundry suite passes under forge test output mapping. `manual` `regression`

This test validates the BlackCat contract behavior using the existing Foundry suite and writes deterministic mapped results. It catches on-chain logic regressions.

**Preconditions:**
- forge is installed
- contracts dependencies are present

**Steps:**
1. Run forge test --json in contracts package
2. Extract BlackCat.t.sol suite result
3. Write mapped result evidence artifact

**Pass when:** BlackCat.t.sol passes and deterministic mapping artifact is produced.

#### BC-CON-2: Contract test execution is stable across repeated forge runs with unchanged state. `manual` `deep`

This deep contract test checks repeatability of the Foundry suite by requiring consistent pass behavior on repeated execution. It catches flaky tests and hidden order dependencies.

**Preconditions:**
- BC-CON-1 passes

**Steps:**
1. Run forge test --json once and capture result
2. Run forge test --json again without code changes
3. Confirm both runs produce consistent pass/fail outcome

**Pass when:** Repeated forge runs remain consistent and deterministic for mapped suites.
