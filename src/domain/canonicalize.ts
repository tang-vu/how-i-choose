import type { CommunicationProfile } from "@/domain/profile";

const setLikeArrayKeys = new Set(["rules", "signals", "contexts", "disclosures", "contextIds"]);

function compareCanonical(left: unknown, right: unknown): number {
  const leftId = typeof left === "object" && left !== null && "id" in left ? String(left.id) : String(left);
  const rightId = typeof right === "object" && right !== null && "id" in right ? String(right.id) : String(right);
  return leftId.localeCompare(rightId);
}

function canonicalizeValue(value: unknown, parentKey?: string): unknown {
  if (Array.isArray(value)) {
    const values = value.map((item) => canonicalizeValue(item));
    return setLikeArrayKeys.has(parentKey ?? "") ? values.toSorted(compareCanonical) : values;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalizeValue(item, key)]),
    );
  }
  return value;
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalizeValue(value));
}

export async function sha256Hex(canonicalValue: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalValue),
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashProfile(profile: CommunicationProfile): Promise<string> {
  return sha256Hex(canonicalStringify(profile));
}

export async function ratifyProfile(
  profile: CommunicationProfile,
  reviewedAt: string,
): Promise<{ profile: CommunicationProfile; hash: string }> {
  const nextProfile: CommunicationProfile = {
    ...profile,
    revision: profile.revision + 1,
    ratifiedVersion: (profile.ratifiedVersion ?? 0) + 1,
    updatedAt: reviewedAt,
    reviewedAt,
  };
  return { profile: nextProfile, hash: await hashProfile(nextProfile) };
}
