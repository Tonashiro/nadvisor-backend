// graphql/dataSources/UserAPI.js
const { DataSource } = require("apollo-datasource");
const { v4: uuidv4 } = require("uuid");

class UserAPI extends DataSource {
  constructor({ models }) {
    super();
    this.models = models;
  }

  initialize(config) {
    this.context = config.context;
  }

  async getAllUsers() {
    return this.models.User.findAll();
  }

  async getUserById(id) {
    return this.models.User.findByPk(id);
  }

  async getUserByWallet(walletAddress) {
    return this.models.User.findOne({
      where: { walletAddress },
    });
  }

  async getUserByDiscord(discordId) {
    return this.models.User.findOne({
      where: { discordId },
    });
  }

  async createUser(userData) {
    return this.models.User.create({
      id: uuidv4(),
      ...userData,
      createdAt: new Date().toISOString(),
    });
  }

  async updateUser(id, userData) {
    return this.models.User.update(userData, { where: { id } });
  }
}

module.exports = UserAPI;
