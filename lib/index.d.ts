/*!
 * Copyright (c) 2019-2025 Digital Bazaar, Inc. All rights reserved.
 */

export interface InvocationSigner {
  /** Key ID used to verify the HTTP signature. */
  id: string;
  /** Signs data bytes and returns a signature. */
  sign(options: {data: Uint8Array}): Promise<Uint8Array>;
}

export interface ZCap {
  /** The capability ID. */
  id: string;
  /**
   * Present on delegated zcaps; causes the full object to be
   * gzip-compressed and base64url-encoded into the
   * `capability-invocation` header rather than using only the ID.
   */
  parentCapability?: string;
  [key: string]: unknown;
}

export interface SignedHeaders {
  /** HTTP Signature `Authorization` header. */
  authorization: string;
  /**
   * Zcap invocation header: `zcap id="…"` for root zcaps,
   * `zcap capability="…"` for delegated zcaps.
   */
  'capability-invocation': string;
  /** Body digest header; present when `body` or `json` was provided. */
  digest?: string;
  /**
   * Content-Type header; present when `body` or `json` was provided and
   * not already set by the caller.
   */
  'content-type'?: string;
  [key: string]: string | undefined;
}

export interface SignCapabilityInvocationOptions {
  /** The invocation target URL; also used to derive the `host` header. */
  url: string;
  /** HTTP method (e.g. `'GET'`, `'POST'`). */
  method: string;
  /** Existing request headers; keys are lowercased before processing. */
  headers: Record<string, string>;
  /**
   * Request body. Mutually exclusive with `json`.
   * A `Blob` with a `.type` sets `content-type` automatically;
   * a `Uint8Array` sets `content-type: application/octet-stream`.
   */
  body?: Blob | Uint8Array;
  /**
   * JSON body object. Mutually exclusive with `body`.
   * Sets `content-type: application/json` automatically.
   */
  json?: object;
  /**
   * Root zcap string ID, or a delegated zcap object.
   * Defaults to `urn:zcap:root:<encodeURIComponent(url)>`.
   * Root zcap objects (no `parentCapability`) are treated as root invocations.
   */
  capability?: string | ZCap;
  /** The action to perform with the capability (e.g. `'read'`, `'write'`). */
  capabilityAction: string;
  /**
   * Signer object whose interface matches `@digitalbazaar/ed25519-multikey`'s
   * `.signer()` return value.
   */
  invocationSigner: InvocationSigner;
  /**
   * Signature creation time. Accepts a UNIX timestamp (seconds), a `Date`,
   * or a numeric string. Defaults to the current time.
   */
  created?: string | Date | number;
  /**
   * Signature expiration time. Accepts the same forms as `created`.
   * Defaults to `created + 600` (10 minutes).
   */
  expires?: string | Date | number;
}

/**
 * Signs an HTTP message to invoke a capability.
 *
 * Returns the (mutated) input `headers` object with lowercased keys, augmented
 * with `capability-invocation`, `authorization`, and — when a body is present
 * — `digest` and optionally `content-type`.
 *
 * In browser environments the `host` header is omitted from the returned
 * object (browsers set it automatically).
 */
export function signCapabilityInvocation(
  options: SignCapabilityInvocationOptions
): Promise<SignedHeaders>;
