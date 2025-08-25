import {
  bakoCoder,
  SignatureType,
  encodeSignature,
  SIGNATURE_TYPE_HEX,
  PREFIX_BAKO_SIG,
} from 'bakosafe';
import { WebAuthn } from './utils';
import { Address, Wallet, hexlify, arrayify, BigNumberCoder } from 'fuels';
import { accounts } from './mocks';
import { ethers } from 'ethers';

const LEGACY_FUEL_PREDICATE_VERSION =
  '0xfdac03fc617c264fa6f325fd6f4d2a5470bf44cfbd33bc11efb3bf8b7ee2e938';

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
    const wallet = Wallet.fromPrivateKey(accounts['USER_1'].privateKey);
    const fuelSignature = await wallet.signMessage(
      Address.fromRandom().toB256(),
    );

    const encoded = bakoCoder.encode({
      type: SignatureType.Fuel,
      signature: fuelSignature,
    });

    expect(encoded).toContain(PREFIX_BAKO_SIG);
    expect(encoded).toContain(SIGNATURE_TYPE_HEX[SignatureType.Fuel]);
    expect(encoded).toContain(fuelSignature.slice(2));
  });

  it('Should Webauthn encode a signature successfully', async () => {
    const webAuthnCredential = WebAuthn.createCredentials();
    const sign = await WebAuthn.signChallenge(
      webAuthnCredential,
      Address.fromRandom().toB256().slice(2),
    );

    const encoded = bakoCoder.encode({
      type: SignatureType.WebAuthn,
      ...sign,
    });

    expect(encoded).toContain(PREFIX_BAKO_SIG);
    expect(encoded).toContain(SIGNATURE_TYPE_HEX[SignatureType.WebAuthn]);
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

    expect(encoded).toContain(PREFIX_BAKO_SIG);
    expect(encoded).toContain(SIGNATURE_TYPE_HEX[SignatureType.Evm]);
    expect(encoded).toContain(expectedCompact.slice(2));
  });

  it('Should encode RawNoPrefix without BAKO prefix or type bytes', () => {
    const signature = '0x' + 'bb'.repeat(64);
    const expected = hexlify(arrayify(signature));

    const encoded = bakoCoder.encode({
      type: SignatureType.RawNoPrefix,
      signature,
    });

    expect(encoded).toBe(expected);
    expect(encoded).not.toContain(PREFIX_BAKO_SIG);
    expect(encoded).not.toContain(
      SIGNATURE_TYPE_HEX[SignatureType.RawNoPrefix],
    );
  });
});

