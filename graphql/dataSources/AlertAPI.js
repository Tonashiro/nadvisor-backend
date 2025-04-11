// graphql/dataSources/AlertAPI.js
const { DataSource } = require("apollo-datasource");
const { v4: uuidv4 } = require("uuid");

class AlertAPI extends DataSource {
  constructor({ models }) {
    super();
    this.models = models;
  }

  initialize(config) {
    this.context = config.context;
  }

  async getAllAlerts() {
    return this.models.Alert.findAll({
      order: [["createdAt", "DESC"]],
    });
  }

  async getAlertsByProject(projectId) {
    return this.models.Alert.findAll({
      where: { projectId },
      order: [["createdAt", "DESC"]],
    });
  }

  async createAlert(alertData) {
    return this.models.Alert.create({
      id: uuidv4(),
      ...alertData,
      createdAt: new Date().toISOString(),
    });
  }

  async getRecentAlerts(limit = 5) {
    return this.models.Alert.findAll({
      order: [["createdAt", "DESC"]],
      limit,
    });
  }
}

module.exports = AlertAPI;
