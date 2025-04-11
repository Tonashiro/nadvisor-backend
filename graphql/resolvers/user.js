// graphql/resolvers/user.js
const { ForbiddenError } = require("apollo-server-express");

const userResolvers = {
  Query: {
    me: async (_, __, { dataSources, user }) => {
      if (!user || !user.id) return null;
      return dataSources.userAPI.getUserById(user.id);
    },
  },

  Mutation: {
    registerUser: async (
      _,
      { walletAddress, discordId, hasMonRole },
      { dataSources }
    ) => {
      // Check if user with this wallet already exists
      const existingUser = await dataSources.userAPI.getUserByWallet(
        walletAddress
      );

      if (existingUser) {
        // Update existing user with new discord info if provided
        if (discordId && discordId !== existingUser.discordId) {
          return dataSources.userAPI.updateUser(existingUser.id, {
            discordId,
            hasMonRole,
          });
        }
        return existingUser;
      }

      // Create new user
      return dataSources.userAPI.createUser({
        walletAddress,
        discordId,
        hasMonRole,
        isTrustedVoter: false, // Default to false for new users
      });
    },

    updateUserRoles: async (
      _,
      { id, hasMonRole, isTrustedVoter },
      { dataSources, user }
    ) => {
      // Only trusted voters/admins can change roles
      if (!user || !user.isTrustedVoter) {
        throw new ForbiddenError("Not authorized to update user roles");
      }

      // Update user roles
      const updateData = {};
      if (hasMonRole !== undefined) updateData.hasMonRole = hasMonRole;
      if (isTrustedVoter !== undefined)
        updateData.isTrustedVoter = isTrustedVoter;

      return dataSources.userAPI.updateUser(id, updateData);
    },
  },

  User: {
    votes: async (user, _, { dataSources }) => {
      return dataSources.voteAPI.getVotesByUser(user.id);
    },
  },
};

module.exports = {
  userResolvers,
};
