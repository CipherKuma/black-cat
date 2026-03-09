# CRE Simulation

CRE workflow verification using simulation only.

---

#### BC-CRE-1: verify-signals workflow simulation succeeds with deterministic fixture payload. `manual` `regression`

This test validates the only workflow entrypoint in black-cat using deterministic simulation input. It catches SDK/runtime wiring regressions.

**Preconditions:**
- CRE CLI is installed
- workflow dependencies are installed

**Steps:**
1. Run cre workflow simulate verify-signals with docs/fixtures/workflows/verify-signals.json payload
2. Capture output log
3. Assert command exits successfully

**Pass when:** Workflow simulation exits successfully and produces traceable output.

#### BC-CRE-2: verify-signals workflow simulation remains deterministic across two consecutive runs with the same payload. `manual` `deep`

This deep workflow test checks reproducibility by running the same simulation twice back-to-back. It catches hidden nondeterminism and state leakage between runs.

**Preconditions:**
- BC-CRE-1 passes

**Steps:**
1. Run cre workflow simulate verify-signals with deterministic fixture
2. Run the same simulation again with identical fixture
3. Compare key output markers and confirm deterministic behavior

**Pass when:** Both runs succeed and output shape remains deterministic for key fields.
