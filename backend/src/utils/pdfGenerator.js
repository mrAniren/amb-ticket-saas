const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs').promises;
const QRCodeGenerator = require('./qrCodeGenerator');

class PDFGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '../../uploads/tickets');
    this.logoPath = path.join(__dirname, '../../uploads/logo/лого горизонтальное.png');
    this.qrGenerator = new QRCodeGenerator();
    this.ensureOutputDir();
    
    // Пути к шрифтам Roboto
    this.robotoRegular = path.join(__dirname, '../../fonts/Roboto-Regular.ttf');
    this.robotoBold = path.join(__dirname, '../../fonts/Roboto-Bold.ttf');
  }

  async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'qr'), { recursive: true });
    } catch (error) {
      console.error('Ошибка создания директории для билетов:', error);
    }
  }

  /**
   * Генерирует PDF билет
   * @param {Object} ticketData - Данные билета
   * @returns {Promise<string>} - Путь к созданному PDF файлу
   */
  async generateTicket(ticketData) {
    try {
      const {
        ticketId,
        eventName,
        eventDate,
        eventTime,
        hallName,
        hallAddress,
        seatSection,
        seatRow,
        seatNumber,
        price,
        currency = 'RUB',
        buyerName,
        buyerEmail,
        purchaseDate,
        orderNumber,
        isInvitation = false, // Новый параметр для приглашений
        notes = '' // Примечания для приглашений
      } = ticketData;

      console.log('📄 Начинаем генерацию PDF для билета:', ticketId);

      // Создаем PDF документ
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      // Регистрируем шрифты Roboto
      doc.registerFont('Roboto', this.robotoRegular);
      doc.registerFont('Roboto-Bold', this.robotoBold);

      // Путь для сохранения PDF
      const filename = `ticket_${ticketId}.pdf`;
      const filepath = path.join(this.outputDir, filename);
      
      // Создаем поток для записи
      const stream = require('fs').createWriteStream(filepath);
      doc.pipe(stream);

      // Генерируем QR-код
      console.log('🔲 Генерируем QR-код...');
      const qrBuffer = await this.qrGenerator.generateQRCodeBuffer(ticketId, {
        size: 200,
        margin: 2
      });
      console.log('✅ QR-код сгенерирован, размер:', qrBuffer.length, 'байт');

      // Рисуем билет
      console.log('🎨 Рисуем содержимое билета...');
      console.log('🎫 Данные для билета:', { 
        ticketId, 
        seatSection, 
        seatRow, 
        seatNumber,
        seatId: ticketData.seatId || 'НЕТ SEATID'
      });
      await this.drawTicket(doc, {
        ticketId,
        eventName,
        eventDate,
        eventTime,
        hallName,
        hallAddress,
        seatSection,
        seatRow,
        seatNumber,
        seatId: ticketData.seatId, // Добавляем seatId в данные
        price,
        currency,
        buyerName,
        buyerEmail,
        purchaseDate,
        orderNumber,
        qrBuffer,
        isInvitation, // Передаем флаг приглашения
        notes // Передаем примечания
      });
      console.log('✅ Содержимое билета нарисовано');

      // Завершаем PDF
      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          console.log(`✅ PDF билет создан: ${filepath}`);
          // Проверяем размер файла
          fs.stat(filepath).then(stats => {
            console.log(`📊 Размер PDF файла: ${stats.size} байт`);
            resolve(filepath);
          }).catch(err => {
            console.error('❌ Ошибка проверки размера файла:', err);
            resolve(filepath);
          });
        });
        
        stream.on('error', (error) => {
          console.error('❌ Ошибка создания PDF:', error);
          reject(error);
        });
      });

    } catch (error) {
      console.error('❌ Ошибка генерации PDF билета:', error);
      throw new Error(`Не удалось создать PDF билет: ${error.message}`);
    }
  }

  /**
   * Рисует содержимое билета
   * @param {PDFDocument} doc - PDF документ
   * @param {Object} data - Данные для отрисовки
   */
  async drawTicket(doc, data) {
    const {
      ticketId,
      eventName,
      eventDate,
      eventTime,
      hallName,
      hallAddress,
      seatSection,
      seatRow,
      seatNumber,
      seatId, // Добавляем seatId
      price,
      currency,
      buyerName,
      buyerEmail,
      purchaseDate,
      orderNumber,
      qrBuffer,
      isInvitation = false, // Флаг приглашения
      notes = '' // Примечания
    } = data;

    // Размеры страницы
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 40;

    console.log('🎫 drawTicket получил данные:', { 
      seatId, 
      seatSection, 
      seatRow, 
      seatNumber,
      isSpecialZone: seatId && seatId.includes('_seat_')
    });

    // Цвета
    const primaryColor = '#000000';
    const secondaryColor = '#666666';
    const lightGray = '#f5f5f5';
    
    // Устанавливаем шрифт, поддерживающий кириллицу
    doc.font('Roboto');

    // 1. Шапка с логотипом и QR-кодом
    await this.drawHeader(doc, pageWidth, margin, qrBuffer);

    // 2. Номер билета
    this.drawTicketNumber(doc, ticketId, pageWidth, margin, 100);

    // 3. Информация о покупке
    this.drawPurchaseInfo(doc, {
      buyerName,
      buyerEmail,
      purchaseDate,
      ticketId,
      price,
      currency,
      isInvitation,
      notes
    }, pageWidth, margin, 140);

    // 4. Информация о мероприятии (центрированная)
    this.drawEventInfo(doc, {
      eventName,
      eventDate,
      eventTime,
      hallName,
      hallAddress
    }, pageWidth, margin, 220);

    // 5. Информация о месте (в три колонки)
    this.drawSeatInfo(doc, {
      seatSection,
      seatRow,
      seatNumber,
      seatId: data.seatId // Передаем seatId для определения типа места
    }, pageWidth, margin, 350);

    // 6. Разделительная линия
    this.drawDashedLine(doc, pageWidth, margin, 420);

    // 7. Правила
    this.drawRules(doc, pageWidth, margin, 440);
  }

  /**
   * Рисует шапку с логотипом и QR-кодом
   */
  async drawHeader(doc, pageWidth, margin, qrBuffer) {
    try {
      // Проверяем существование логотипа
      console.log('🖼️ Проверяем логотип по пути:', this.logoPath);
      await fs.access(this.logoPath);
      
      // Добавляем логотип
      console.log('✅ Логотип найден, добавляем в PDF');
      doc.image(this.logoPath, margin, margin, {
        width: 225, // 150 * 1.5
        height: 68, // 45 * 1.5
        fit: [225, 68]
      });
    } catch (error) {
      // Если логотип не найден, рисуем текстовый заголовок
      console.log('⚠️ Логотип не найден, используем текстовый заголовок:', error.message);
      doc.fontSize(30) // 20 * 1.5
         .font('Roboto-Bold')
         .fillColor('#000000')
         .text('INTICKETS', margin, margin + 10);
    }

    // QR-код в правом верхнем углу
    if (qrBuffer) {
      doc.image(qrBuffer, pageWidth - margin - 80, margin, {
        width: 60,
        height: 60
      });
    }
  }

  /**
   * Рисует номер билета
   */
  drawTicketNumber(doc, ticketId, pageWidth, margin, y) {
    doc.fontSize(14)
       .font('Roboto-Bold')
       .fillColor('#000000')
       .text(`Электронный билет № ${ticketId}`, margin, y);
  }

  /**
   * Рисует информацию о покупке
   */
  drawPurchaseInfo(doc, data, pageWidth, margin, y) {
    const { buyerName, buyerEmail, purchaseDate, ticketId, price, currency, isInvitation, notes } = data;
    
    doc.fontSize(12)
       .font('Roboto')
       .fillColor('#000000')
       .text(`Покупатель: ${buyerName}`, margin, y)
       .text(`Дата покупки: ${this.formatDate(purchaseDate)}`, margin, y + 15);
    
    if (isInvitation) {
      // Для приглашений показываем тип и примечания
      doc.fontSize(14)
         .font('Roboto-Bold')
         .fillColor('#000000') // Черный цвет для приглашений
         .text('ПРИГЛАШЕНИЕ', margin, y + 30);
      
      if (notes && notes.trim()) {
        doc.fontSize(10)
           .font('Roboto')
           .fillColor('#666666')
           .text(`Примечание: ${notes}`, margin, y + 50, {
             width: pageWidth - 2 * margin
           });
      }
    } else {
      // Для обычных билетов показываем стоимость
      doc.text(`Стоимость: ${price} ${currency}`, margin, y + 30);
    }
  }

  /**
   * Рисует информацию о мероприятии
   */
  drawEventInfo(doc, data, pageWidth, margin, y) {
    const { eventName, eventDate, eventTime, hallName, hallAddress } = data;
    
    // Название мероприятия (центрированное)
    doc.fontSize(20)
       .font('Roboto-Bold')
       .fillColor('#000000')
       .text(eventName.toUpperCase(), margin, y, {
         align: 'center',
         width: pageWidth - 2 * margin
       });

    // Дата и время (улучшенная верстка)
    const eventY = y + 40;
    const centerX = pageWidth / 2;
    
    // Большая цифра даты
    const day = new Date(eventDate).getDate();
    doc.fontSize(32)
       .font('Roboto-Bold')
       .fillColor('#000000')
       .text(day.toString(), margin, eventY);
    
    // Месяц под датой
    const month = new Date(eventDate).toLocaleDateString('ru-RU', { month: 'long' });
    doc.fontSize(14)
       .font('Roboto-Bold')
       .text(month, margin, eventY + 35);
    
    // Время рядом с датой
    const timeX = margin + 120; // Позиция времени рядом с датой
    doc.fontSize(12)
       .font('Roboto-Bold')
       .text('Начало', timeX, eventY)
       .fontSize(18)
       .text(eventTime, timeX, eventY + 15);
    
    // Разделительная линия между временем и залом
    const lineX = centerX - 30;
    doc.moveTo(lineX, eventY - 5)
       .lineTo(lineX, eventY + 25)
       .stroke();
    
    // Зал и адрес справа (больше места)
    const hallX = centerX + 20; // Ближе к центру для большего пространства
    doc.fontSize(12)
       .font('Roboto-Bold')
       .text(hallName, hallX, eventY)
       .fontSize(10)
       .font('Roboto')
       .text(hallAddress || '', hallX, eventY + 15, {
         width: 200 // Увеличили ширину для длинных адресов
       });
  }

  /**
   * Рисует информацию о месте (в три колонки)
   */
  drawSeatInfo(doc, data, pageWidth, margin, y) {
    const { seatSection, seatRow, seatNumber, seatId } = data;
    
    const centerX = pageWidth / 2;
    const colWidth = 120;
    
    // Проверяем, является ли это специальной зоной (виртуальное место)
    const isSpecialZone = seatId && seatId.includes('_seat_');
    
    console.log('🎫 drawSeatInfo:', { 
      seatId, 
      isSpecialZone, 
      seatSection, 
      seatRow, 
      seatNumber,
      seatIdType: typeof seatId,
      seatIdLength: seatId ? seatId.length : 'undefined',
      containsSeat: seatId ? seatId.includes('_seat_') : false
    });
    
    if (isSpecialZone) {
      // Для специальных зон показываем только секцию
      doc.fontSize(16)
         .font('Roboto-Bold')
         .fillColor('#000000')
         .text(seatSection.toUpperCase(), margin, y)
         .fontSize(12)
         .font('Roboto')
         .text('Сектор', margin, y + 20);
    } else {
      // Для обычных мест показываем все три колонки
      // Сектор (левая колонка)
      doc.fontSize(16)
         .font('Roboto-Bold')
         .fillColor('#000000')
         .text(seatSection.toUpperCase(), margin, y)
         .fontSize(12)
         .font('Roboto')
         .text('Сектор', margin, y + 20);
      
      // Ряд (средняя колонка)
      doc.fontSize(16)
         .font('Roboto-Bold')
         .text(seatRow.toString(), centerX - colWidth/2, y)
         .fontSize(12)
         .font('Roboto')
         .text('Ряд', centerX - colWidth/2, y + 20);
      
      // Место (правая колонка)
      doc.fontSize(16)
         .font('Roboto-Bold')
         .text(seatNumber.toString(), centerX + colWidth/2, y)
         .fontSize(12)
         .font('Roboto')
         .text('Место', centerX + colWidth/2, y + 20);
    }
  }

  /**
   * Рисует правила
   */
  drawRules(doc, pageWidth, margin, y) {
    const rules = [
      'Правила пользования электронным билетом',
      'Внимание! Повторный проход по копии электронного билета невозможен.',
      '1. Вся страница является билетом на мероприятие.',
      '2. Данная форма билета согласована с организатором мероприятия, является полноценным аналогом билета на фирменном бланке и дает право на посещение мероприятия покупателю.',
      '3. Организатор мероприятия не несет ответственности за любые сложности, вызванные передачей другому лицу билета, информации или копированием билета.',
      '4. Организатор мероприятия оставляет за собой право отказать в проходе на мероприятие всем владельцам билетов с одинаковым штрих-кодом в случае пренебрежения правилами пользования электронного билета.'
    ];

    // Заголовок правил
    doc.fontSize(12)
       .font('Roboto-Bold')
       .fillColor('#000000')
       .text(rules[0], margin, y);

    // Предупреждение
    doc.fontSize(10)
       .font('Roboto-Bold')
       .text(rules[1], margin, y + 20);

    // Правила
    doc.fontSize(10)
       .font('Roboto')
       .text(rules[2], margin, y + 40)
       .text(rules[3], margin, y + 55, { width: pageWidth - 2 * margin })
       .text(rules[4], margin, y + 85, { width: pageWidth - 2 * margin })
       .text(rules[5], margin, y + 115, { width: pageWidth - 2 * margin });
  }

  /**
   * Рисует пунктирную линию
   */
  drawDashedLine(doc, pageWidth, margin, y) {
    const dashLength = 5;
    const gapLength = 3;
    const lineLength = pageWidth - 2 * margin;
    
    let currentX = margin;
    while (currentX < pageWidth - margin) {
      doc.moveTo(currentX, y)
         .lineTo(Math.min(currentX + dashLength, pageWidth - margin), y)
         .stroke();
      currentX += dashLength + gapLength;
    }
  }

  /**
   * Форматирует дату
   */
  formatDate(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Форматирует дату мероприятия
   */
  formatEventDate(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    const day = date.getDate();
    const month = date.toLocaleDateString('ru-RU', { month: 'long' });
    return `${day} ${month}`;
  }

  /**
   * Удаляет PDF файл
   */
  async deleteTicket(ticketId) {
    try {
      const filename = `ticket_${ticketId}.pdf`;
      const filepath = path.join(this.outputDir, filename);
      
      await fs.unlink(filepath);
      console.log(`✅ PDF билет удален: ${filepath}`);
      return true;

    } catch (error) {
      console.error('❌ Ошибка удаления PDF билета:', error);
      return false;
    }
  }

  /**
   * Проверяет существование PDF файла
   */
  async ticketExists(ticketId) {
    try {
      const filename = `ticket_${ticketId}.pdf`;
      const filepath = path.join(this.outputDir, filename);
      
      await fs.access(filepath);
      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Получает путь к PDF файлу
   */
  getTicketPath(ticketId) {
    const filename = `ticket_${ticketId}.pdf`;
    return path.join(this.outputDir, filename);
  }
}

module.exports = PDFGenerator;