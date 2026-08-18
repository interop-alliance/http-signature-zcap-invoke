# Agent Guidelines — http-signature-zcap-invoke

## Project Overview

`@digitalbazaar/http-signature-zcap-invoke` is an ESM-only JavaScript library
(Node.js >= 20, modern browsers) that signs HTTP requests to invoke
[Authorization Capabilities (zCaps)](https://w3c-ccg.github.io/zcap-spec/).
It produces the `capability-invocation` and `authorization` headers required
by the companion verifier (`@digitalbazaar/http-signature-zcap-verify`).

This is a **signing-only** library. Verification lives in the separate
`http-signature-zcap-verify` package.

## Architecture

### Source Files

```
lib/
  index.js          Public API — exports signCapabilityInvocation
  util.js           Node.js helpers: base64Encode, base64urlEncode, isBrowser=false
  util-browser.js   Browser shim (same API, uses btoa / Uint8Array.toBase64)
```

The `browser` field in `package.json` swaps `util.js` → `util-browser.js` at
bundle time.

### Public API

```js
import {
  signCapabilityInvocation
} from '@digitalbazaar/http-signature-zcap-invoke';

const signedHeaders = await signCapabilityInvocation({
  url,              // string — invocation target (also sets `host` header)
  method,           // string — HTTP method
  headers,          // object — existing request headers (keys are lowercased)
  body,             // Blob | Uint8Array — request body (mutually exclusive with json)
  json,             // object — JSON body (mutually exclusive with body)
  capability,       // string | object — root zcap ID string or delegated zcap object
                    //   defaults to root zcap: urn:zcap:root:<encodeURIComponent(url)>
  capabilityAction, // string — action to perform (e.g. 'read', 'write')
  invocationSigner, // { id: string, sign: ({data}) => Promise<Uint8Array> }
  created,          // string|Date|number — unix timestamp; defaults to now
  expires,          // string|Date|number — unix timestamp; defaults to created+600
});
// returns the mutated (lowercased) headers object with added:
//   capability-invocation, authorization, digest (if body/json given), content-type
```

### Capability encoding

- **Root zcap** (`capability` is a string, or an object without
  `parentCapability`):
  header is `zcap id="<id>"`.
- **Delegated zcap** (`capability` is an object with `parentCapability`):
  header is `zcap capability="<base64url(gzip(JSON.stringify(cap)))>"`.

`capabilityAction` is always appended as `,action="<action>"`.

### Signed headers

The HTTP signature always covers:
`(key-id)`, `(created)`, `(expires)`, `(request-target)`, `host`,
`capability-invocation`, and optionally `content-type` and `digest` when a
body is present.

In browser environments, `host` is removed from the returned headers (browsers
set it automatically).

### Body handling

| `body` type         | `content-type` inferred as |
|---------------------|----------------------------|
| `Blob` with `.type` | `blob.type`                |
| `Blob` without type | not set                    |
| `Uint8Array`        | `application/octet-stream` |
| `json` object       | `application/json`         |

If `digest` is already in the incoming headers it is preserved as-is and not
recomputed.

### Dependencies

| Package                                | Role                                                         |
|----------------------------------------|--------------------------------------------------------------|
| `@digitalbazaar/http-signature-header` | Builds the `Authorization` header string and signature input |
| `@digitalbazaar/http-digest-header`    | Computes the `Digest` header (multihash)                     |
| `pako`                                 | gzip compression for delegated zcap object                   |

## Testing

```sh
npm test              # Node.js (mocha)
npm run test-karma    # Browser (karma + webpack)
npm run coverage      # c8 coverage report
npm run lint          # ESLint
```

Tests live in `tests/`. `10-sign.spec.js` covers both positive and negative
cases for `signCapabilityInvocation` and round-trips each signed request
through `@digitalbazaar/http-signature-zcap-verify` to confirm verifiability.

## Conventions

- ESM only (`"type": "module"`); no CommonJS shims.
- No transpilation — source runs directly in Node >= 20 and modern browsers.
- All header keys are lowercased before processing.
- Root zcap `id` convention: `urn:zcap:root:${encodeURIComponent(url)}`.
- Root zcap objects (no `parentCapability`) are treated as root invocations —
  only the `.id` is used in the header.
- Default signature window: created → created + 600 seconds (10 minutes).
- The `invocationSigner` interface matches `@digitalbazaar/ed25519-multikey`'s
  `.signer()` return value: `{ id, sign({data}) }`.