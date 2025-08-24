import { bakoCoder, SignatureType } from 'bakosafe';
import { WebAuthn } from './utils';
import { Address, Wallet, hexlify, arrayify, BigNumberCoder } from 'fuels';
import { accounts } from './mocks';
import { ethers } from 'ethers';

describe('[BAKO CODERS]', () => {
  it('Should return null if coder is not found', () => {
    const coder = bakoCoder.getCoder(12);
    expect(coder).toBeNull();
  });

  it('Should throw an error if encoding with a non-existent coder', () => {
    expect(() =>
      bakoCoder.encode({ type: SignatureType.Fuel, signature: '0xsignature' }),
    ).toThrowError('invalid data: 0xsignature');
  });

  it('Should Fuel encode a signature successfully', async () => {
    const typeBytes = hexlify(
      new BigNumberCoder('u64').encode(SignatureType.Fuel),
    ).slice(2); // "0000000000000001"
    const bakoPrefix = '0x42414b4f';
    const wallet = Wallet.fromPrivateKey(accounts['USER_1'].privateKey);
    const fuelSignature = await wallet.signMessage(
      Address.fromRandom().toB256(),
    );

    const encoded = bakoCoder.encode({
      type: SignatureType.Fuel,
      signature: fuelSignature,
    });

    expect(encoded).toContain(bakoPrefix);
    expect(encoded).toContain(typeBytes);
    expect(encoded).toContain(fuelSignature.slice(2));
  });

  it('Should Webauthn encode a signature successfully', async () => {
    const webAuthnCredential = WebAuthn.createCredentials();
    const typeBytes = hexlify(
      new BigNumberCoder('u64').encode(SignatureType.WebAuthn),
    ).slice(2); // "0000000000000001"
    const bakoPrefix = '0x42414b4f';
    const sign = await WebAuthn.signChallenge(
      webAuthnCredential,
      Address.fromRandom().toB256().slice(2),
    );

    const encoded = bakoCoder.encode({
      type: SignatureType.WebAuthn,
      ...sign,
    });

    expect(encoded).toContain(bakoPrefix);
    expect(encoded).toContain(typeBytes);
    expect(encoded).toContain(sign.signature.slice(2));
  });

  it('Should EVM encode a signature successfully', async () => {
    const wallet = Wallet.fromPrivateKey(accounts['USER_1'].privateKey);
    const msg = Address.fromRandom().toB256();
    const sig = await wallet.signMessage(msg);
    const tampered = (sig.slice(0, -3) + '123') as `0x${string}`;

    const expectedCompact = ethers.Signature.from(tampered).compactSerialized;

    const encoded = bakoCoder.encode({
      type: SignatureType.Evm,
      signature: tampered,
    });

    const bakoPrefix = '0x42414b4f';
    const typeBytes = hexlify(
      new BigNumberCoder('u64').encode(SignatureType.Evm),
    ).slice(2); // "0000000000000002"
    expect(encoded).toContain(bakoPrefix);
    expect(encoded).toContain(typeBytes);
    expect(encoded).toContain(expectedCompact.slice(2));
  });

  it('Should encode RawNoPrefix without BAKO prefix or type bytes', () => {
    const signature = '0x' + 'bb'.repeat(64);
    const expected = hexlify(arrayify(signature));

    const encoded = bakoCoder.encode({
      type: SignatureType.RawNoPrefix,
      signature,
    });

    const bakoPrefix = '0x42414b4f';
    const typeBytes = hexlify(
      new BigNumberCoder('u64').encode(SignatureType.RawNoPrefix),
    ).slice(2); // "0000000000000009"

    expect(encoded).toBe(expected);
    expect(encoded).not.toContain(bakoPrefix);
    expect(encoded).not.toContain(typeBytes);
  });
});
