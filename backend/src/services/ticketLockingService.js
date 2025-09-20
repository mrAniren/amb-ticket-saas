const cron = require('node-cron');
const Session = require('../models/Session');

class TicketLockingService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
  }

  // Запуск автоматической блокировки билетов каждые 5 минут
  start() {
    if (this.isRunning) {
      console.log('🔒 Ticket locking service is already running');
      return;
    }

    // Запускаем каждые 5 минут
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      await this.lockTicketsForUpcomingSessions();
    }, {
      scheduled: false
    });

    this.cronJob.start();
    this.isRunning = true;
    
    console.log('🔒 Ticket locking service started - checking every 5 minutes');
  }

  // Остановка сервиса
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('🔒 Ticket locking service stopped');
  }

  // Ручная блокировка билетов для всех подходящих сессий
  async lockTicketsForUpcomingSessions() {
    try {
      console.log('🔒 Starting automatic ticket locking process...');
      
      const result = await Session.lockTicketsForUpcomingSessions();
      
      if (result.processed > 0) {
        const successfulLocks = result.results.filter(r => r.success).length;
        const lockedTickets = result.results
          .filter(r => r.success)
          .reduce((sum, r) => sum + (r.lockedCount || 0), 0);
        
        console.log(`✅ Automatic ticket locking completed:`, {
          sessionsProcessed: result.processed,
          successfulLocks: successfulLocks,
          totalTicketsLocked: lockedTickets
        });
      } else {
        console.log('ℹ️ No sessions require ticket locking at this time');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error in automatic ticket locking:', error);
      throw error;
    }
  }

  // Получение статуса сервиса
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.cronJob ? this.cronJob.nextDate() : null
    };
  }
}

// Создаем единственный экземпляр сервиса
const ticketLockingService = new TicketLockingService();

module.exports = ticketLockingService;
