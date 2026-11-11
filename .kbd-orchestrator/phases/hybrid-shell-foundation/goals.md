# Goals

- Use the hybrid-mobile-architecture skill package (/Users/gqadonis/Projects/hybrid-mobile-architecture-src, read-only reference) to generate the Know Meet shell project code — no hand-rolled substitute for what the skill provides
- Desktop: Tauri app whose UI is the React 19 web app (one shared web codebase powers both web and Tauri)
- Mobile: Flutter app shell for iOS and Android
- Web: React 19 app shell, built with clean architecture (domain / application / infrastructure / presentation boundaries)
- UI kit: a proper shared set of shadcn/ui components themed with the Know Meet design tokens
- Assessment priority #1: perfectly replicate the Know Meet look and feel — palette, typography, spacing, components, light and dark themes, motion — from docs/design (tokens, brand guide, prototype and live prototype) before any feature work
- Flutter theme mirrors the same tokens so mobile matches web and desktop
- Set real build, test and lint commands in .kbd-orchestrator/project.json once the workspace exists
- Follow the full KBD process (assess → analyze → plan → execute → reflect) with OpenSpec changes; no shortcuts
