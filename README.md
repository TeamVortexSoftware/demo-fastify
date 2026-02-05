# Demo Fastify App - Vortex Fastify SDK

A demonstration Fastify application showcasing the Vortex Fastify 5 SDK integration with native plugin architecture.

## 🚀 Quick Start

```bash
cd demos/demo-fastify
pnpm install
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to try the demo!

## 🎯 What This Demo Shows

This demo demonstrates:

- **Easy Vortex Integration**: Single plugin registration with `fastify.register(vortexPlugin)`
- **Native Fastify Architecture**: Uses Fastify's plugin system for optimal performance
- **Authentication Integration**: How to connect your auth system to Vortex
- **All Vortex Routes**: JWT generation, invitation management, group operations
- **Access Control**: Using Vortex's access control hooks (simplified for demo)
- **Frontend Integration**: Same React provider compatibility as Express/Next.js

## 🔧 Features

### Demo Users

The demo includes two test users using the **new simplified JWT format**:

| Email             | Password    | Admin Scopes   | Legacy Role |
| ----------------- | ----------- | -------------- | ----------- |
| admin@example.com | password123 | `['autojoin']` | admin       |
| user@example.com  | userpass    | `[]`           | user        |

The demo showcases both the new simplified format (user with `adminScopes` array) and the legacy format (`role` + `groups`) for educational purposes. See [server.ts](src/server.ts) for implementation details.

### Available Routes

#### Authentication Routes

- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/me` - Get current user info

#### Vortex Routes (via SDK Plugin)

- `POST /api/vortex/jwt` - Generate Vortex JWT
- `GET /api/vortex/invitations` - Get invitations by target
- `GET /api/vortex/invitations/:id` - Get specific invitation
- `DELETE /api/vortex/invitations/:id` - Delete invitation
- `POST /api/vortex/invitations/accept` - Accept invitations
- `GET /api/vortex/invitations/by-group/:type/:id` - Get group invitations
- `DELETE /api/vortex/invitations/by-group/:type/:id` - Delete group invitations
- `POST /api/vortex/invitations/:id/reinvite` - Resend invitation

#### Demo/Utility Routes

- `GET /health` - Health check with Vortex route info
- `GET /api/demo/users` - List demo users
- `GET /api/demo/protected` - Protected route example

## 💻 Usage

### 1. Start the Server

```bash
pnpm dev
```

### 2. Open the Web Interface

