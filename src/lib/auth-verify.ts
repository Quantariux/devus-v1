import crypto from "crypto";

const GOOGLE_PUBLIC_KEYS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gen-lang-client-0276152407";

let cachedKeys: Record<string, string> = {};
let cacheExpiry = 0;

async function fetchGooglePublicKeys(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < cacheExpiry && Object.keys(cachedKeys).length > 0) {
    return cachedKeys;
  }
  try {
    const res = await fetch(GOOGLE_PUBLIC_KEYS_URL);
    const data = await res.json();
    const cacheControl = res.headers.get("cache-control");
    let maxAge = 3600; // default to 1 hour
    if (cacheControl) {
      const match = cacheControl.match(/max-age=(\d+)/);
      if (match) maxAge = parseInt(match[1], 10);
    }
    cachedKeys = data;
    cacheExpiry = now + maxAge * 1000;
    return cachedKeys;
  } catch (err) {
    console.error("Failed to fetch Google public keys:", err);
    return cachedKeys;
  }
}

export interface DecodedToken {
  uid: string;
  email?: string;
  [key: string]: unknown;
}

export async function verifyIdToken(token: string | null): Promise<DecodedToken | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    // Decode Header
    const headerJson = Buffer.from(headerB64, "base64url").toString("utf8");
    const header = JSON.parse(headerJson);
    const kid = header.kid;
    if (!kid) return null;

    // Decode Payload
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson);

    // Verify Claims
    const now = Math.floor(Date.now() / 1000);
    if (payload.iss !== `https://securetoken.google.com/${PROJECT_ID}`) {
      console.warn("Invalid issuer:", payload.iss);
      return null;
    }
    if (payload.aud !== PROJECT_ID) {
      console.warn("Invalid audience:", payload.aud);
      return null;
    }
    if (payload.exp < now) {
      console.warn("Expired token:", payload.exp, "now:", now);
      return null;
    }

    // Fetch Public Keys
    const publicKeys = await fetchGooglePublicKeys();
    const cert = publicKeys[kid];
    if (!cert) {
      console.warn("Matching key not found for kid:", kid);
      return null;
    }

    // Verify Signature
    const signatureInput = `${headerB64}.${payloadB64}`;
    const verified = crypto.verify(
      "sha256",
      Buffer.from(signatureInput),
      cert,
      Buffer.from(signatureB64, "base64url")
    );

    if (!verified) {
      console.warn("Signature verification failed");
      return null;
    }

    return {
      uid: payload.sub,
      email: payload.email,
      ...payload
    };
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}
