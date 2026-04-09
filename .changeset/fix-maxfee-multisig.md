---
"bakosafe": patch
---

fix: revert predicateGasUsed change and increase maxFee multiplier to 10x

Reverts the 0.6.4 change that set predicateGasUsed on inputs (caused OutOfGas
by preventing estimatePredicates from recalculating). Restores the original
logic with predicateGasUsed=undefined and increases the multiplier from 2.5x
to 10x to cover vmInitialization and contractRoot costs that are not included
in the separate predicate fee calculation.
