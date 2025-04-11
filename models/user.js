// models/user.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "user",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      walletAddress: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEthereumAddress(value) {
            if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
              throw new Error("Invalid Ethereum address");
            }
          },
        },
      },
      discordId: {
        type: DataTypes.STRING,
        unique: true,
      },
      hasMonRole: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      isTrustedVoter: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
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
          fields: ["walletAddress"],
        },
        {
          fields: ["discordId"],
        },
      ],
    }
  );
};
