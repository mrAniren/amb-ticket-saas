module.exports = (sequelize, DataTypes) => {
  const Zone = sequelize.define('Zone', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    hall_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'halls',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: false,
      validate: {
        is: /^#[0-9A-F]{6}$/i
      }
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1000]
      }
    }
  }, {
    tableName: 'zones',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Zone;
};