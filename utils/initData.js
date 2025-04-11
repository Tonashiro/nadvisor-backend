// utils/initData.js
const { v4: uuidv4 } = require("uuid");

/**
 * Initialize default criteria if they don't exist
 * @param {Object} models - Sequelize models
 */
async function initializeCriteria(models) {
  try {
    const count = await models.Criteria.count();

    // Only add default criteria if none exist
    if (count === 0) {
      console.log("Initializing default criteria...");

      const defaultCriteria = [
        {
          id: uuidv4(),
          name: "Code Quality",
          description:
            "Assessment of the project's code quality, including readability, maintainability, and documentation.",
          weight: 1.0,
        },
        {
          id: uuidv4(),
          name: "Security",
          description:
            "Evaluation of security practices, audits, and potential vulnerabilities.",
          weight: 1.5,
        },
        {
          id: uuidv4(),
          name: "Team Transparency",
          description:
            "Level of transparency about the team, their backgrounds, and communication.",
          weight: 1.0,
        },
        {
          id: uuidv4(),
          name: "Tokenomics",
          description:
            "Assessment of the project's token economics and distribution model.",
          weight: 1.0,
        },
        {
          id: uuidv4(),
          name: "Community Engagement",
          description:
            "Evaluation of community size, activity, and team engagement with the community.",
          weight: 0.8,
        },
        {
          id: uuidv4(),
          name: "Innovation & Utility",
          description:
            "Assessment of the project's innovation and real-world utility.",
          weight: 1.2,
        },
        {
          id: uuidv4(),
          name: "Scam Detection",
          description: "Indicators of potential scam or fraudulent activity.",
          weight: 2.0,
        },
        {
          id: uuidv4(),
          name: "Rug Pull Risk",
          description:
            "Assessment of the risk factors that could lead to a rug pull.",
          weight: 2.0,
        },
      ];

      await models.Criteria.bulkCreate(defaultCriteria);
      console.log("✅ Default criteria initialized successfully");
    }
  } catch (error) {
    console.error("Error initializing criteria:", error);
  }
}

module.exports = {
  initializeCriteria,
};
