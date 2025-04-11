// graphql/resolvers/project.js
const { ForbiddenError } = require("apollo-server-express");
const { PubSub } = require("graphql-subscriptions");

const pubsub = new PubSub();
const PROJECT_STATUS_CHANGED = "PROJECT_STATUS_CHANGED";
const NEW_ALERT_CREATED = "NEW_ALERT_CREATED";

const projectResolvers = {
  Query: {
    projects: async (_, { status }, { dataSources }) => {
      if (status) {
        return dataSources.projectAPI.getProjectsByStatus(status);
      }
      return dataSources.projectAPI.getAllProjects();
    },

    project: async (_, { id }, { dataSources }) => {
      return dataSources.projectAPI.getProjectById(id);
    },
  },

  Mutation: {
    createProject: async (_, projectData, { dataSources, user }) => {
      // Assuming user ID is passed from context after frontend authentication
      if (!user || !user.id) {
        throw new ForbiddenError("Authentication required to create a project");
      }

      const project = await dataSources.projectAPI.createProject({
        ...projectData,
        creatorId: user.id,
        status: "PENDING",
      });

      return project;
    },

    updateProject: async (_, { id, ...projectData }, { dataSources, user }) => {
      if (!user || !user.id) {
        throw new ForbiddenError("Authentication required to update a project");
      }

      const project = await dataSources.projectAPI.getProjectById(id);

      // Allow update if user is creator or has admin privileges
      if (project.creatorId !== user.id && !user.isTrustedVoter) {
        throw new ForbiddenError("Not authorized to update this project");
      }

      return dataSources.projectAPI.updateProject(id, projectData);
    },

    changeProjectStatus: async (
      _,
      { projectId, status },
      { dataSources, user }
    ) => {
      // Only trusted voters can change project status
      if (!user || !user.isTrustedVoter) {
        throw new ForbiddenError("Not authorized to change project status");
      }

      const project = await dataSources.projectAPI.updateProjectStatus(
        projectId,
        status
      );

      // Publish subscription event for status change
      pubsub.publish(PROJECT_STATUS_CHANGED, { projectStatusChanged: project });

      // If status is negative (SCAM/RUG), create an alert
      if (status === "SCAM" || status === "RUG") {
        const alert = await dataSources.alertAPI.createAlert({
          projectId,
          message: `Project ${project.name} has been marked as ${status}`,
          alertType: status,
        });

        pubsub.publish(NEW_ALERT_CREATED, { newAlertCreated: alert });
      }

      return project;
    },
  },

  Project: {
    votes: async (project, _, { dataSources }) => {
      return dataSources.voteAPI.getVotesByProject(project.id);
    },

    reviewsCount: async (project, _, { dataSources }) => {
      const votes = await dataSources.voteAPI.getVotesByProject(project.id);
      return votes.length;
    },

    averageScore: async (project, _, { dataSources }) => {
      const votes = await dataSources.voteAPI.getVotesByProject(project.id);

      if (votes.length === 0) return null;

      const yesVotes = votes.filter((vote) => vote.value === "YES").length;
      return yesVotes / votes.length;
    },
  },
};

module.exports = {
  projectResolvers,
  PROJECT_STATUS_CHANGED,
};
