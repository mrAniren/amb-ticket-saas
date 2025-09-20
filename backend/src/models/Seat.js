module.exports = (sequelize, DataTypes) => {
  const Seat = sequelize.define('Seat', {
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
    zone_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'zones',
        key: 'id'
      }
    },
    svg_element_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    css_selector: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    seat_number: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    row_number: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    object_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'seat',
      validate: {
        isIn: [['seat', 'scene', 'decoration', 'passage']]
      }
    },
    display_group: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    temp_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    original_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'seats',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Seat;
};