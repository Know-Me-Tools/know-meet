# Derived method context

Method: VLBV (signed-decision); phase: web-release; revision: 536; status: RESOLVED_REFERENCES.

This is a recovery index, not execution permission. Resolve current canonical decisions and contract before dependent action.

```json
{
  "schemaVersion": 1,
  "kind": "kbd.derived-method-context",
  "generatedAt": "2026-11-16T21:14:09.474Z",
  "authority": "derived-read-only-index; canonical signed decisions, phase binding, contract and governing host policy remain authority",
  "projectId": "80abee42-ead8-4e6f-b617-e458847775d3",
  "runId": "hybrid-shell-foundation-20261109T083641Z",
  "phaseId": "web-release",
  "sourceRevision": 536,
  "phaseDirectory": ".kbd-orchestrator/phases/web-release",
  "contract": {
    "path": ".kbd-orchestrator/phases/web-release/adopted-contract.json",
    "observation": "observed",
    "sha256": "718546a2c371571fc084bbac731fc8d6f8d4ad78cd562deb7b4c35d3f0bf24fc",
    "contractDigest": "bae48b5f2265b41042be31dbc8601ca176ad4bbc6221df7f6a826fb706e60c4f",
    "binding": {
      "contractPath": ".kbd-orchestrator/phases/web-release/adopted-contract.json",
      "contractDigest": "bae48b5f2265b41042be31dbc8601ca176ad4bbc6221df7f6a826fb706e60c4f",
      "scenarioDigests": {
        "WR-1": "c53063284a1ea6a1665a80e48c9d369218d9e6c0b015de975947b5cd07a1449b",
        "WR-2": "d90fc902cf954d415e26655cfc7bfa8cf4836b6516b77ca2ac802b35baf420e4",
        "WR-3": "01163c5c12807b7ea79fe0de95d860f27835baa376b7b3a6ba78ce4252cb32cb",
        "WR-4": "05ecee3a7d87e01752c9fe56eb75f9b163858293052385c52072475343d1c7ae",
        "WR-5": "e0ce24f18ce1d8fa546f8ce581c8fb0501f9261600a01a54bbde52a92a5a45aa",
        "WR-6": "060f9b2d06c8ea1f11cc82c0c61ffc45f9b2f8a7e09c048cd19ea4310f2650bb",
        "WR-7": "9944f34a567f3766b9b7ad28cd81a6d1c619cb5228ea7bc27658b691307e07e3",
        "WR-8": "2838f8f9dd63ad1b3219a9e00a1fb1076c6233c9659945e1462088c85eb5e0bd",
        "WR-9": "914163a600f2a535382e6c058586e34278a17834fbe0ad92dc01e3d2af3f4b45"
      },
      "planRevision": 1,
      "adoptionDecisionId": "contract-adoption-web-release-bae48b5f",
      "bindingRevision": 5,
      "authority": {
        "manifestRaw": "{\"action\":\"amend-contract\",\"approver\":\"travis@tribehealthsolutions.com\",\"contractPath\":\".kbd-orchestrator/phases/web-release/adopted-contract.json\",\"kind\":\"kbd.scope-authority\",\"namespace\":\"prometheus-kbd-scope-amendment\",\"newContractDigest\":\"bae48b5f2265b41042be31dbc8601ca176ad4bbc6221df7f6a826fb706e60c4f\",\"nonce\":\"e9f102f1d1b165d1472251397c372e8f\",\"phaseId\":\"web-release\",\"previousContractDigest\":\"35ef65750099b0b41f84ea2ab333976263df6188b3f900e53fea2d63f8428b36\",\"projectId\":\"80abee42-ead8-4e6f-b617-e458847775d3\",\"reason\":\"Operator approved and signed amendment 4 (\\\"Approve and sign\\\", 2026-11-16): budget extension for terminal closure only. repairAttempts 6 to 7 for repair 7 (b29d7d59, approved in chat as \\\"Yes, repair 7\\\"); timeMinutes 1800 to 1950 for measured wall-clock 1944. Scope, scenarios, exclusions, safety checks and release claim unchanged.\",\"runId\":\"hybrid-shell-foundation-20261109T083641Z\",\"scenarioChanges\":{\"added\":[],\"modified\":[],\"removed\":[]},\"schemaVersion\":\"1\",\"timestamp\":\"2026-11-16T21:12:06Z\"}",
        "manifestSha256": "413c45bed377e6191f321430acae48c96997a949203ff80728b8fdef283b9f44",
        "signature": "-----BEGIN SSH SIGNATURE-----\nU1NIU0lHAAAAAQAAADMAAAALc3NoLWVkMjU1MTkAAAAgsgqOvzJMpDfEY0CKRyfxixLl97\nUxT+bg/r6Jl4BBHFcAAAAecHJvbWV0aGV1cy1rYmQtc2NvcGUtYW1lbmRtZW50AAAAAAAA\nAAZzaGE1MTIAAABTAAAAC3NzaC1lZDI1NTE5AAAAQFuDt3IYZgA9P0UmHO8Usjf1zgcAb0\nlZQrkvxkSIEHsZCLKGQsNet6Npot/2aeWLPQhqKwsj8yfqQkr2uvI/8AQ=\n-----END SSH SIGNATURE-----\n",
        "approver": "travis@tribehealthsolutions.com",
        "namespace": "prometheus-kbd-scope-amendment",
        "allowedSignersSha256": "4c32adefb70e281e6c78f3ecb562088ef82209c54a9a01b1ed630ba3ed78a573"
      }
    },
    "identity": {
      "projectId": "80abee42-ead8-4e6f-b617-e458847775d3",
      "runId": "hybrid-shell-foundation-20261109T083641Z",
      "phaseId": "web-release",
      "planRevision": 1,
      "contractDigest": "bae48b5f2265b41042be31dbc8601ca176ad4bbc6221df7f6a826fb706e60c4f"
    }
  },
  "selectedMethod": "VLBV",
  "methodSource": "signed-decision",
  "deviation": null,
  "methodDecision": {
    "id": "kbd-method-web-release-20261116-g",
    "summary": "KBD-METHOD {\"phaseId\":\"web-release\",\"contractDigest\":\"bae48b5f2265b41042be31dbc8601ca176ad4bbc6221df7f6a826fb706e60c4f\",\"method\":\"VLBV\",\"retiredMethods\":[],\"references\":[{\"path\":\".kbd-orchestrator/phases/web-release/adopted-contract.json\",\"sha256\":\"718546a2c371571fc084bbac731fc8d6f8d4ad78cd562deb7b4c35d3f0bf24fc\"},{\"path\":\".kbd-orchestrator/phases/web-release/plan.md\",\"sha256\":\"af82394ed7c82c73cf61ffafe884f304055627cb0b69a1c8a0f348e8951b0995\"}]}",
    "planRevision": 1,
    "supersedes": "kbd-method-web-release-20261116-f"
  },
  "retiredMethods": [],
  "references": [
    {
      "path": ".kbd-orchestrator/phases/web-release/adopted-contract.json",
      "observation": "observed",
      "sha256": "718546a2c371571fc084bbac731fc8d6f8d4ad78cd562deb7b4c35d3f0bf24fc",
      "expectedSha256": "718546a2c371571fc084bbac731fc8d6f8d4ad78cd562deb7b4c35d3f0bf24fc",
      "matches": true
    },
    {
      "path": ".kbd-orchestrator/phases/web-release/plan.md",
      "observation": "observed",
      "sha256": "af82394ed7c82c73cf61ffafe884f304055627cb0b69a1c8a0f348e8951b0995",
      "expectedSha256": "af82394ed7c82c73cf61ffafe884f304055627cb0b69a1c8a0f348e8951b0995",
      "matches": true
    }
  ],
  "includedValue": [
    "Meeting domain types and the RealtimeRoom and TokenIssuer ports with in-memory fakes",
    "Token service in services/livekit with server-generated room codes and abuse controls",
    "RealtimeRoom adapter over livekit-client in packages/realtime",
    "Guest flow on home, join lobby and meeting room: start, join by code, device preview, tiles, mute, leave, error states",
    "Hosted build that exposes only home, join and the meeting room",
    "Two container images and a build-and-push workflow to GitHub Container Registry",
    "Kustomize manifests, Gateway, HTTPRoute with security headers, certificate and one Argo CD Application",
    "Release documentation and an operator runbook",
    "Release scenarios and their evidence"
  ],
  "exclusions": [
    "Desktop (Tauri) and mobile (Flutter) releases",
    "Accounts, sign-in and any identity service",
    "Agents, dots, the Concierge, transcription, recording, summaries and delivery",
    "Dashboard, agents, recordings, settings, notes and sign-in screens in the hosted build",
    "Calendars, SMS, SIP dial-in",
    "Self-hosted LiveKit",
    "Deploying services/bff or either prototype server",
    "Unblocking c13 or c16 in hybrid-shell-foundation",
    "Use of the root live/ folder",
    "Writes to /Users/gqadonis/Projects/hybrid-mobile-architecture-src"
  ],
  "stage": "execute",
  "stageAuthority": {
    "operations": [
      "author agreed production without generated-code verification"
    ],
    "implementationComplete": true,
    "verificationAuthority": "separately authorized whole-value-phase boundary required; this index grants none",
    "executableTestAuthoring": "governed by host policy; where that policy is production-first, defer until the complete agreed production work"
  },
  "governingInstructions": [
    {
      "path": "AGENTS.md",
      "observation": "observed",
      "sha256": "8c6e29eda78d87702cc7bfadb261d0032f9fd596b53f13c9080d25eec0f257ae"
    },
    {
      "path": "CLAUDE.md",
      "observation": "observed",
      "sha256": "8c6e29eda78d87702cc7bfadb261d0032f9fd596b53f13c9080d25eec0f257ae"
    },
    {
      "path": ".kbd-orchestrator/constraints.md",
      "observation": "observed",
      "sha256": "012fab0fbd6a1f1ac6b6b37cc5993fbe1e3803a4d7bb1c23f4cf218e346398f1"
    }
  ],
  "effectiveRules": {
    "harness": null,
    "profile": "not-found",
    "files": [
      "AGENTS.md",
      "CLAUDE.md",
      ".kbd-orchestrator/constraints.md"
    ],
    "shadowing": null
  },
  "policyConflicts": [
    {
      "path": "AGENTS.md",
      "sha256": "8c6e29eda78d87702cc7bfadb261d0032f9fd596b53f13c9080d25eec0f257ae",
      "issue": "Host compiler or cadence exception conflicts with VLBV; do not infer permission to run generated-code checks during generation.",
      "acknowledged": true,
      "ackDecisionId": "kbd-policy-ack-web-release-agents-md-20261116"
    },
    {
      "path": "CLAUDE.md",
      "sha256": "8c6e29eda78d87702cc7bfadb261d0032f9fd596b53f13c9080d25eec0f257ae",
      "issue": "Host compiler or cadence exception conflicts with VLBV; do not infer permission to run generated-code checks during generation.",
      "acknowledged": true,
      "ackDecisionId": "kbd-policy-ack-web-release-claude-md-20261116"
    }
  ],
  "candidateAndEvidence": {
    "freshness": "Keyed by contract digest, git commit of the tested tree, the two image digests and the rendered manifest digest. Only evidence whose key changed is invalidated; history is preserved in dated folders. Amendment 2: the tested tree is identified by KM_TESTED_COMMIT. Evidence from the packaged run stays valid for the deployed commits while their only differences from the tested commit are the two newTag lines of the production kustomization.yaml and the one issuerRef.name line of infra/platform/certificate.yaml. Any other difference invalidates it. The packaged run tests locally built images; the cluster runs the images the workflow built from the same tree, and their digests differ. Only the hosted run and WR-7 are evidence about the deployed images. Amendment 3: the deploy job's bot commit is the tag pin; the same rule applies to it (only the two newTag lines may differ from the tested commit).",
    "paths": [
      "evidence/boundary-<date>/argv-and-exit.json",
      "Playwright reports for the packaged and hosted projects",
      "Image digests and the workflow run URL",
      "Argo CD application status",
      "Certificate issuer and header dump",
      "Security review and UI review files"
    ]
  },
  "budgets": {
    "adopted": {
      "timeMinutes": 1800,
      "toolCalls": 2500,
      "repairAttempts": 6,
      "noProgressLimit": 3,
      "tokenBudget": "UNKNOWN",
      "tokenFallback": "Checkpoint after each change; stop and report if a change exceeds 2x its size estimate.",
      "consumedAtAuthoring": {
        "note": "Assess, analyze and plan stages are not counted against this budget. Their time and tool use were not measured."
      },
      "exhaustion": "checkpoint + BLOCKED; never silent PASS; docs/state may be saved without running product tests.",
      "extensions": [
        {
          "id": "ext-1-repair-7-and-wall-clock",
          "repairAttempts": 1,
          "timeMinutes": 150,
          "toolCalls": 0,
          "resultingCeilings": {
            "timeMinutes": 1950,
            "toolCalls": 2500,
            "repairAttempts": 7,
            "noProgressLimit": 3
          },
          "reason": "Repair 7 (b29d7d59, images.yml negative-control image gets a file layer) was approved in chat (\"Yes, repair 7\") and never signed. Execute ran 1944 wall-clock minutes (dispatch 2026-11-15T12:15Z to execute complete 2026-11-16T20:39Z), above the 1800 ceiling; the extension covers the measured wall-clock value rather than switching to a more favourable active-time measure.",
          "operatorAnswer": "Approve and sign",
          "date": "2026-11-16"
        }
      ]
    },
    "consumption": {
      "noProgress": 0,
      "repairAttempts": 7,
      "timeMinutes": 1944,
      "toolCalls": 1713
    }
  },
  "unresolved": {
    "boundaryObligations": {
      "change:c13-fidelity-verification-and-evidence": {
        "key": "change:c13-fidelity-verification-and-evidence",
        "receiptId": "21209ac29b39055e21540fcd346d6c762fcb1774d42196c0ffa9c9b6c691a3d0",
        "boundary": "change",
        "subject": "c13-fidelity-verification-and-evidence",
        "sourceRevision": 239,
        "exactSignal": "Starting change 13 out of 16: Single boundary run, fidelity, security and accessibility evidence"
      },
      "phase:web-release": {
        "key": "phase:web-release",
        "receiptId": "a381e5aec879e682338ad1bda66342274d4ace375a8b2bfdf743479bd235095f",
        "boundary": "phase",
        "subject": "web-release",
        "sourceRevision": 277,
        "exactSignal": "Starting phase 2 out of 2: web-release"
      },
      "task:c13-fidelity-verification-and-evidence/13.1": {
        "key": "task:c13-fidelity-verification-and-evidence/13.1",
        "receiptId": "282bc42370010cf1210e58db88787be1c23af0126c92c2daa174894cfb223f93",
        "boundary": "task",
        "subject": "c13-fidelity-verification-and-evidence/13.1",
        "sourceRevision": 240,
        "exactSignal": "Starting task 1 out of 10: Run the web fidelity matrix (VS-1)"
      }
    },
    "blockers": [
      {
        "id": "hsf-c13-cycle4-acceptance",
        "summary": "Fourth-cycle boundary blocked: root TypeScript TS4111; partial browser16 completed5passed11failed; required WCAG text contrast and label/target-size failures plus scroll-selector defect. Stopped under adopted safety-failure condition.108 scenarios lack result; VS1 andremaininggates unverified. Evidence approved-cycle-4/partial-result.json and remaining-work.md.",
        "resolved": false,
        "resolution": null
      },
      {
        "id": "hsf-c13-cycle4-budget-exhausted",
        "summary": "Known repair consumption4 of authorized4; fourth attempt stopped after required WCAG contrast failures. No fifth repair or verification cycle authorized. Prior UNKNOWN time/tool usage and all evidence retained.",
        "resolved": false,
        "resolution": null
      },
      {
        "id": "hsf-c13-cycle4-rule-regression",
        "summary": "Task13.6 remains terminal Complete for historical Stage A evidence because runtime rejects reopening Complete to Blocked. Current candidate is NOT verified: root pnpm typecheck fails TS4111 at reference-correction-capture.ts118 and lint was not reached. This explicit regression blocker prevents certification; do not infer currentPASS from checkbox.",
        "resolved": false,
        "resolution": null
      },
      {
        "id": "hsf-c13-harness-failures",
        "summary": "Current Stage B support run45 scenarios:17 passed28 failed. Required320/600/1000 widths rejected by screenshot viewport helper; keyboard name approximation and two focus negative controls fail. Reports/command exits/candidate hashes: evidence/c13-stage-b-2026-11-13. No pass or threshold waiver inferred.",
        "resolved": false,
        "resolution": null
      },
      {
        "id": "hsf-c13-isolated-review-approval",
        "summary": "Automatic approval review rejected sending private358KB scoped packet to OpenAI Codex CLI pending explicit payload/destination approval. Async operator request pending. Local independent correction review can report findings but cannot claim completed isolated judge.",
        "resolved": false,
        "resolution": null
      }
    ],
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
    "nodeVersion": "v24.11.1",
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
