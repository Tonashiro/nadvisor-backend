// graphql/resolvers/vote.js
const { ForbiddenError } = require("apollo-server-express");
const { PubSub } = require("graphql-subscriptions");

const pubsub = new PubSub();
const NEW_VOTE_ADDED = "NEW_VOTE_ADDED";

const voteResolvers = {
  Query: {
    votes: async (_, { projectId }, { dataSources }) => {
      if (projectId) {
        return dataSources.voteAPI.getVotesByProject(projectId);
      }
      return dataSources.voteAPI.getAllVotes();
    },

    criterias: async (_, __, { dataSources }) => {
      return dataSources.criteriaAPI.getAllCriterias();
    },
  },

  Mutation: {
    submitVote: async (
      _,
      { projectId, userId, value, comment, criteriaVotes },
      { dataSources, user }
    ) => {
      // Verify user can vote (has MON role or is trusted)
      // Note: We use userId from parameters since this might be called by admins on behalf of users
      // In a real implementation, you'd likely want additional checks here

      // For normal users, verify they're voting as themselves
      if (user && user.id !== userId && !user.isTrustedVoter) {
        throw new ForbiddenError("You can only submit votes as yourself");
      }

      // Get user info to check roles
      const voter = await dataSources.userAPI.getUserById(userId);
      if (!voter.hasMonRole && !voter.isTrustedVoter) {
        throw new ForbiddenError("User not authorized to vote on projects");
      }

      // Check if user has already voted for this project
      const existingVote = await dataSources.voteAPI.getUserVoteForProject(
        userId,
        projectId
      );
      if (existingVote) {
        throw new ForbiddenError("User has already voted for this project");
      }

      // Create the vote
      const vote = await dataSources.voteAPI.createVote({
        projectId,
        userId,
        value,
        comment,
      });

      // Add criteria votes if provided
      if (criteriaVotes && criteriaVotes.length > 0) {
        await Promise.all(
          criteriaVotes.map(({ criteriaId, value, comment }) => {
            return dataSources.voteAPI.createCriteriaVote({
              voteId: vote.id,
              criteriaId,
              value,
              comment,
            });
          })
        );
      }

      // Refresh vote with criteria votes
      const completeVote = await dataSources.voteAPI.getVoteById(vote.id);

      // Publish subscription event
      pubsub.publish(NEW_VOTE_ADDED, {
        newVoteAdded: completeVote,
        projectId,
      });

      // Check if project status should be automatically updated based on votes
      await checkProjectVotingStatus(projectId, dataSources);

      return completeVote;
    },
  },

  Vote: {
    project: async (vote, _, { dataSources }) => {
      return dataSources.projectAPI.getProjectById(vote.projectId);
    },

    user: async (vote, _, { dataSources }) => {
      return dataSources.userAPI.getUserById(vote.userId);
    },

    criteriaVotes: async (vote, _, { dataSources }) => {
      return dataSources.voteAPI.getCriteriaVotesByVote(vote.id);
    },
  },

  CriteriaVote: {
    criteria: async (criteriaVote, _, { dataSources }) => {
      return dataSources.criteriaAPI.getCriteriaById(criteriaVote.criteriaId);
    },
  },
};

// Helper function to check if enough votes to change status
async function checkProjectVotingStatus(projectId, dataSources) {
  const project = await dataSources.projectAPI.getProjectById(projectId);
  const votes = await dataSources.voteAPI.getVotesByProject(projectId);

  // Skip if not enough votes
  if (votes.length < 3) return; // Minimum threshold

  const yesVotes = votes.filter((vote) => vote.value === "YES").length;
  const yesPercentage = yesVotes / votes.length;

  let newStatus = project.status;

  if (yesPercentage >= 0.75) {
    newStatus = "VERIFIED";
  } else if (yesPercentage <= 0.25) {
    // Check if it's a scam or just unverified
    const scamVotes = votes.filter((v) => {
      return v.criteriaVotes.some(
        (cv) => cv.criteria.name === "Scam Detection" && cv.value === "YES"
      );
    }).length;

    const scamPercentage = scamVotes / votes.length;

    if (scamPercentage >= 0.5) {
      newStatus = "SCAM";
    } else {
      newStatus = "UNVERIFIED";
    }
  }

  // Only update if status changed
  if (newStatus !== project.status) {
    const updatedProject = await dataSources.projectAPI.updateProjectStatus(
      projectId,
      newStatus
    );

    // Import from project resolver
    const { PROJECT_STATUS_CHANGED } = require("./project");
    pubsub.publish(PROJECT_STATUS_CHANGED, {
      projectStatusChanged: updatedProject,
    });

    // Create alert for negative status
    if (newStatus === "SCAM" || newStatus === "RUG") {
      const alert = await dataSources.alertAPI.createAlert({
        projectId,
        message: `Project ${project.name} has been automatically marked as ${newStatus} based on community votes`,
        alertType: newStatus,
      });

      // Import from alert resolver
      const { NEW_ALERT_CREATED } = require("./alert");
      pubsub.publish(NEW_ALERT_CREATED, { newAlertCreated: alert });
    }
  }
}

module.exports = {
  voteResolvers,
  NEW_VOTE_ADDED,
};
