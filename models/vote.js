// models/vote.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "vote",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      projectId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "projects",
          key: "id",
        },
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      value: {
        type: DataTypes.ENUM("YES", "NO"),
        allowNull: false,
      },
      comment: {
        type: DataTypes.TEXT,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      timestamps: true,
      updatedAt: false,
      indexes: [
        {
          fields: ["projectId"],
        },
        {
          fields: ["userId"],
        },
        {
          // Ensure one vote per user per project
          fields: ["projectId", "userId"],
          unique: true,
        },
      ],
    }
  );
};
