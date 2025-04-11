// graphql/dataSources/CriteriaAPI.js
const { DataSource } = require("apollo-datasource");
const { v4: uuidv4 } = require("uuid");

class CriteriaAPI extends DataSource {
  constructor({ models }) {
    super();
    this.models = models;
  }

  initialize(config) {
    this.context = config.context;
  }

  async getAllCriterias() {
    return this.models.Criteria.findAll({
      order: [["weight", "DESC"]],
    });
  }

  async getCriteriaById(id) {
    return this.models.Criteria.findByPk(id);
  }

  async createCriteria(criteriaData) {
    return this.models.Criteria.create({
      id: uuidv4(),
      ...criteriaData,
    });
  }

  async updateCriteria(id, criteriaData) {
    await this.models.Criteria.update(criteriaData, { where: { id } });
    return this.getCriteriaById(id);
  }
}

module.exports = CriteriaAPI;
