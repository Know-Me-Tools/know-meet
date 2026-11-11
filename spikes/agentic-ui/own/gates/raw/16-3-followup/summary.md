
#### chromium: Submit to render-complete (ms)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 5825 | 5826 | -8.5 [-13.4, 1.5] | 3 / 7 | 10 |  |
| `long-markdown` | after | 5911 | 5887 | -17.8 [-33.8, -6.3] | 1 / 9 | 10 | **M** |
| `cancel-mid-stream` | before | 86691 | 86686 | -13 [-24.2, -2.9] | 2 / 8 | 10 | **M** |
| `cancel-mid-stream` | after | 86907 | 86878 | -25.7 [-48.2, 2.1] | 3 / 7 | 10 |  |
| `hostile/huge-table` | before | 1149 | 1131 | -18.2 [-39.4, -1.1] | 2 / 8 | 10 | **M** |
| `hostile/huge-table` | after | 1149 | 1126 | -15.7 [-36.4, 6.9] | 2 / 8 | 10 |  |

#### chromium: Render lag after settle (ms)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 0 | 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `long-markdown` | after | 0.3 | 0 | -0.3 [-1.3, 0.3] | 3 / 5 | 10 |  |
| `cancel-mid-stream` | before | 0 | 0 | 0 [0, 0] | 0 / 1 | 10 |  |
| `cancel-mid-stream` | after | 0 | 0 | 0 [0, 0] | 0 / 1 | 10 |  |
| `hostile/huge-table` | before | 11.2 | 0 | -11.2 [-13, -10.8] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | after | 11.1 | 0 | -11.1 [-11.4, -10.8] | 0 / 10 | 10 | **M** |

#### chromium: Time to first token (ms)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 67.2 | 35.8 | -30.8 [-34.3, -28] | 0 / 10 | 10 | **M** |
| `long-markdown` | after | 68.3 | 37.6 | -33.6 [-34.7, -25.8] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | before | 64 | 23 | -40.7 [-44.5, -37.4] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | after | 66 | 23.8 | -42.9 [-43.9, -39] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | before | 45.4 | 38.7 | -6.4 [-7.8, -3.6] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | after | 45.8 | 39.5 | -7.6 [-10.1, -2.9] | 2 / 8 | 10 | **M** |

#### chromium: Long-task total, submit to render-complete (ms)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 0 | 76.5 | 76.5 [75, 78] | 10 / 0 | 10 | **M** |
| `long-markdown` | after | 0 | 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `cancel-mid-stream` | before | 0 | 0 | 0 [0, 0] | 1 / 0 | 10 |  |
| `cancel-mid-stream` | after | 0 | 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `hostile/huge-table` | before | 212 | 264 | 66.5 [31, 95] | 9 / 1 | 10 | **M** |
| `hostile/huge-table` | after | 168 | 260 | 79.5 [41.5, 97] | 9 / 1 | 10 | **M** |

#### chromium: Main-thread task time (CDP TaskDuration) (ms)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 2393 | 807 | -1595 [-1655, -1538] | 0 / 10 | 10 | **M** |
| `long-markdown` | after | 2345 | 780 | -1551 [-1605, -1511] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | before | 11645 | 7359 | -3655 [-4475, -3518] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | after | 11942 | 7875 | -4004 [-4469, -3618] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | before | 1191 | 723 | -469 [-503, -456] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | after | 1182 | 710 | -482 [-490, -458] | 0 / 10 | 10 | **M** |

#### chromium: Scripting time (CDP ScriptDuration) (ms)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 1624 | 334 | -1303 [-1343, -1254] | 0 / 10 | 10 | **M** |
| `long-markdown` | after | 1571 | 373 | -1186 [-1220, -1159] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | before | 5745 | 3746 | -1760 [-2118, -1636] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | after | 6065 | 4171 | -1872 [-2118, -1742] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | before | 1086 | 576 | -509 [-542, -494] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | after | 1069 | 560 | -522 [-533, -504] | 0 / 10 | 10 | **M** |

#### chromium: Dropped frames (rAF deltas, 60 Hz) (frames)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 0 | 3 | 3 [2, 3] | 10 / 0 | 10 | **M** |
| `long-markdown` | after | 0 | 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `cancel-mid-stream` | before | 0 | 2 | 2 [1, 2] | 10 / 0 | 10 | **M** |
| `cancel-mid-stream` | after | 0 | 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `hostile/huge-table` | before | 23 | 15.5 | -7.5 [-10, -6.5] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | after | 16 | 14.5 | -2 [-3, -1] | 1 / 8 | 10 | **M** |

