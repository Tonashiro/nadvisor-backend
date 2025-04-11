// models/index.js
const { Sequelize } = require("sequelize");

// Import model definitions
const ProjectModel = require("./project");
const UserModel = require("./user");
const VoteModel = require("./vote");
const CriteriaModel = require("./criteria");
const CriteriaVoteModel = require("./criteriaVote");
const AlertModel = require("./alert");

// Initialize Sequelize with database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Initialize models
const Project = ProjectModel(sequelize, Sequelize.DataTypes);
const User = UserModel(sequelize, Sequelize.DataTypes);
const Vote = VoteModel(sequelize, Sequelize.DataTypes);
const Criteria = CriteriaModel(sequelize, Sequelize.DataTypes);
const CriteriaVote = CriteriaVoteModel(sequelize, Sequelize.DataTypes);
const Alert = AlertModel(sequelize, Sequelize.DataTypes);

// Define relationships
Project.hasMany(Vote, { foreignKey: "projectId" });
Vote.belongsTo(Project, { foreignKey: "projectId" });

User.hasMany(Vote, { foreignKey: "userId" });
Vote.belongsTo(User, { foreignKey: "userId" });

Vote.hasMany(CriteriaVote, { foreignKey: "voteId" });
CriteriaVote.belongsTo(Vote, { foreignKey: "voteId" });

Criteria.hasMany(CriteriaVote, { foreignKey: "criteriaId" });
CriteriaVote.belongsTo(Criteria, { foreignKey: "criteriaId" });

Project.hasMany(Alert, { foreignKey: "projectId" });
Alert.belongsTo(Project, { foreignKey: "projectId" });

// Test database connection
sequelize
  .authenticate()
  .then(() => {
    console.log("Database connection has been established successfully.");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

// Export models and Sequelize instance
const models = {
  Project,
  User,
  Vote,
  Criteria,
  CriteriaVote,
  Alert,
  sequelize,
};

module.exports = models;
