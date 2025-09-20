'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Создание таблицы users
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      username: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      role: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'admin'
      },
      last_login: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Создание таблицы files
    await queryInterface.createTable('files', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      filename: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      original_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      file_type: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Создание таблицы halls
    await queryInterface.createTable('halls', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      city: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      photo_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      svg_file_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'files',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      seat_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      last_modified: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Создание таблицы zones
    await queryInterface.createTable('zones', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      hall_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'halls',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: false
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Создание таблицы seats
    await queryInterface.createTable('seats', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      hall_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'halls',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      zone_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'zones',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      svg_element_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      css_selector: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      seat_number: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      row_number: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      object_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'seat'
      },
      display_group: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      temp_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      original_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Создание индексов
    await queryInterface.addIndex('halls', ['name']);
    await queryInterface.addIndex('seats', ['hall_id']);
    await queryInterface.addIndex('seats', ['zone_id']);
    await queryInterface.addIndex('zones', ['hall_id']);
    await queryInterface.addIndex('files', ['file_type']);
    
    // Добавление ограничений
    await queryInterface.addConstraint('users', {
      fields: ['role'],
      type: 'check',
      where: {
        role: ['admin']
      }
    });

    await queryInterface.addConstraint('files', {
      fields: ['file_type'],
      type: 'check',
      where: {
        file_type: ['svg', 'photo']
      }
    });

    await queryInterface.addConstraint('seats', {
      fields: ['object_type'],
      type: 'check',
      where: {
        object_type: ['seat', 'scene', 'decoration', 'passage']
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('seats');
    await queryInterface.dropTable('zones');
    await queryInterface.dropTable('halls');
    await queryInterface.dropTable('files');
    await queryInterface.dropTable('users');
  }
};