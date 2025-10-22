import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import path from "path";
import { fileURLToPath } from "url";
import {
  configureVortex,
  vortexPlugin,
  createAllowAllAccessControl,
} from "@teamvortexsoftware/vortex-fastify-5-sdk";
import {
  getCurrentUser,
  authenticateUser,
  createSessionJWT,
  requireAuth,
  getDemoUsers,
  type DemoUser,
} from "./auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: {
    level: "info",
  },
  // Allow empty JSON bodies
  bodyLimit: 1048576,
});

const PORT = parseInt(process.env.PORT || "3000", 10);

// Configure Vortex SDK
configureVortex({
  apiKey: process.env.VORTEX_API_KEY || "demo-api-key",

  // Authentication function that integrates with our demo auth system
  authenticateUser: async (request, reply) => {
    const user = getCurrentUser(request);

    if (!user) {
      return null;
    }

    // Convert to Vortex format
    return {
      userId: user.id,
      identifiers: [{ type: "email", value: user.email }],
      groups: user.groups,
      role: user.role,
    };
  },

  // For demo purposes, allow all operations
  // In production, you'd implement proper access control
  ...createAllowAllAccessControl(),
});

// Add content type parser for empty JSON bodies
fastify.addContentTypeParser(
  "application/json",
  { parseAs: "string" },
  function (req, body, done) {
    try {
      const json = body === "" ? {} : JSON.parse(body as string);
      done(null, json);
    } catch (err) {
      // import util if you want richer messages: import util from 'node:util';

      const e = err instanceof Error ? err : new Error(String(err)); // or util.inspect(err)
      done(e); // no second parameter
    }
  },
);

// Register plugins
await fastify.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET || "demo-cookie-secret",
  parseOptions: {},
});

await fastify.register(fastifyStatic, {
  root: path.join(__dirname, "../public"),
  prefix: "/",
});

// Register Vortex plugin
await fastify.register(vortexPlugin, { prefix: "/api/vortex" });

// Demo authentication routes
fastify.post("/api/auth/login", async (request, reply) => {
  const { email, password } = request.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return reply.status(400).send({ error: "Email and password required" });
  }

  const user = authenticateUser(email, password);
  if (!user) {
    return reply.status(401).send({ error: "Invalid credentials" });
  }

  // Create session JWT and set as cookie
  const sessionToken = createSessionJWT(user);
  reply.setCookie("session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      groups: user.groups,
    },
  };
});

fastify.post("/api/auth/logout", async (request, reply) => {
  reply.clearCookie("session");
  return { success: true };
});

fastify.get("/api/auth/me", async (request, reply) => {
  const user = getCurrentUser(request);
  if (!user) {
    return reply.status(401).send({ error: "Not authenticated" });
  }

  return { user };
});

// Demo data endpoints
fastify.get("/api/demo/users", async (request, reply) => {
  return { users: getDemoUsers() };
});

// Protected demo route
fastify.get(
  "/api/demo/protected",
  {
    preHandler: requireAuth,
  },
  async (request, reply) => {
    const user = (request as any).user as DemoUser;
    return {
      message: "This is a protected route!",
      user: user,
      timestamp: new Date().toISOString(),
    };
  },
);

// Serve the demo frontend
fastify.get("/", async (request, reply) => {
  return reply.sendFile("index.html");
});

// Health check endpoint
fastify.get("/health", async (request, reply) => {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    vortex: {
      configured: true,
      routes: [
        "/api/vortex/jwt",
        "/api/vortex/invitations",
        "/api/vortex/invitations/:id",
        "/api/vortex/invitations/accept",
        "/api/vortex/invitations/by-group/:type/:id",
        "/api/vortex/invitations/:id/reinvite",
      ],
    },
  };
});

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(500).send({ error: "Internal server error" });
});

// 404 handler
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({ error: "Route not found" });
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Demo Fastify server running on port ${PORT}`);
    console.log(`📱 Visit http://localhost:${PORT} to try the demo`);
    console.log(
      `🔧 Vortex API routes available at http://localhost:${PORT}/api/vortex`,
    );
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log("");
    console.log("Demo users:");
    console.log("  - admin@example.com / password123 (admin role)");
    console.log("  - user@example.com / userpass (user role)");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

export default fastify;
