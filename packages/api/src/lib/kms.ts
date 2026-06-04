import {
  KMSClient,
  EncryptCommand,
  DecryptCommand,
  GenerateDataKeyCommand,
} from '@aws-sdk/client-kms';

let kmsClient: KMSClient | undefined;

function getClient(): KMSClient {
  if (!kmsClient) {
    kmsClient = new KMSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
  }
  return kmsClient;
}

/**
 * Encrypt a short plaintext (PII field like SSN-last4, DOB, address line).
 * Returns a base64-encoded ciphertext blob suitable for a `text` DB column.
 *
 * For larger payloads (KYC document scans), prefer envelope encryption with
 * GenerateDataKey + a local AES-GCM cipher.
 */
export async function encryptField(plaintext: string): Promise<string> {
  const keyId = process.env.AWS_KMS_KEY_ID;
  if (!keyId) throw new Error('AWS_KMS_KEY_ID not set');
  const res = await getClient().send(
    new EncryptCommand({
      KeyId: keyId,
      Plaintext: new TextEncoder().encode(plaintext),
      EncryptionContext: { purpose: 'pii_field' },
    }),
  );
  if (!res.CiphertextBlob) throw new Error('KMS encrypt returned empty ciphertext');
  return Buffer.from(res.CiphertextBlob).toString('base64');
}

export async function decryptField(ciphertextB64: string): Promise<string> {
  const res = await getClient().send(
    new DecryptCommand({
      CiphertextBlob: Buffer.from(ciphertextB64, 'base64'),
      EncryptionContext: { purpose: 'pii_field' },
    }),
  );
  if (!res.Plaintext) throw new Error('KMS decrypt returned empty plaintext');
  return new TextDecoder().decode(res.Plaintext);
}

export async function generateDataKey(): Promise<{ plaintextKey: Uint8Array; encryptedKey: string }> {
  const keyId = process.env.AWS_KMS_KEY_ID;
  if (!keyId) throw new Error('AWS_KMS_KEY_ID not set');
  const res = await getClient().send(
    new GenerateDataKeyCommand({ KeyId: keyId, KeySpec: 'AES_256' }),
  );
  if (!res.Plaintext || !res.CiphertextBlob) {
    throw new Error('KMS generate data key returned incomplete result');
  }
  return {
    plaintextKey: res.Plaintext,
    encryptedKey: Buffer.from(res.CiphertextBlob).toString('base64'),
  };
}
