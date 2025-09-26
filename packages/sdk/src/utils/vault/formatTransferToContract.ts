import {
  Address,
  arrayify,
  ASSET_ID_LEN,
  BigNumberCoder,
  BN,
  BytesLike,
  concat,
  CONTRACT_ID_LEN,
  FuelAsm,
  WORD_SIZE,
} from 'fuels';

export interface AssembleTransferToContractParams {
  contractId: string;
  assetId: BytesLike;
  amount: BN;
}

export const formatTransferToContractScriptData = (
  transferParams: Array<AssembleTransferToContractParams>,
) => {
  const numberCoder = new BigNumberCoder('u64');
  // @ts-ignore create a custom script data --- IGNORE ---
  return transferParams.reduce((acc, transferParam) => {
    const { assetId, amount, contractId } = transferParam;
    const encoded = numberCoder.encode(amount);
    const scriptData = concat([
      new Address(contractId).toBytes(),
      encoded,
      arrayify(assetId),
    ]);
    return concat([acc, scriptData]);
  }, new Uint8Array());
};

export const assembleTransferToContractScript = async (
  transferParams: Array<AssembleTransferToContractParams>,
) => {
  const scriptData = formatTransferToContractScriptData(transferParams);

  // @ts-ignore method reference missing in DTS
  await FuelAsm.initWasm();

  let script = new Uint8Array();

  transferParams.forEach((_, i) => {
    const offset = (CONTRACT_ID_LEN + WORD_SIZE + ASSET_ID_LEN) * i;

    // @ts-ignore update script for each contract transfer --- IGNORE ---
    script = concat([
      script,
      // Load ScriptData into register 0x10.
      FuelAsm.gtf(0x10, 0x0, FuelAsm.GTFArgs.ScriptData).to_bytes(),
      // Add the offset to 0x10 so it will point to the current contract ID, store in 0x11.
      FuelAsm.addi(0x11, 0x10, offset).to_bytes(),
      // Add CONTRACT_ID_LEN to 0x11 to point to the amount in the ScriptData, store in 0x12.
      FuelAsm.addi(0x12, 0x11, CONTRACT_ID_LEN).to_bytes(),
      // Load word to the amount at 0x12 into register 0x13.
      FuelAsm.lw(0x13, 0x12, 0x0).to_bytes(),
      // Add WORD_SIZE to 0x12 to point to the asset ID in the ScriptData, store in 0x14.
      FuelAsm.addi(0x14, 0x12, WORD_SIZE).to_bytes(),
      // Perform the transfer using contract ID in 0x11, amount in 0x13, and asset ID in 0x14.
      FuelAsm.tr(0x11, 0x13, 0x14).to_bytes(),
    ]);
  });

  // Add return instruction at the end of the script
  // @ts-ignore update script for each contract transfer --- IGNORE ---
  script = concat([script, FuelAsm.ret(0x1).to_bytes()]);

  return { script, scriptData };
};
