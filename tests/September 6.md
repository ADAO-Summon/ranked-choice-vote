
# CC Workshop Testing Feedback Form

## 1. Browser Compatibility Testing

Any issues related to background color, UI design, text overflow, or other UI related issues should be marked as [ ] and notes should be taken about what failed where so that a GitHub issue can be created and resolved.

### Previous and Open Issues should be reviewed upon each production deployment.

Previous Issues: https://github.com/ADAO-Summon/intersect-workshops/issues?q=is%3Aissue+is%3Aclosed
Open Issues: https://github.com/ADAO-Summon/intersect-workshops/issues?q=is%3Aissue+is%3Aopen+

### Chrome

| Feature | iPhone | Android | Desktop |
|---------|--------|---------|---------|
| Login | [PASS] | [ ] | [PASS] |
| Registration | [PASS] | [ ] | [PASS] |
| Voting | [PASS] | [ ] | [PASS] |
| Admin Dashboard | [FAIL] | [ ] | [PASS] |

### Firefox

| Feature | iPhone | Android | Desktop |
|---------|--------|---------|---------|
| Login | [PASS] | [ ] | [PASS] |
| Registration | [PASS] | [ ] | [PASS] |
| Voting | [PASS] | [ ] | [PASS] |
| Admin Dashboard | [FAIL] | [ ] | [PASS] |

### Safari

| Feature | iPhone | Desktop |
|---------|--------|---------|
| Login | [PASS] | [PASS] |
| Registration | [PASS] | [PASS] |
| Voting | [PASS] | [PASS] |
| Admin Dashboard | [FAIL] | [FAIL] |

### Edge

| Feature | Android | Desktop |
|---------|---------|---------|
| Login | [ ] | [ ] |
| Registration | [ ] | [ ] |
| Voting | [ ] | [ ] |
| Admin Dashboard | [ ] | [ ] |

### Brave

| Feature | iPhone | Android | Desktop |
|---------|--------|---------|---------|
| Login | [PASS] | [ ] | [PASS] |
| Registration | [PASS] | [ ] | [PASS] |
| Voting | [PASS] | [ ] | [PASS] |
| Admin Dashboard | [FAIL] | [ ] | [PASS] |

**Instructions:** For each cell, replace [ ] with [x] if the page displays correctly and all actions can be performed as expected. If it remains [ ], create a GitHub issue detailing what failed, so it can be added to the test plan as something to explicitly check for in the future, then fix it.

## 2. Voting Scenarios

[ALL VOTING SCENARIOS BELOW CURRENTLY WORK AS EXPECTED]

### Scenario 1: Simple Majority

Round 1: (Winners in-order: C1, C2, C3, C4, C5)

| Place | V1 | V2 | V3 | V4 | V5 |
|-------|----|----|----|----|----| 
| 1 | C1 | C1 | C1 | C1 | C1 |
| 2 | C2 | C2 | C2 | C2 | C2 |
| 3 | C3 | C3 | C3 | C3 | C3 |
| 4 | C4 | C4 | C4 | C4 | C4 |
| 5 | C5 | C5 | C5 | C5 | C5 |

### Scenario 2: Tie-Breaker (Series of 2 rounds)

Round 1 (Result: 5 Way Tie)

| Place | V1 | V2 | V3 | V4 | V5 |
|-------|----|----|----|----|----| 
| 1 | C1 | C2 | C3 | C4 | C5 |
| 2 | C2 | C3 | C4 | C5 | C1 |
| 3 | C3 | C4 | C5 | C1 | C2 |
| 4 | C4 | C5 | C1 | C2 | C3 |
| 5 | C5 | C1 | C2 | C3 | C4 |

Round 2 (Tie Breaker) (Winners in-order: C1, C2, C3, C4, C5)

| Place | V1 | V2 | V3 | V4 | V5 |
|-------|----|----|----|----|----| 
| 1 | C1 | C1 | C1 | C1 | C1 |
| 2 | C2 | C2 | C2 | C2 | C2 |
| 3 | C3 | C3 | C3 | C3 | C3 |
| 4 | C4 | C4 | C4 | C4 | C4 |
| 5 | C5 | C5 | C5 | C5 | C5 |

### Scenario 3: 2nd Place Tie Resolved

Round 1 (Result: 2nd Place Tie between C2 & C3)

| Place | V1 | V2 | V3 | V4 | V5 |
|-------|----|----|----|----|----| 
| 1 | C1 | C1 | C1 | C1 | C1 |
| 2 | C2 | C3 | C2 | C3 | C5 |
| 3 | C3 | C2 | C3 | C2 | C4 |
| 4 | C4 | C4 | C4 | C4 |    |
| 5 | C5 | C5 | C5 | C5 |    |

Round 2 (C2 Wins for 2nd Place; Final Result: C1, C2, C3, C4, C5)

| Place | V1 | V2 | V3 | V4 | V5 |
|-------|----|----|----|----|----| 
| 1 | C2 | C3 | C2 | C3 | C2 |

### Scenario 4: 2nd Place Tie, Coin-Flip

Round 1 (Result: 2nd Place Tie between C2 & C3)

| Place | V1 | V2 | V3 | V4 | V5 |
|-------|----|----|----|----|----| 
| 1 | C1 | C1 | C1 | C1 | C1 |
| 2 | C2 | C3 | C2 | C3 | C5 |
| 3 | C3 | C2 | C3 | C2 | C4 |
| 4 | C4 | C4 | C4 | C4 |    |
| 5 | C5 | C5 | C5 | C5 |    |

Round 2 (Tie Between C2 and C3)

| Place | V1 | V2 | V3 | V4 | V5 |
|-------|----|----|----|----|----| 
| 1 | C2 | C3 | C2 | C3 |    |

Coin-flip determines the 2nd place candidate, otherwise the result is the same as in scenario 3.

**Instructions:** 
For each scenario, document the expected outcome and compare it with the actual result produced by the voting software. Only display results up to and including 5th place.
