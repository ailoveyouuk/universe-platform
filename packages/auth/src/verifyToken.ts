import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

/**
 * Server-side (API) verification of an Entra ID-issued access token.
 * Used by the API service's auth middleware — see apps/api/src/auth.
 */
export function createTokenVerifier(params: { tenantId: string; audience: string }) {
  const client = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${params.tenantId}/discovery/v2.0/keys`,
  });

  function getKey(header: jwt.JwtHeader, callback: (err: Error | null, key?: string) => void) {
    if (!header.kid) {
      callback(new Error("Token header missing 'kid'"));
      return;
    }
    client.getSigningKey(header.kid, (err, key) => {
      if (err || !key) {
        callback(err ?? new Error("Signing key not found"));
        return;
      }
      callback(null, key.getPublicKey());
    });
  }

  return function verify(token: string): Promise<jwt.JwtPayload> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          audience: params.audience,
          issuer: `https://login.microsoftonline.com/${params.tenantId}/v2.0`,
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
