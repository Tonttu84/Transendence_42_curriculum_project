import { log } from "./logger";

type AuthUser = {
  id: number;
  username: string;
};

const TOKEN_CACHE_TTL_MS = 20_000;
const tokenCache = new Map<string, { data: any; exp: number }>();

type FetchUsersResult = { users: AuthUser[] } | { status: number };

type UsernamesByIdsResult =
  | { usernames: Map<number, string> }
  | { status: number };

const AUTH_URL = process.env.AUTH_URL || "http://auth-service:3003";

export async function validateToken(authHeader?: string) {
  if (!authHeader) {
    return {};
  }

  // Cache lookup
  const cached = tokenCache.get(authHeader);
  if (cached && cached.exp > Date.now()) {
    return cached.data;
  }
  // Optional: cleanup expired entry
  if (cached) tokenCache.delete(authHeader);

  try {
    // Call the Auth/User service
    const response = await fetch(`${AUTH_URL}/api/users/validate`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
    });

    // Prevent caching an error response
    if (!response.ok) {
      return {};
    }

    // Parse response
    const data = await response.json();

    // Store in cache if userId exists in the response
    if (data && data.userId) {
      tokenCache.set(authHeader, {
        data,
        exp: Date.now() + TOKEN_CACHE_TTL_MS,
      });
    }
    return data; // expected: { userId }
  } catch (e) {
    log.error(e, "Token validation failed");
    return {};
  }
}

export async function getUsername(authHeader?: string) {
  // If no header was provided
  if (!authHeader) {
    return {};
  }

  try {
    // Call the Auth/User service
    const response = await fetch(`${AUTH_URL}/api/users/me`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
      },
    });

    // Try parsing the JSON response
    const data = await response.json();

    return data;
  } catch (e) {
    log.error(e, "Get username failed");
    return {};
  }
}

export async function fetchAllUsers(
  authHeader: string,
): Promise<FetchUsersResult> {
  if (!authHeader) {
    return { status: 401 };
  }

  try {
    const res = await fetch(`${AUTH_URL}/api/users`, {
      method: "GET",
      headers: { accept: "application/json", authorization: authHeader },
    });

    if (res.status != 200) {
      return { status: res.status };
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      return { status: 502 };
    }

    const users: AuthUser[] = data
      .filter(
        (u: any) =>
          u && typeof u.id === "number" && typeof u.username === "string",
      )
      .map((u: any) => ({ id: u.id, username: u.username }));

    return { users };
  } catch {
    // Network error, DNS, service down, etc.
    return { status: 502 };
  }
}

export async function getUsernamesByIds(
  authHeader: string,
  ids: number[],
): Promise<UsernamesByIdsResult> {
  // 1. Fetch all users from auth service
  const all = await fetchAllUsers(authHeader);

  if ("status" in all) {
    return { status: all.status };
  }

  // 2. Put the IDs we care about into a Set for fast lookups
  const wanted = new Set<number>(ids);

  // 3. Build a map of only the usernames we need
  const map = new Map<number, string>();

  for (const u of all.users) {
    if (wanted.has(u.id)) {
      map.set(u.id, u.username);
    }
  }

  return { usernames: map };
}