Visit [http://localhost:3000](http://localhost:3000) to access the interactive demo interface.

### 3. Test the Flow

1. **Login** with one of the demo users
2. **Generate JWT** to see Vortex JWT creation in action
3. **Test Invitations** by target (email, username, phone)
4. **Test Group Operations** with the demo groups
5. **Try Other Features** like protected routes and health checks

### 4. Direct API Testing

You can also test the APIs directly:

```bash
# Login first
curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@example.com","password":"password123"}' \\
  -c cookies.txt

# Then test Vortex JWT generation
curl -X POST http://localhost:3000/api/vortex/jwt \\
  -b cookies.txt
```

## 🚀 Fastify-Specific Architecture

### Plugin Registration

The key difference from the Express demo is the use of Fastify's native plugin system:

```typescript
// Configure Vortex with new simplified format (recommended)
configureVortex({
  apiKey: process.env.VORTEX_API_KEY || "demo-api-key",
  authenticateUser: async (request, reply) => {
    const user = getCurrentUser(request);
    if (!user) return null;

    // Use new simplified format
    return {
      userId: user.id,
      userEmail: user.email,
      adminScopes: user.adminScopes,
    };
  },
  ...createAllowAllAccessControl(),
});

// Register as a plugin
await fastify.register(vortexPlugin, { prefix: "/api/vortex" });
```

### JWT Format

This demo uses Vortex's **new simplified JWT format** (recommended):

```typescript
// New simplified format in server.ts
return {
  userId: user.id,
  userEmail: user.email,
  adminScopes: user.adminScopes,
};
```

The JWT payload includes:

- `userId`: User's unique ID
- `userEmail`: User's email address
- `adminScopes`: Array of admin scopes (e.g., `['autojoin']` for autojoin admin privileges)

This replaces the legacy format with `identifiers`, `groups`, and `role` fields. The old format is still supported but deprecated. You can see both implementations commented in the [server.ts](src/server.ts) file.

### Performance Benefits

- **Native Fastify Integration**: Uses FastifyRequest and FastifyReply directly
- **Plugin Encapsulation**: Clean separation of concerns
- **High Performance**: Leverages Fastify's speed and efficiency
- **Automatic JSON Parsing**: Body parsing handled automatically

## 🔄 Comparison with Express Demo

| Aspect                 | Fastify Demo                | Express Demo                |
| ---------------------- | --------------------------- | --------------------------- |
| **Server Framework**   | Fastify 5.x                 | Express 5.x                 |
| **Integration Method** | Plugin (`fastify.register`) | Middleware (`app.use`)      |
| **Route Registration** | Plugin-based                | Router-based                |
| **Static Files**       | `@fastify/static` plugin    | `express.static` middleware |
| **Cookies**            | `@fastify/cookie` plugin    | `cookie-parser` middleware  |
| **Error Handling**     | `setErrorHandler`           | Middleware chain            |
| **Performance**        | Higher (native Fastify)     | Good                        |
| **Frontend**           | **Identical**               | **Identical**               |
| **API Routes**         | **Identical**               | **Identical**               |

## 📁 Project Structure

```
demos/demo-fastify/
├── src/
│   ├── auth.ts          # Authentication utilities (Fastify-adapted)
│   └── server.ts        # Main Fastify server with Vortex plugin
├── public/
│   └── index.html       # Interactive demo frontend (same as Express)
├── package.json
├── tsconfig.json
└── README.md
```

## 🔒 Security Notes

**This is a demo application** - it includes simplified security for demonstration purposes:

- Uses in-memory user storage
- Simplified JWT secrets
- `createAllowAllAccessControl()` for easy testing

For production use:

- Use a real database for user storage
- Implement proper access control hooks
- Use secure JWT and cookie secrets
- Add input validation and rate limiting
- Use HTTPS in production

## 🛠️ Customization

### Adding Your Own Routes

```typescript
// Add custom routes alongside Vortex
fastify.get("/api/custom", async (request, reply) => {
  return { message: "Custom route!" };
});

// Vortex routes as plugin
await fastify.register(vortexPlugin, { prefix: "/api/vortex" });
```

### Custom Access Control

```typescript
configureVortex({
  apiKey: process.env.VORTEX_API_KEY!,
  authenticateUser: /* your auth function */,

  // Custom access control instead of createAllowAllAccessControl()
  canDeleteInvitation: async (request, reply, user, resource) => {
    return user?.role === 'admin';
  },

  canAccessInvitationsByGroup: async (request, reply, user, resource) => {
    return user?.groups.some(g =>
      g.type === resource?.groupType && g.id === resource?.groupId
    );
  }
});
```

### Plugin Encapsulation

```typescript
// Register Vortex in its own context
await fastify.register(async function vortexContext(fastify) {
  await fastify.register(vortexPlugin);

  // Add custom middleware only for Vortex routes
  fastify.addHook("preHandler", async (request, reply) => {
    // Custom logic for all Vortex routes
  });
});
```

## 🎯 Why Choose Fastify?

This demo showcases Fastify's advantages:

1. **Performance**: ~20% faster than Express
2. **Plugin Architecture**: Better code organization and encapsulation
3. **Built-in Features**: JSON parsing, logging, validation
4. **TypeScript First**: Better typing out of the box
5. **Schema-based**: Built-in request/response validation
6. **Ecosystem**: Rich plugin ecosystem

## 🔗 Related

- [Vortex Fastify SDK Documentation](../../sdks/vortex-fastify-5-sdk/README.md)
- [Vortex Express SDK Documentation](../../sdks/vortex-express-5-sdk/README.md)
- [Vortex Node SDK Documentation](../../sdks/vortex-node-22-sdk/README.md)
- [Vortex React Provider Documentation](../../packages/vortex-react-provider/README.md)

---

**Need help?** Open an issue or check the Express demo implementation for reference patterns.