#### chromium: Input latency, per-run median (keydown to next paint, in-stream) (ms)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 12.1 | 9.6 | -2.6 [-3, -1.6] | 1 / 9 | 10 | **M** |
| `long-markdown` | after | 11.3 | 8.8 | -1.9 [-2.9, -1.1] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | before | 9.5 | 9.3 | -0.5 [-0.8, 0.1] | 2 / 8 | 10 |  |
| `cancel-mid-stream` | after | 9.6 | 9.3 | -0.3 [-0.6, 0.1] | 3 / 7 | 10 |  |
| `hostile/huge-table` | before | 34.3 | 25.4 | -5.6 [-21.2, -2.1] | 1 / 9 | 10 | **M** |
| `hostile/huge-table` | after | 24.1 | 21.8 | -3 [-11.5, 8.8] | 4 / 6 | 10 |  |

#### chromium: Input latency, per-run worst (in-stream) (ms)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 18.3 | 19.5 | 1.1 [-1.5, 45.2] | 5 / 5 | 10 |  |
| `long-markdown` | after | 23.8 | 17.8 | -6.1 [-7.8, -2.3] | 1 / 9 | 10 | **M** |
| `cancel-mid-stream` | before | 20.9 | 19.8 | -1.7 [-3, 0] | 2 / 8 | 10 |  |
| `cancel-mid-stream` | after | 20.3 | 22.1 | 2 [0.4, 3.6] | 8 / 2 | 10 | **M** |
| `hostile/huge-table` | before | 73.1 | 54.3 | -27.2 [-43.1, -1] | 1 / 9 | 10 | **M** |
| `hostile/huge-table` | after | 52 | 53.7 | 4.5 [-25.6, 20.6] | 6 / 4 | 10 |  |

#### chromium: JS heap after forced GC at render-complete (MB)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 20.9 | 19.1 | -1.8 [-1.9, -1.8] | 0 / 10 | 10 | **M** |
| `long-markdown` | after | 20.9 | 15.7 | -5.2 [-5.2, -5.1] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | before | 21.5 | 20.6 | -0.9 [-0.9, -0.8] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | after | 21.5 | 17.1 | -4.3 [-4.4, -4.3] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | before | 20 | 19.9 | -0.1 [-0.2, -0] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | after | 20 | 19.8 | -0.2 [-0.4, -0.1] | 1 / 9 | 10 | **M** |

#### chromium: Worst animation frame (rAF delta) (ms)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 16.8 | 66.6 | 49.8 [33.2, 49.9] | 10 / 0 | 10 | **M** |
| `long-markdown` | after | 16.8 | 16.8 | 0 [0, 0] | 0 / 0 | 10 |  |
| `cancel-mid-stream` | before | 16.8 | 41.7 | 24.9 [16.5, 33.3] | 10 / 0 | 10 | **M** |
| `cancel-mid-stream` | after | 16.8 | 16.8 | 0 [0, 0] | 0 / 0 | 10 |  |
| `hostile/huge-table` | before | 66.7 | 66.7 | 0 [-0, 8.4] | 4 / 2 | 10 |  |
| `hostile/huge-table` | after | 66.6 | 66.7 | 16.6 [0.1, 16.7] | 8 / 0 | 10 | **M** |

#### webkit: Submit to render-complete (ms)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 5866 | 5866 | -3.5 [-41, 5.5] | 5 / 5 | 10 |  |
| `long-markdown` | after | 5910 | 5896 | -19 [-33, 0.5] | 2 / 8 | 10 |  |
| `cancel-mid-stream` | before | 86834 | 86848 | -5.5 [-15, 49] | 4 / 6 | 10 |  |
| `cancel-mid-stream` | after | 86907 | 86899 | -5.5 [-17, 1] | 3 / 7 | 10 |  |
| `hostile/huge-table` | before | 1144 | 1162 | 12.5 [0.5, 25.5] | 8 / 2 | 10 | **M** |
| `hostile/huge-table` | after | 1133 | 1156 | 19 [6, 26] | 8 / 2 | 10 | **M** |

