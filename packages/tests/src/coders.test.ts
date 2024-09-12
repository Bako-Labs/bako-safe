import { bakoCoder, SignatureType } from 'bakosafe/src/modules';
import { WebAuthn } from './utils';
import { Address, Wallet } from 'fuels';
import { accounts } from './mocks';

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
    const fuelBytes = '0000000000000001';
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
    expect(encoded).toContain(fuelBytes);
    expect(encoded).toContain(fuelSignature.slice(2));
  });

  it('Should Webauthn encode a signature successfully', async () => {
    const webAuthnCredential = WebAuthn.createCredentials();
    const webAuthnBytes = '0000000000000000';
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
    expect(encoded).toContain(webAuthnBytes);
    expect(encoded).toContain(sign.signature.slice(2));
  });
});
