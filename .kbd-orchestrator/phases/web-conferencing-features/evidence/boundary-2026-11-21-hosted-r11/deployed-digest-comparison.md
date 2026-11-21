# Deployed digest comparison after repair 11 (2026-11-21)

Merge 8eb98147 (PR #17); images run https://github.com/Know-Me-Tools/know-meet/actions/runs/44920034406 (success);
deploy commit 37587a9b pins web sha256:bf50fd76…3528345 and token service sha256:73fa3e97…663caf.

| File | Pinned web image (sha256) | Live (sha256) |
| --- | --- | --- |
| index.html | a635610b73cc85f01a7bd7c23dcb33d5ae7d5d2415e562c6a2082a8cd28e291a | a635610b73cc85f01a7bd7c23dcb33d5ae7d5d2415e562c6a2082a8cd28e291a |
| /assets/index-Bz7bK80g.js | 58da1069aef32b43e905f3d01eddebdf1fe01366c73f79958fa2187b6fa9bb34 | 58da1069aef32b43e905f3d01eddebdf1fe01366c73f79958fa2187b6fa9bb34 |

The live bundle contains the repair 11 text "Saving this meeting to your history on this device…".
Cluster read not possible (gcloud needs an interactive re-login); token service digest not verified by this method.