#### webkit: Render lag after settle (ms)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 2 | 0 | -2 [-3, -0.5] | 0 / 8 | 10 | **M** |
| `long-markdown` | after | 2.5 | 0 | -2.5 [-3.5, 0] | 0 / 7 | 10 |  |
| `cancel-mid-stream` | before | 3 | 0 | -3 [-3, -2.5] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | after | 3 | 0 | -3 [-3, -2.5] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | before | 61 | 0 | -61 [-66, -59] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | after | 57 | 0 | -57 [-59, -18] | 0 / 10 | 10 | **M** |

#### webkit: Time to first token (ms)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 86.5 | 20 | -65.5 [-70, -60] | 0 / 10 | 10 | **M** |
| `long-markdown` | after | 69.5 | 19 | -51.5 [-55, -40] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | before | 70 | 11 | -59 [-60.5, -59] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | after | 72.5 | 10 | -62 [-63, -61] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | before | 43.5 | 21.5 | -22 [-24.5, -21] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | after | 40.5 | 20 | -20.5 [-21, -19.5] | 0 / 10 | 10 | **M** |

#### webkit: Dropped frames (rAF deltas, 60 Hz) (frames)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 3 | 69 | 65 [64, 67] | 10 / 0 | 10 | **M** |
| `long-markdown` | after | 1.5 | 0 | -1.5 [-2.5, -1] | 0 / 9 | 10 | **M** |
| `cancel-mid-stream` | before | 26.5 | 84 | 59 [52, 64] | 10 / 0 | 10 | **M** |
| `cancel-mid-stream` | after | 4 | 5.5 | 1.5 [-2, 3] | 6 / 3 | 10 |  |
| `hostile/huge-table` | before | 25 | 14.5 | -9 [-10, -8] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | after | 20.5 | 14 | -4.5 [-6.5, -1] | 2 / 8 | 10 | **M** |

#### webkit: Input latency, per-run median (keydown to next paint, in-stream) (ms)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 11.5 | 11.5 | -0.5 [-3, 2] | 5 / 5 | 10 |  |
| `long-markdown` | after | 10.3 | 10 | -0.5 [-1, 0.3] | 2 / 6 | 10 |  |
| `cancel-mid-stream` | before | 9 | 10 | 1 [1, 2] | 9 / 0 | 10 | **M** |
| `cancel-mid-stream` | after | 10 | 10 | 0 [0, 1] | 4 / 0 | 10 |  |
| `hostile/huge-table` | before | 46.5 | 34.5 | -12 [-21.8, -6.8] | 1 / 9 | 10 | **M** |
| `hostile/huge-table` | after | 21.8 | 39.5 | 12 [8.8, 23.3] | 9 / 1 | 10 | **M** |

#### webkit: Input latency, per-run worst (in-stream) (ms)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 23 | 933 | 908 [885, 1112] | 10 / 0 | 10 | **M** |
| `long-markdown` | after | 20.5 | 22 | 2 [-1, 4] | 7 / 3 | 10 |  |
| `cancel-mid-stream` | before | 24.5 | 965 | 939 [925, 966] | 10 / 0 | 10 | **M** |
| `cancel-mid-stream` | after | 23.5 | 25.5 | 1 [-5, 3] | 6 / 3 | 10 |  |
| `hostile/huge-table` | before | 66 | 83 | 12.5 [-13.5, 52] | 6 / 4 | 10 |  |
| `hostile/huge-table` | after | 50.5 | 85.5 | 38 [1, 66.5] | 8 / 2 | 10 | **M** |

#### webkit: Worst animation frame (rAF delta) (ms)

| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|---|
| `long-markdown` | before | 39 | 1113 | 1074 [1067, 1085] | 10 / 0 | 10 | **M** |
| `long-markdown` | after | 30 | 21.5 | -8 [-10.5, -5] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | before | 47.5 | 898 | 843 [587, 950] | 10 / 0 | 10 | **M** |
| `cancel-mid-stream` | after | 40 | 26 | -11.5 [-17, -8] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | before | 52.5 | 66 | 14.5 [10.5, 18] | 10 / 0 | 10 | **M** |
| `hostile/huge-table` | after | 47 | 64 | 17 [13, 65] | 10 / 0 | 10 | **M** |
