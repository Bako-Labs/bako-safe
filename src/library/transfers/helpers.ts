import { Signer, arrayify, hashMessage } from 'fuels';
import { defaultValues } from '../predicates/helpers';

export const transactionScript = arrayify('0x9000000447000000000000000000003c5dfcc00110fff3001a485000910000201a440000724000202849140072400020340004902400000047000000');

export function recoverSigner(signer: string, tx_id: string) {
    if (tx_id == '0x') return;

    const a = Signer.recoverAddress(hashMessage(tx_id), signer);
    return a ? a.toString() : defaultValues['address'];
}

// export function replaceInvalidSignatures(witnesses: string[]) {
//     return witnesses.filter((ass: string) => ass != defaultValues['signature']);
// }

// export function witnessesStatus(witnesses: string[], addresses: string[], tx_id: string) {
//     const signers_done: (string | Address)[] = [];
//     witnesses?.map((item) => {
//         const _signers = recoverSigner(item, tx_id);
//         if (_signers) {
//             signers_done.push(_signers.toString());
//         }
//     });

//     const signers = addresses.filter((item: string) => item != NativeAssetId.toString());

//     return signers.map((item: string) => {
//         return {
//             address: item,
//             status: signers_done.includes(Address.fromB256(item).toString())
//         };
//     });
// }
