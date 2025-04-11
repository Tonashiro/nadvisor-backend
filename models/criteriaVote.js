// models/criteriaVote.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "criteriaVote",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      voteId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "votes",
          key: "id",
        },
      },
      criteriaId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "criteria",
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
    },
    {
      timestamps: true,
      indexes: [
        {
          fields: ["voteId"],
        },
        {
          fields: ["criteriaId"],
        },
        {
          // Ensure one vote per criteria per main vote
          fields: ["voteId", "criteriaId"],
          unique: true,
        },
      ],
    }
  );
};
