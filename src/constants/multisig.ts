/**
 * Hardcoded multisig configuration for QA testing
 *
 * This is a 2-of-5 multisig configuration with pre-generated pubkeys and seeds
 * Based on wallet-lib test data from wallet-precalculation.helper.ts
 */

export const MULTISIG_CONFIG = {
  /** Extended public keys for all 5 participants */
  pubkeys: [
    'xpub6CvvCBtHqFfErbcW2Rv28TmZ3MqcFuWQVKGg8xDzLeAwEAHRz9LBTgSFSj7B99scSvZGbq6TxAyyATA9b6cnwsgduNs9NGKQJnEQr3PYtwK',
    'xpub6CA16g2qPwukWAWBMdJKU3p2fQEEi831W3WAs2nesuCzPhbrG29aJsoRDSEDT4Ac3smqSk51uuv6oujU3MAAL3d1Nm87q9GDwE3HRGQLjdP',
    'xpub6BwNT613Vzy7ARVHDEpoX23SMBEZQMJXdqTWYjQKvJZJVDBjEemU38exJEhc6qbFVc4MmarN68gUKHkyZ3NEgXXCbWtoXXGouHpwMEcXJLf',
    'xpub6DCyPHg4AwXsdiMh7QSTHR7afmNVwZKHBBMFUiy5aCYQNaWp68ceQXYXCGQr5fZyLAe5hiJDdXrq6w3AXzvVmjFX9F7EdM87repxJEhsmjL',
    'xpub6CgPUcCCJ9pAK7Rj52hwkxTutSRv91Fq74Hx1SjN62eg6Mp3S3YCJFPChPaDjpp9jCbCZHibBgdKnfNdq6hE9umyjyZKUCySBNF7wkoG4uK',
  ],

  /** Number of signatures required (2-of-5) */
  numSignatures: 2,

  /** Seed phrases for each participant wallet */
  seeds: [
    'upon tennis increase embark dismiss diamond monitor face magnet jungle scout salute rural master shoulder cry juice jeans radar present close meat antenna mind',
    'sample garment fun depart various renew require surge service undo cinnamon squeeze hundred nasty gasp ridge surge defense relax turtle wet antique october occur',
    'intact wool rigid diary mountain issue tiny ugly swing rib alone base fold satoshi drift poverty autumn mansion state globe plug ancient pudding hope',
    'monster opinion bracket aspect mask labor obvious hat matrix exact canoe race shift episode plastic debris dash sort motion juice leg mushroom maximum evidence',
    'tilt lab swear uncle prize favorite river myth assault transfer venue soap lady someone marine reject fork brain swallow notice glad salt sudden pottery',
  ],

  /** Friendly names for each participant */
  participantNames: [
    'Alice',
    'Bob',
    'Carol',
    'Dave',
    'Eve',
  ],
} as const;

/** Total number of participants in the multisig */
export const MULTISIG_TOTAL_PARTICIPANTS = MULTISIG_CONFIG.seeds.length;

/** Minimum number of signatures required */
export const MULTISIG_MIN_SIGNATURES = MULTISIG_CONFIG.numSignatures;
