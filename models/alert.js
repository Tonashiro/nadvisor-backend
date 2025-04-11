// models/alert.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "alert",
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
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      alertType: {
        type: DataTypes.ENUM("VERIFIED", "UNVERIFIED", "SCAM", "RUG"),
        allowNull: false,
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
          fields: ["alertType"],
        },
        {
          fields: ["createdAt"],
        },
      ],
    }
  );
};