describe('[SIGNATURE ENCODER]', () => {
  it('Should encode Fuel signature with default predicate version', async () => {
    const wallet = Wallet.fromPrivateKey(accounts['USER_1'].privateKey);
    const message = Address.fromRandom().toB256();
    const signature = await wallet.signMessage(message);

    const encoded = encodeSignature(wallet.address.toB256(), signature);

    expect(encoded).toContain(PREFIX_BAKO_SIG);
    expect(encoded).toContain(SIGNATURE_TYPE_HEX[SignatureType.Fuel]);
    expect(encoded).toContain(signature.slice(2));
  });

  it('Should encode EVM signature with EVM address', async () => {
    const wallet = Wallet.fromPrivateKey(accounts['USER_2'].privateKey);
    const message = Address.fromRandom().toB256();
    const signature = await wallet.signMessage(message);

    const evmAddress =
      '0x000000000000000000000000742d35Cc6335C0532FDD5d9dA5Ac5Cd6C3f776a';

    const encoded = encodeSignature(evmAddress, signature);

    expect(encoded).toContain(PREFIX_BAKO_SIG);
    expect(encoded).toContain(SIGNATURE_TYPE_HEX[SignatureType.Evm]);
    expect(encoded).toContain(signature.slice(2));
  });

  it('Should encode Fuel signature with Fuel predicate version', async () => {
    const wallet = Wallet.fromPrivateKey(accounts['USER_3'].privateKey);
    const message = Address.fromRandom().toB256();
    const signature = await wallet.signMessage(message);
    const fuelVersion =
      '0x0ec304f98efc18964de98c63be50d2360572a155b16bcb0f3718c685c70a00aa';

    const encoded = encodeSignature(
      wallet.address.toB256(),
      signature,
      fuelVersion,
    );

    expect(encoded).toContain(PREFIX_BAKO_SIG);
    expect(encoded).toContain(SIGNATURE_TYPE_HEX[SignatureType.Fuel]);
    expect(encoded).toContain(signature.slice(2));
  });

  it('Should handle signature object format', async () => {
    const wallet = Wallet.fromPrivateKey(accounts['USER_2'].privateKey);
    const message = Address.fromRandom().toB256();
    const signature = await wallet.signMessage(message);
    const signatureObj = { signature };

    const encoded = encodeSignature(wallet.address.toB256(), signatureObj);

    expect(encoded).toContain(PREFIX_BAKO_SIG);
    expect(encoded).toContain(SIGNATURE_TYPE_HEX[SignatureType.Fuel]); // wallet Fuel
    expect(encoded).toContain(signature.slice(2));
  });

  it('Should handle Uint8Array signature', async () => {
    const wallet = Wallet.fromPrivateKey(accounts['USER_3'].privateKey);
    const message = Address.fromRandom().toB256();
    const signature = await wallet.signMessage(message);
    const signatureBytes = arrayify(signature);

    const encoded = encodeSignature(wallet.address.toB256(), signatureBytes);

    expect(encoded).toContain(PREFIX_BAKO_SIG);
    expect(encoded).toContain(SIGNATURE_TYPE_HEX[SignatureType.Fuel]); // wallet Fuel
    expect(encoded).toContain(signature.slice(2));
  });

  it('Should encode WebAuthn signature correctly', async () => {
    const webAuthnCredential = WebAuthn.createCredentials();
    const challenge = Address.fromRandom().toB256().slice(2);
    const signResult = await WebAuthn.signChallenge(
      webAuthnCredential,
      challenge,
    );

    const encoded = encodeSignature(webAuthnCredential.address, signResult);

    expect(encoded).toContain(PREFIX_BAKO_SIG);
    expect(encoded).toContain(SIGNATURE_TYPE_HEX[SignatureType.WebAuthn]);
    expect(encoded).toContain(signResult.signature.slice(2));
    expect(encoded).toContain(signResult.prefix.slice(2));
    expect(encoded).toContain(signResult.suffix.slice(2));
    expect(encoded).toContain(signResult.authData.slice(2));
  });

  it('Should throw error for unsupported predicate version', async () => {
    const wallet = Wallet.fromPrivateKey(accounts['USER_1'].privateKey);
    const message = Address.fromRandom().toB256();
    const signature = await wallet.signMessage(message);
    const invalidVersion = '0xinvalid';

    expect(() => {
      encodeSignature(wallet.address.toB256(), signature, invalidVersion);
    }).toThrow(`Predicate version ${invalidVersion} not found`);
  });

  it('Should sign with legacy Fuel predicate version', async () => {
    const wallet = Wallet.fromPrivateKey(accounts['USER_1'].privateKey);
    const message = Address.fromRandom().toB256();
    const signature = await wallet.signMessage(message);

    const encoded = encodeSignature(
      wallet.address.toB256(),
      signature,
      LEGACY_FUEL_PREDICATE_VERSION,
    );

    expect(encoded).not.toContain(PREFIX_BAKO_SIG);
    expect(encoded).not.toContain(SIGNATURE_TYPE_HEX[SignatureType.Fuel]);
    expect(encoded).toContain(signature.slice(2));
  });

  it('Should preserve signature integrity across different formats', async () => {
    const wallet = Wallet.fromPrivateKey(accounts['USER_3'].privateKey);
    const message = Address.fromRandom().toB256();
    const originalSignature = await wallet.signMessage(message);

    // Testar diferentes formatos de entrada
    const formats = [
      originalSignature,
      { signature: originalSignature },
      arrayify(originalSignature),
    ];

    const encoded = formats.map((format) =>
      encodeSignature(wallet.address.toB256(), format),
    );

    // Todos devem conter a mesma assinatura original
    encoded.forEach((encodedSig) => {
      expect(encodedSig).toContain(originalSignature.slice(2));
    });
  });

  it('Should encode different wallet types correctly', async () => {
    const fuelWallet1 = Wallet.fromPrivateKey(accounts['USER_1'].privateKey);
    const fuelWallet2 = Wallet.fromPrivateKey(accounts['USER_2'].privateKey);

    const message1 = Address.fromRandom().toB256();
    const message2 = Address.fromRandom().toB256();

    const signature1 = await fuelWallet1.signMessage(message1);
    const signature2 = await fuelWallet2.signMessage(message2);

    const evmAddress =
      '0x000000000000000000000000742d35Cc6335C0532FDD5d9dA5Ac5Cd6C3f776a';

    const encodedFuel = encodeSignature(
      fuelWallet1.address.toB256(),
      signature1,
    );
    const encodedEvm = encodeSignature(evmAddress, signature2);

    // Ambos devem ter prefixo BAKO mas tipos diferentes
    expect(encodedFuel).toContain(PREFIX_BAKO_SIG);
    expect(encodedEvm).toContain(PREFIX_BAKO_SIG);

    // Verificar tipos diferentes
    expect(encodedFuel).toContain(SIGNATURE_TYPE_HEX[SignatureType.Fuel]);
    expect(encodedEvm).toContain(SIGNATURE_TYPE_HEX[SignatureType.Evm]);
  });

  it('Should handle multiple signatures from same wallet consistently', async () => {
    const wallet = Wallet.fromPrivateKey(accounts['USER_1'].privateKey);
    const messages = [
      Address.fromRandom().toB256(),
      Address.fromRandom().toB256(),
      Address.fromRandom().toB256(),
    ];

    const signatures = await Promise.all(
      messages.map((msg) => wallet.signMessage(msg)),
    );

    const encoded = signatures.map((sig) =>
      encodeSignature(wallet.address.toB256(), sig),
    );

    // Todas devem ter o mesmo prefixo e tipo
    encoded.forEach((encodedSig) => {
      expect(encodedSig).toContain(PREFIX_BAKO_SIG);
      expect(encodedSig).toContain(SIGNATURE_TYPE_HEX[SignatureType.Fuel]);
    });

    // Mas devem ser diferentes por causa das assinaturas diferentes
    expect(new Set(encoded)).toHaveProperty('size', 3);
  });
});
