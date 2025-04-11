// models/project.js
const { DataTypes, Op } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "project",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      website: {
        type: DataTypes.STRING,
      },
      github: {
        type: DataTypes.STRING,
      },
      twitter: {
        type: DataTypes.STRING,
      },
      telegram: {
        type: DataTypes.STRING,
      },
      discord: {
        type: DataTypes.STRING,
      },
      contractAddress: {
        type: DataTypes.STRING,
      },
      status: {
        type: DataTypes.ENUM(
          "PENDING",
          "VERIFIED",
          "UNVERIFIED",
          "SCAM",
          "RUG"
        ),
        defaultValue: "PENDING",
        allowNull: false,
      },
      creatorId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      timestamps: true,
      indexes: [
        {
          fields: ["status"],
        },
        {
          fields: ["contractAddress"],
          unique: true,
          where: {
            contractAddress: {
              [Op.ne]: null,
            },
          },
        },
      ],
    }
  );
};
