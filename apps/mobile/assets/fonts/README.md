# Self-hosted fonts for Flutter (c07, task 7.1)

TTF versions of the files `packages/design-tokens/fonts/` ships as WOFF2 for
the web, taken from the **same upstream releases** c02 used, so web and mobile
render the same font versions. Flutter cannot load WOFF2. Files are unmodified
and renamed to kebab-case only. Downloaded 2026-11-09 with
`gh release download`; each archive's sha256 matched the c02 record in
`packages/design-tokens/fonts/README.md` before extraction. All three families
are SIL Open Font License 1.1; the licence texts are byte-identical to the c02
copies.

| File                          | Family / weight                                             | File in release archive                         | sha256                                                             |
| ----------------------------- | ----------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| `space-grotesk-variable.ttf`  | Space Grotesk, `wght` 300–700 (registered as 500, 600, 700) | `SpaceGrotesk-2.0.0/ttf/SpaceGrotesk[wght].ttf` | `acad6de1fc93436f5c0f1f4137751ef04f1aea3063e7036535970ffcfbd79f72` |
| `inter-regular.ttf`           | Inter 400                                                   | `extras/ttf/Inter-Regular.ttf`                  | `40d692fce188e4471e2b3cba937be967878f631ad3ebbbdcd587687c7ebe0c82` |
| `inter-medium.ttf`            | Inter 500                                                   | `extras/ttf/Inter-Medium.ttf`                   | `97ad806f526e41546d46365bb3a393145f75b7b1568913db74549ad8b8dba872` |
| `inter-semibold.ttf`          | Inter 600                                                   | `extras/ttf/Inter-SemiBold.ttf`                 | `78a843fade9d4612a5567302fb595b56976eb5fcebf4fea5a5912d638bafcde3` |
| `jetbrains-mono-medium.ttf`   | JetBrains Mono 500                                          | `fonts/ttf/JetBrainsMono-Medium.ttf`            | `31c92d01a8a08528b718a43addf0ad3df0af2ca4b7b3290a452f70f358e14d3d` |
| `jetbrains-mono-semibold.ttf` | JetBrains Mono 600                                          | `fonts/ttf/JetBrainsMono-SemiBold.ttf`          | `1b3bfa1ed5665a4ce3f9feb68d2d4e40e70bf8b4b7d9a3edd418f321b4e166a0` |
| `space-grotesk-ofl.txt`       | Licence                                                     | `SpaceGrotesk-2.0.0/OFL.txt`                    | `564ce565c371c5e5bbf286006565a7c9aa55a9f56e7ca58d56e05d649dd61a72` |
| `inter-ofl.txt`               | Licence                                                     | `LICENSE.txt`                                   | `262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a` |
| `jetbrains-mono-ofl.txt`      | Licence                                                     | `OFL.txt`                                       | `30f0c136e3c88e422d0791acd97238870f9054a9729bc34cf2ff0d4ed8cac4ad` |

Archives: Space Grotesk 2.0.0 (`53b41557…`), Inter 4.1 (`9883fdd4…`),
JetBrains Mono 2.304 (`6f6376c6…`); full URLs and digests in the c02 README.

## Known risk

Space Grotesk 2.0.0 has no static SemiBold, so the variable file is registered
for 500, 600 and 700. Whether Flutter maps `FontWeight` onto the `wght` axis
of a variable font without an explicit `FontVariation('wght', …)` is not
verified here (VLBV: no test run). The c12 goldens settle it; if weights
render wrong, the token generator (design-lead) must emit `fontVariations`.
