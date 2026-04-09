---
"bakosafe": patch
---

fix: include predicateGasUsed in fee estimation for multisig vaults

Keep predicateGasUsed on inputs when calling estimateTxGasAndFee so the
node calculates the full transaction cost including predicate execution,
vmInitialization, and contractRoot costs. Previously these were zeroed and
compensated separately, but the separate calculation missed vmInit and
contractRoot costs, causing maxFee to be insufficient for vaults with
many signers (3/5, 5/10, etc).
