const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

class QRCodeGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '../../uploads/tickets/qr');
    this.ensureOutputDir();
  }

  async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error('Ошибка создания директории для QR-кодов:', error);
    }
  }

  /**
   * Генерирует QR-код для билета
   * @param {string} ticketId - ID билета
   * @param {Object} options - Опции генерации
   * @returns {Promise<string>} - Путь к файлу QR-кода
   */
  async generateQRCode(ticketId, options = {}) {
    try {
      const {
        size = 200,
        margin = 2,
        color = {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel = 'M'
      } = options;

      // Создаем QR-код как буфер
      const qrBuffer = await QRCode.toBuffer(ticketId, {
        type: 'png',
        width: size,
        margin: margin,
        color: color,
        errorCorrectionLevel: errorCorrectionLevel
      });

      // Сохраняем файл
      const filename = `qr_${ticketId}.png`;
      const filepath = path.join(this.outputDir, filename);
      
      await fs.writeFile(filepath, qrBuffer);
      
      console.log(`✅ QR-код создан: ${filepath}`);
      return filepath;

    } catch (error) {
      console.error('❌ Ошибка генерации QR-кода:', error);
      throw new Error(`Не удалось создать QR-код: ${error.message}`);
    }
  }

  /**
   * Генерирует QR-код как base64 строку
   * @param {string} ticketId - ID билета
   * @param {Object} options - Опции генерации
   * @returns {Promise<string>} - Base64 строка QR-кода
   */
  async generateQRCodeBase64(ticketId, options = {}) {
    try {
      const {
        size = 200,
        margin = 2,
        color = {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel = 'M'
      } = options;

      const qrBase64 = await QRCode.toDataURL(ticketId, {
        type: 'png',
        width: size,
        margin: margin,
        color: color,
        errorCorrectionLevel: errorCorrectionLevel
      });

      return qrBase64;

    } catch (error) {
      console.error('❌ Ошибка генерации QR-кода base64:', error);
      throw new Error(`Не удалось создать QR-код: ${error.message}`);
    }
  }

  /**
   * Генерирует QR-код для встраивания в PDF
   * @param {string} ticketId - ID билета
   * @param {Object} options - Опции генерации
   * @returns {Promise<Buffer>} - Буфер с QR-кодом
   */
  async generateQRCodeBuffer(ticketId, options = {}) {
    try {
      const {
        size = 200,
        margin = 2,
        color = {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel = 'M'
      } = options;

      const qrBuffer = await QRCode.toBuffer(ticketId, {
        type: 'png',
        width: size,
        margin: margin,
        color: color,
        errorCorrectionLevel: errorCorrectionLevel
      });

      return qrBuffer;

    } catch (error) {
      console.error('❌ Ошибка генерации QR-кода buffer:', error);
      throw new Error(`Не удалось создать QR-код: ${error.message}`);
    }
  }

  /**
   * Удаляет QR-код файл
   * @param {string} ticketId - ID билета
   * @returns {Promise<boolean>} - Успешность удаления
   */
  async deleteQRCode(ticketId) {
    try {
      const filename = `qr_${ticketId}.png`;
      const filepath = path.join(this.outputDir, filename);
      
      await fs.unlink(filepath);
      console.log(`✅ QR-код удален: ${filepath}`);
      return true;

    } catch (error) {
      console.error('❌ Ошибка удаления QR-кода:', error);
      return false;
    }
  }

  /**
   * Проверяет существование QR-кода
   * @param {string} ticketId - ID билета
   * @returns {Promise<boolean>} - Существует ли файл
   */
  async qrCodeExists(ticketId) {
    try {
      const filename = `qr_${ticketId}.png`;
      const filepath = path.join(this.outputDir, filename);
      
      await fs.access(filepath);
      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Получает путь к QR-коду
   * @param {string} ticketId - ID билета
   * @returns {string} - Путь к файлу
   */
  getQRCodePath(ticketId) {
    const filename = `qr_${ticketId}.png`;
    return path.join(this.outputDir, filename);
  }

  /**
   * Очищает старые QR-коды (старше указанного количества дней)
   * @param {number} daysOld - Количество дней
   * @returns {Promise<number>} - Количество удаленных файлов
   */
  async cleanupOldQRCodes(daysOld = 30) {
    try {
      const files = await fs.readdir(this.outputDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      let deletedCount = 0;
      
      for (const file of files) {
        if (file.startsWith('qr_') && file.endsWith('.png')) {
          const filepath = path.join(this.outputDir, file);
          const stats = await fs.stat(filepath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filepath);
            deletedCount++;
            console.log(`🗑️ Удален старый QR-код: ${file}`);
          }
        }
      }
      
      console.log(`✅ Очищено QR-кодов: ${deletedCount}`);
      return deletedCount;

    } catch (error) {
      console.error('❌ Ошибка очистки QR-кодов:', error);
      return 0;
    }
  }
}

module.exports = QRCodeGenerator;
