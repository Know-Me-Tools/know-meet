# Derived method context

Method: VLBV; phase: hybrid-shell-foundation; revision: 82; status: RESOLVED_REFERENCES.

This is a recovery index, not execution permission. Resolve current canonical decisions and contract before dependent action.

```json
{
  "schemaVersion": 1,
  "kind": "kbd.derived-method-context",
  "generatedAt": "2026-11-09T11:41:21.533Z",
  "authority": "derived-read-only-index; canonical signed decisions, phase binding, contract and governing host policy remain authority",
  "projectId": "80abee42-ead8-4e6f-b617-e458847775d3",
  "runId": "hybrid-shell-foundation-20261109T083641Z",
  "phaseId": "hybrid-shell-foundation",
  "sourceRevision": 82,
  "phaseDirectory": ".kbd-orchestrator/phases/hybrid-shell-foundation",
  "contract": {
    "path": ".kbd-orchestrator/phases/hybrid-shell-foundation/adopted-contract.json",
    "observation": "observed",
    "sha256": "aa768a993e49f1b5d75cd781891705434a6839d4f32e28eeeff5cd18f3bd88b9",
    "contractDigest": "768c585bd974ccb301d18ed957e82749bda7832332f743a5dfc6e0182e85b855",
    "binding": {
      "contractPath": ".kbd-orchestrator/phases/hybrid-shell-foundation/adopted-contract.json",
      "contractDigest": "768c585bd974ccb301d18ed957e82749bda7832332f743a5dfc6e0182e85b855",
      "scenarioDigests": {
        "VS-1": "f9040c0c6ff05b73c97069cb841ccef1b4c4dfd8d0482a2fd10acc10faf5abed",
        "VS-2": "aad9a3498cca88f179d6f1d12139c3d235dd811032184310babde06a9011f197",
        "VS-3": "8c329c9bbc8441fcb1b7df523dc2280563a0e13fcd176c53c2876724290d6d9c",
        "VS-4": "6428a194914a4d7dd92074b453ddac4bd91eec7efd9f40faf8634cfe9657bf26",
        "VS-5": "8064090ee62bcfa0232ba58a3e453206053310d80ad90960853d87fcc0217e10",
        "VS-8": "cfa1df6155b318239bb9c9117119dc69c1a2d1b9b6651ad47ade8e97a8116b6d",
        "VS-9": "8fdb290032f4c54fdbdc3aed111f4b3a0b2b1dc9d39af734f3f6357dfbef8e66"
      },
      "planRevision": 1,
      "adoptionDecisionId": "contract-adoption-hybrid-shell-foundation-768c585b",
      "bindingRevision": 2,
      "amendedScenarios": [
        "VS-1",
        "VS-2",
        "VS-3",
        "VS-4",
        "VS-5",
        "VS-8",
        "VS-9"
      ],
      "authority": {
        "manifestRaw": "{\"action\":\"amend-contract\",\"approver\":\"travis@tribehealthsolutions.com\",\"contractPath\":\".kbd-orchestrator/phases/hybrid-shell-foundation/adopted-contract.json\",\"kind\":\"kbd.scope-authority\",\"namespace\":\"prometheus-kbd-scope-amendment\",\"newContractDigest\":\"768c585bd974ccb301d18ed957e82749bda7832332f743a5dfc6e0182e85b855\",\"nonce\":\"7eeca24997f7a612c33c97fbf7c81daa\",\"phaseId\":\"hybrid-shell-foundation\",\"previousContractDigest\":\"f91e7c30ac98e27256e4b6d4bcbf4b630760061580f65cd3b923b07b86d786c9\",\"projectId\":\"80abee42-ead8-4e6f-b617-e458847775d3\",\"reason\":\"Operator-approved 2026-11-09 (form kbd-execute-decisions): scenario ownerTask references rewritten as exact change/task IDs so readiness coverage resolves; VS-8 oracle notes the temporary root live/ exception. Scope and acceptance unchanged.\",\"runId\":\"hybrid-shell-foundation-20261109T083641Z\",\"scenarioChanges\":{\"added\":[],\"modified\":[\"VS-1\",\"VS-2\",\"VS-3\",\"VS-4\",\"VS-5\",\"VS-8\",\"VS-9\"],\"removed\":[]},\"schemaVersion\":\"1\",\"timestamp\":\"2026-11-09T11:35:35Z\"}",
        "manifestSha256": "d7d2fa3dac852c5ddb02fd1fbae6d2b8a39fba2042d76c75f029b2589c264822",
        "signature": "-----BEGIN SSH SIGNATURE-----\nU1NIU0lHAAAAAQAAADMAAAALc3NoLWVkMjU1MTkAAAAgsgqOvzJMpDfEY0CKRyfxixLl97\nUxT+bg/r6Jl4BBHFcAAAAecHJvbWV0aGV1cy1rYmQtc2NvcGUtYW1lbmRtZW50AAAAAAAA\nAAZzaGE1MTIAAABTAAAAC3NzaC1lZDI1NTE5AAAAQP/zhF22lt3E3JdJyPXF0aiax4tmLg\nnE3ZdY4kObfZwQ/XEB+fc2IC+sBawUqEqdceKVy6nseX/6Dxi1wWgS4Q0=\n-----END SSH SIGNATURE-----\n",
        "approver": "travis@tribehealthsolutions.com",
        "namespace": "prometheus-kbd-scope-amendment",
        "allowedSignersSha256": "4c32adefb70e281e6c78f3ecb562088ef82209c54a9a01b1ed630ba3ed78a573"
      }
    },
    "identity": {
      "projectId": "80abee42-ead8-4e6f-b617-e458847775d3",
      "runId": "hybrid-shell-foundation-20261109T083641Z",
      "phaseId": "hybrid-shell-foundation",
      "planRevision": 1,
      "contractDigest": "768c585bd974ccb301d18ed957e82749bda7832332f743a5dfc6e0182e85b855"
    }
  },
  "selectedMethod": "VLBV",
  "methodDecision": {
    "id": "kbd-method-hybrid-shell-foundation-768c585b",
    "summary": "KBD-METHOD {\"phaseId\":\"hybrid-shell-foundation\",\"contractDigest\":\"768c585bd974ccb301d18ed957e82749bda7832332f743a5dfc6e0182e85b855\",\"method\":\"VLBV\",\"retiredMethods\":[],\"references\":[{\"path\":\".kbd-orchestrator/phases/hybrid-shell-foundation/adopted-contract.json\",\"sha256\":\"aa768a993e49f1b5d75cd781891705434a6839d4f32e28eeeff5cd18f3bd88b9\"},{\"path\":\".kbd-orchestrator/phases/hybrid-shell-foundation/plan.md\",\"sha256\":\"f9f71d739d69e462bdacf63589249d214a8472749137a11f3825f28a4618cc92\"},{\"path\":\".kbd-orchestrator/phases/hybrid-shell-foundation/decision-log.md\",\"sha256\":\"b1669a38711ec6e2e8a01042804e27fdb1782e16f4717b46382b8774dd4ce0bb\"}]}",
    "planRevision": 1,
    "supersedes": null
  },
  "retiredMethods": [],
  "references": [
    {
      "path": ".kbd-orchestrator/phases/hybrid-shell-foundation/adopted-contract.json",
      "observation": "observed",
      "sha256": "aa768a993e49f1b5d75cd781891705434a6839d4f32e28eeeff5cd18f3bd88b9",
      "expectedSha256": "aa768a993e49f1b5d75cd781891705434a6839d4f32e28eeeff5cd18f3bd88b9",
      "matches": true
    },
    {
      "path": ".kbd-orchestrator/phases/hybrid-shell-foundation/plan.md",
      "observation": "observed",
      "sha256": "f9f71d739d69e462bdacf63589249d214a8472749137a11f3825f28a4618cc92",
      "expectedSha256": "f9f71d739d69e462bdacf63589249d214a8472749137a11f3825f28a4618cc92",
      "matches": true
    },
    {
      "path": ".kbd-orchestrator/phases/hybrid-shell-foundation/decision-log.md",
      "observation": "observed",
      "sha256": "b1669a38711ec6e2e8a01042804e27fdb1782e16f4717b46382b8774dd4ce0bb",
      "expectedSha256": "b1669a38711ec6e2e8a01042804e27fdb1782e16f4717b46382b8774dd4ce0bb",
      "matches": true
    }
  ],
  "includedValue": [
    "pnpm workspace, toolchain pins, lint/typecheck/test commands, naming and line-limit enforcement",
    "Reconciled token source in docs/design/tokens.json and self-hosted fonts",
    "Vendored, extended token generator emitting web CSS, shadcn variables, Tailwind theme, Dart tokens and ThemeData",
    "Generator output imported in full (Tauri, Flutter, Rust core, FRB, Axum BFF, UAR, PEM)",
    "Single React 19 web bundle shared by web and Tauri, four-layer clean architecture",
    "Shared shadcn/ui kit themed by tokens",
    "App frame, navigation and theme switching on web/desktop and Flutter",
    "Static in-scope screens on web/desktop and Flutter, meeting-room layout with media stubbed",
    "Fidelity oracles and evidence"
  ],
  "exclusions": [
    "LiveKit media, recording, transcription and the token service",
    "Authentication and real accounts",
    "Telnyx SMS/SIP and calendar integrations",
    "Real data and persistence beyond what the generator ships",
    "App-store packaging and signing",
    "Writes to /Users/gqadonis/Projects/hybrid-mobile-architecture-src",
    "Screens and states outside the adopted in-scope list"
  ],
  "stage": "plan",
  "stageAuthority": {
    "operations": [
      "discover/define/plan within governing policy"
    ],
    "implementationComplete": false,
    "verificationAuthority": "separately authorized whole-value-phase boundary required; this index grants none",
    "executableTestAuthoring": "governed by host policy; where that policy is production-first, defer until the complete agreed production work"
  },
  "governingInstructions": [
    {
      "path": "AGENTS.md",
      "observation": "observed",
      "sha256": "82c480163df0af6b4fc8549352cf86f1927fa1a58ca16aa27bb60a1991947137"
    },
    {
      "path": "CLAUDE.md",
      "observation": "observed",
      "sha256": "2bf0591806f7208e5b680fa3651b370ecf5e816c60e6497ee9cbf55165d73066"
    },
    {
      "path": ".kbd-orchestrator/constraints.md",
      "observation": "observed",
      "sha256": "1dc5b6ed02a6aae6da2bb5cf4bdb354e70b4947bbdd33a85eeb40175e3c46056"
    }
  ],
  "policyConflicts": [],
  "candidateAndEvidence": {
    "freshness": "Keyed by contract digest, git commit of the tested tree, tokens.json digest and prototype baseline digest; only evidence whose key changed is invalidated; history preserved.",
    "paths": [
      "evidence/boundary/<timestamp>/argv-and-exit.json",
      "Playwright HTML report",
      "flutter test output",
      "cargo logs",
      "digest pair for VS-2"
    ]
  },
  "budgets": {
    "adopted": {
      "timeMinutes": 2400,
      "toolCalls": 3000,
      "repairAttempts": 3,
      "noProgressLimit": 3,
      "tokenBudget": "UNKNOWN",
      "tokenFallback": "Checkpoint after each change; stop and report if a change exceeds 2x its size estimate.",
      "exhaustion": "checkpoint + BLOCKED; never silent PASS; docs/state may be saved without running product tests."
    },
    "consumption": "UNKNOWN; recover original canonical/evidence receipts before execution"
  },
  "unresolved": {
    "boundaryObligations": {},
    "blockers": [],
    "instruction": "Unknown side effects require reconciliation before retry, not a fresh attempt assumption."
  },
  "preserve": [
    "latest non-superseded method decision and retiredMethods; old commands/memory are context only",
    "original contract snapshots, evidence and source/build/configuration/fixture/assertion identity",
    "all budget consumption/high-water marks, including UNKNOWN prior usage; never reset on recovery",
    "unresolved effects and cleanup/receipt obligations; reconcile uncertain effects before retry"
  ],
  "hostCapabilities": {
    "platform": "darwin",
    "nodeVersion": "v26.5.0",
    "observedInterfaces": [
      "canonical status",
      "typed phase disposition",
      "project-owned file identity"
    ],
    "executionInterception": "not provided by this helper",
    "commandInventoryIsPermission": false
  },
  "control": {
    "mode": "instruction-only",
    "observed": [
      "canonical references and file identities"
    ],
    "enforced": [
      "only named existing signed runtime mutations; no generic shell/tool interception claimed"
    ],
    "unsupported": [
      "universal model obedience or arbitrary tool interception"
    ]
  },
  "status": "RESOLVED_REFERENCES",
  "blockers": []
}
```
