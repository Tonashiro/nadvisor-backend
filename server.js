// server.js
require("dotenv").config();
const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const { createServer } = require("http");
const { execute, subscribe } = require("graphql");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { Sequelize } = require("sequelize");

// Configuration de la base de données
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

// Import GraphQL schema and resolvers
const typeDefs = require("./graphql/schema");
const { resolvers } = require("./graphql/resolvers");

// Import data sources and models
const models = require("./models");
const {
  ProjectAPI,
  UserAPI,
  VoteAPI,
  CriteriaAPI,
  AlertAPI,
} = require("./graphql/dataSources");

// Import utilities
const { initializeCriteria } = require("./utils/initData");

// Create Express app
const app = express();

// Configure CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Configure Helmet with specific CSP for Apollo Studio
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "https://*.apollographql.com"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://*.apollographql.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://*.apollographql.com"],
        imgSrc: ["'self'", "data:", "https:", "https://*.apollographql.com"],
        connectSrc: [
          "'self'",
          "https://*.apollographql.com",
          "wss://*.apollographql.com",
        ],
        fontSrc: ["'self'", "https://*.apollographql.com"],
        frameSrc: ["'self'", "https://*.apollographql.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "no-referrer-when-downgrade" },
  })
);

app.use(express.json());

// Apply rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/graphql", limiter);

// Create executable schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Function to get user from auth token
const getUser = async (token) => {
  if (!token) return null;

  try {
    // Extract the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user in the database
    return await models.User.findByPk(decoded.userId);
  } catch (err) {
    console.error("Error verifying token:", err);
    return null;
  }
};

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources: () => ({
    projectAPI: new ProjectAPI({ models }),
    userAPI: new UserAPI({ models }),
    voteAPI: new VoteAPI({ models }),
    criteriaAPI: new CriteriaAPI({ models }),
    alertAPI: new AlertAPI({ models }),
  }),
  context: async ({ req }) => {
    const token = req.headers.authorization || "";
    try {
      const user = await getUser(token);
      return { user };
    } catch (error) {
      return {};
    }
  },
  introspection: true,
  playground: true,
  subscriptions: {
    path: "/graphql",
  },
  cors: {
    origin: true,
    credentials: true,
  },
});

// Start the server
async function startServer() {
  await server.start();

  // Apply Apollo middleware to Express
  server.applyMiddleware({ app });

  // Create HTTP server
  const httpServer = createServer(app);

  // Create subscription server
  SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      onConnect: async (connectionParams) => {
        // Get auth token from connection params
        const token =
          connectionParams.Authorization?.replace("Bearer ", "") || "";

        // Get user from token
        const user = await getUser(token);

        return { user };
      },
    },
    { server: httpServer, path: server.graphqlPath }
  );

  // Initialize database
  await models.sequelize.sync({ alter: process.env.NODE_ENV !== "production" });

  // Initialize default criteria if needed
  await initializeCriteria(models);

  // Start HTTP server
  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
    );
    console.log(
      `🚀 Subscriptions ready at ws://localhost:${PORT}${server.graphqlPath}`
    );
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
