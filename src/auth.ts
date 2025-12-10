import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { FastifyRequest, FastifyReply } from "fastify";

// Demo users database (in a real app, this would be in a database)
// Demo users with new simplified format (adminScopes)
// Legacy fields (role, groups) are also included for backward compatibility demo
const users = [
  {
    id: "user-1",
    email: "admin@example.com",
    password: bcrypt.hashSync("password123", 10), // hashed 'password123'
    adminScopes: ["autojoin"], // New simplified field - grants autojoin admin privileges
    role: "admin", // Legacy field
    groups: [
      // Legacy field
      { type: "team", id: "team-1", name: "Engineering" },
      { type: "organization", id: "org-1", name: "Acme Corp" },
    ],
  },
  {
    id: "user-2",
    email: "user@example.com",
    password: bcrypt.hashSync("userpass", 10), // hashed 'userpass'
    adminScopes: [], // New simplified field - no admin privileges
    role: "user", // Legacy field
    groups: [
      // Legacy field
      { type: "team", id: "team-1", name: "Engineering" },
    ],
  },
];

const JWT_SECRET = process.env.JWT_SECRET || "demo-secret-key";

export interface DemoUser {
  id: string;
  email: string;

  // New simplified field (preferred)
  adminScopes: string[];

  // Legacy fields (deprecated but still supported for backward compatibility)
  role: string;
  groups: { type: string; id?: string; groupId?: string; name: string }[];
}

// Create a session JWT for the demo
export function createSessionJWT(user: DemoUser): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      adminScopes: user.adminScopes,
      role: user.role,
      groups: user.groups,
    },
    JWT_SECRET,
    { expiresIn: "1d" },
  );
}

// Verify session JWT
export function verifySessionJWT(token: string): DemoUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.userId,
      email: decoded.email,
      adminScopes: decoded.adminScopes ?? [],
      role: decoded.role,
      groups: decoded.groups,
    };
  } catch {
    return null;
  }
}

// Authenticate user by email and password
export function authenticateUser(
  email: string,
  password: string,
): DemoUser | null {
  const user = users.find((u) => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    adminScopes: user.adminScopes,
    role: user.role,
    groups: user.groups,
  };
}

// Get current user from request (checks cookies for session JWT)
export function getCurrentUser(request: FastifyRequest): DemoUser | null {
  // Try to get the cookie - @fastify/cookie with secret stores signed cookies
  let token = (request as any).signedCookies?.session;

  // If not in signedCookies, try to manually unsign from cookies
  if (!token && request.cookies?.session) {
    const cookieValue = request.cookies.session;
    // Try to unsign the cookie manually
    const unsignResult = (request as any).unsignCookie?.(cookieValue);
    if (unsignResult && unsignResult.valid) {
      token = unsignResult.value;
    }
  }

  if (!token) {
    return null;
  }

  return verifySessionJWT(token);
}

// Fastify preHandler hook to require authentication
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getCurrentUser(request);
  if (!user) {
    return reply.status(401).send({ error: "Authentication required" });
  }

  // Attach user to request for use in other handlers
  (request as any).user = user;
}

// Get demo users (for testing)
export function getDemoUsers() {
  return users.map((user) => ({
    id: user.id,
    email: user.email,
    adminScopes: user.adminScopes,
    role: user.role,
    groups: user.groups,
  }));
}
