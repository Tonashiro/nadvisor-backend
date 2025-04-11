// graphql/resolvers/alert.js
const { ForbiddenError } = require("apollo-server-express");
const { PubSub } = require("graphql-subscriptions");
const { sendTelegramAlert } = require("../../utils/telegram");

const pubsub = new PubSub();
const NEW_ALERT_CREATED = "NEW_ALERT_CREATED";

const alertResolvers = {
  Query: {
    alerts: async (_, __, { dataSources }) => {
      return dataSources.alertAPI.getAllAlerts();
    },
  },

  Mutation: {
    createAlert: async (
      _,
      { projectId, message, alertType },
      { dataSources, user }
    ) => {
      // Only trusted voters can create alerts
      if (!user || !user.isTrustedVoter) {
        throw new ForbiddenError("Not authorized to create alerts");
      }

      const alert = await dataSources.alertAPI.createAlert({
        projectId,
        message,
        alertType,
      });

      // Publish subscription event
      pubsub.publish(NEW_ALERT_CREATED, { newAlertCreated: alert });

      // Send notification to Telegram if enabled
      if (process.env.TELEGRAM_ENABLED === "true") {
        try {
          const project = await dataSources.projectAPI.getProjectById(
            projectId
          );
          await sendTelegramAlert({
            ...alert,
            project,
          });
        } catch (error) {
          console.error("Error sending Telegram alert:", error);
          // Continue execution even if Telegram notification fails
        }
      }

      return alert;
    },
  },

  Alert: {
    project: async (alert, _, { dataSources }) => {
      return dataSources.projectAPI.getProjectById(alert.projectId);
    },
  },
};

module.exports = {
  alertResolvers,
  NEW_ALERT_CREATED,
};
