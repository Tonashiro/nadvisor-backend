// models/criteria.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "criteria",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      weight: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1.0,
        validate: {
          min: 0.1,
          max: 10.0,
        },
      },
    },
    {
      timestamps: true,
      indexes: [
        {
          fields: ["name"],
        },
      ],
    }
  );
};
