// graphql/dataSources/VoteAPI.js
const { DataSource } = require("apollo-datasource");
const { v4: uuidv4 } = require("uuid");

class VoteAPI extends DataSource {
  constructor({ models }) {
    super();
    this.models = models;
  }

  initialize(config) {
    this.context = config.context;
  }

  async getAllVotes() {
    return this.models.Vote.findAll({
      order: [["createdAt", "DESC"]],
    });
  }

  async getVoteById(id) {
    return this.models.Vote.findByPk(id);
  }

  async getVotesByProject(projectId) {
    return this.models.Vote.findAll({
      where: { projectId },
      order: [["createdAt", "DESC"]],
    });
  }

  async getVotesByUser(userId) {
    return this.models.Vote.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });
  }

  async getUserVoteForProject(userId, projectId) {
    return this.models.Vote.findOne({
      where: {
        userId,
        projectId,
      },
    });
  }

  async createVote(voteData) {
    return this.models.Vote.create({
      id: uuidv4(),
      ...voteData,
      createdAt: new Date().toISOString(),
    });
  }

  async getCriteriaVotesByVote(voteId) {
    return this.models.CriteriaVote.findAll({
      where: { voteId },
    });
  }

  async createCriteriaVote(criteriaVoteData) {
    return this.models.CriteriaVote.create({
      id: uuidv4(),
      ...criteriaVoteData,
    });
  }

  async getVoteDistribution(projectId) {
    const votes = await this.getVotesByProject(projectId);

    const yesCount = votes.filter((vote) => vote.value === "YES").length;
    const noCount = votes.filter((vote) => vote.value === "NO").length;

    return {
      total: votes.length,
      yes: yesCount,
      no: noCount,
      yesPercentage: votes.length > 0 ? (yesCount / votes.length) * 100 : 0,
      noPercentage: votes.length > 0 ? (noCount / votes.length) * 100 : 0,
    };
  }

  async getCriteriaVoteDistribution(projectId, criteriaId) {
    // Get all votes for this project
    const votes = await this.getVotesByProject(projectId);

    // Get all criteria votes for these votes
    const voteIds = votes.map((vote) => vote.id);

    const criteriaVotes = await this.models.CriteriaVote.findAll({
      where: {
        voteId: voteIds,
        criteriaId,
      },
    });

    const yesCount = criteriaVotes.filter(
      (vote) => vote.value === "YES"
    ).length;
    const noCount = criteriaVotes.filter((vote) => vote.value === "NO").length;

    return {
      total: criteriaVotes.length,
      yes: yesCount,
      no: noCount,
      yesPercentage:
        criteriaVotes.length > 0 ? (yesCount / criteriaVotes.length) * 100 : 0,
      noPercentage:
        criteriaVotes.length > 0 ? (noCount / criteriaVotes.length) * 100 : 0,
    };
  }
}

module.exports = VoteAPI;
