const { DataSource } = require("apollo-datasource");
const { v4: uuidv4 } = require("uuid");

class ProjectAPI extends DataSource {
  constructor({ models }) {
    super();
    this.models = models;
  }

  initialize(config) {
    this.context = config.context;
  }

  async getAllProjects() {
    return this.models.Project.findAll({
      order: [["createdAt", "DESC"]],
    });
  }

  async getProjectsByStatus(status) {
    return this.models.Project.findAll({
      where: { status },
      order: [["createdAt", "DESC"]],
    });
  }

  async getProjectById(id) {
    return this.models.Project.findByPk(id);
  }

  async createProject(projectData) {
    return this.models.Project.create({
      id: uuidv4(),
      ...projectData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async updateProject(id, projectData) {
    await this.models.Project.update(
      {
        ...projectData,
        updatedAt: new Date().toISOString(),
      },
      { where: { id } }
    );

    return this.getProjectById(id);
  }

  async updateProjectStatus(id, status) {
    await this.models.Project.update(
      {
        status,
        updatedAt: new Date().toISOString(),
      },
      { where: { id } }
    );

    return this.getProjectById(id);
  }

  async getProjectsByPage(page = 1, limit = 10, status = null) {
    const offset = (page - 1) * limit;
    const whereClause = status ? { status } : {};

    const { count, rows } = await this.models.Project.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return {
      projects: rows,
      totalCount: count,
      hasMore: offset + rows.length < count,
    };
  }

  async searchProjects(searchTerm) {
    const { Op } = require("sequelize");

    return this.models.Project.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${searchTerm}%` } },
          { description: { [Op.iLike]: `%${searchTerm}%` } },
        ],
      },
      order: [["createdAt", "DESC"]],
    });
  }
}

module.exports = ProjectAPI;
