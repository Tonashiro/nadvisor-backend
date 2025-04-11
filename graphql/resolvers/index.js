// graphql/resolvers/index.js
const { projectResolvers, PROJECT_STATUS_CHANGED } = require("./project");
const { voteResolvers, NEW_VOTE_ADDED } = require("./vote");
const { userResolvers } = require("./user");
const { alertResolvers, NEW_ALERT_CREATED } = require("./alert");

// Combine all resolvers
const resolvers = {
  Query: {
    ...projectResolvers.Query,
    ...voteResolvers.Query,
    ...userResolvers.Query,
    ...alertResolvers.Query,
  },

  Mutation: {
    ...projectResolvers.Mutation,
    ...voteResolvers.Mutation,
    ...userResolvers.Mutation,
    ...alertResolvers.Mutation,
  },

  // Subscription resolvers
  Subscription: {
    projectStatusChanged: {
      subscribe: () => pubsub.asyncIterator([PROJECT_STATUS_CHANGED]),
    },

    newVoteAdded: {
      subscribe: (_, { projectId }) => {
        if (projectId) {
          return pubsub.asyncIterator([`${NEW_VOTE_ADDED}_${projectId}`]);
        }
        return pubsub.asyncIterator([NEW_VOTE_ADDED]);
      },
    },

    newAlertCreated: {
      subscribe: () => pubsub.asyncIterator([NEW_ALERT_CREATED]),
    },
  },

  // Type resolvers
  Project: projectResolvers.Project,
  Vote: voteResolvers.Vote,
  CriteriaVote: voteResolvers.CriteriaVote,
  User: userResolvers.User,
  Alert: alertResolvers.Alert,
};

// Create shared PubSub instance
const { PubSub } = require("graphql-subscriptions");
const pubsub = new PubSub();

module.exports = {
  resolvers,
  pubsub,
};
