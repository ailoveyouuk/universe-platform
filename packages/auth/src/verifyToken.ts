import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

// Avoids importing jwks-rsa's own client type by name (its TS export
// surface has shifted across versions) — derived instead from the factory
// function's own return type, which is always correct for whatever version
// is installed.
type JwksClient = ReturnType<typeof jwksClient>;

interface OidcDiscoveryDocument {
  issuer: string;
  jwks_uri: string;
}

// Discovery documents are cached per discovery URL for the lifetime of the
// process, not re-fetched per request/token. Microsoft's own guidance is to
// fetch issuer/jwks_uri dynamically rather than hardcode them (verified
// directly against universeplatform.ciamlogin.com on 2026-09-25 — the real
// issuer for that tenant is
// "https://23851fd3-0682-4268-af83-338cfea80d89.ciamlogin.com/23851fd3-0682-4268-af83-338cfea80d89/v2.0",
// which does NOT match the friendly-subdomain pattern you'd get by just
// swapping login.microsoftonline.com for ciamlogin.com — reading it from
// the discovery document rather than constructing it is what makes this
// correct, not just tidy). A failed fetch is not cached, so the next
// verification attempt retries rather than being stuck on a transient
// failure for the process's lifetime.
const discoveryCache = new Map<string, Promise<OidcDiscoveryDocument>>();

async function getDiscoveryDocument(discoveryUrl: string): Promise<OidcDiscoveryDocument> {
  const cached = discoveryCache.get(discoveryUrl);
  if (cached) return cached;

  const pending = fetch(discoveryUrl)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`OIDC discovery fetch failed: ${res.status} ${res.statusText} (${discoveryUrl})`);
      }
      return res.json() as Promise<OidcDiscoveryDocument>;
    })
    .catch((err) => {
      discoveryCache.delete(discoveryUrl);
      throw err;
    });

  discoveryCache.set(discoveryUrl, pending);
  return pending;
}

/**
 * Server-side (API) verification of a token issued by the Universe CIAM
 * tenant (Microsoft Entra External ID). Used by the API service's auth
 * middleware — see apps/api/src/auth/entra-auth.guard.ts.
 *
 * Entra External ID (CIAM) tenants use a ciamlogin.com authority, not
 * login.microsoftonline.com, and their issuer/JWKS URLs are resolved via
 * the tenant's own OIDC discovery document rather than a fixed pattern —
 * see the discoveryCache comment above for why this matters in practice,
 * not just per Microsoft's documented best practice.
 */
export function createTokenVerifier(params: {
  tenantId: string;
  audience: string;
  /**
   * The tenant's subdomain — the part before ".ciamlogin.com" /
   * ".onmicrosoft.com", e.g. "universeplatform" for the real Universe CIAM
   * tenant. Required for a real deployment. When omitted, falls back to the
   * plain login.microsoftonline.com workforce-tenant discovery endpoint —
   * local dev only, before UNIVERSE_CIAM_TENANT_SUBDOMAIN is configured —
   * this fallback must never be what a real deployment relies on.
   */
  tenantSubdomain?: string;
}) {
  const discoveryUrl = params.tenantSubdomain
    ? `https://${params.tenantSubdomain}.ciamlogin.com/${params.tenantId}/v2.0/.well-known/openid-configuration`
    : `https://login.microsoftonline.com/${params.tenantId}/v2.0/.well-known/openid-configuration`;

  // One jwks-rsa client per verifier, created lazily once the discovery
  // document resolves. jwks-rsa does its own signing-key-level caching and
  // rate-limiting (cache/rateLimit below), so the discovery-document cache
  // above and this client together mean steady-state token verification
  // does no network I/O of its own beyond the occasional signing-key fetch.
  let jwksClientPromise: Promise<JwksClient> | null = null;
  function getJwksClientForToken(): Promise<JwksClient> {
    if (!jwksClientPromise) {
      jwksClientPromise = getDiscoveryDocument(discoveryUrl).then((doc) =>
        jwksClient({ jwksUri: doc.jwks_uri, cache: true, rateLimit: true }),
      );
    }
    return jwksClientPromise;
  }

  function getKey(header: jwt.JwtHeader, callback: (err: Error | null, key?: string) => void) {
    if (!header.kid) {
      callback(new Error("Token header missing 'kid'"));
      return;
    }
    getJwksClientForToken()
      .then((client) => client.getSigningKey(header.kid as string))
      .then((key) => callback(null, key.getPublicKey()))
      .catch((err) => callback(err instanceof Error ? err : new Error(String(err))));
  }

  return async function verify(token: string): Promise<jwt.JwtPayload> {
    const { issuer } = await getDiscoveryDocument(discoveryUrl);
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          audience: params.audience,
          issuer,
          algorithms: ["RS256"],
        },
        (err, decoded) => {
          if (err || !decoded || typeof decoded === "string") {
            reject(err ?? new Error("Invalid token"));
            return;
          }
          resolve(decoded);
        },
      );
    });
  };
}
