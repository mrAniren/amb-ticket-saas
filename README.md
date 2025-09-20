# AMB Ticket SaaS Platform

Полнофункциональная SaaS платформа для продажи билетов с интерактивными схемами залов, управлением событиями и встроенными виджетами.

## 🚀 Основные возможности

### 🎫 Управление билетами
- Создание и управление событиями
- Интерактивные SVG схемы залов с выбором мест
- Система ценовых схем и зон
- Промо-коды и скидки
- Онлайн и оффлайн продажи

### 🏛️ Управление залами
- Загрузка и редактирование SVG схем залов
- Автоматическое распознавание мест
- Группировка мест по зонам
- Настройка цен для разных зон

### 💳 Платежи и заказы
- Интеграция с платежными системами
- Управление заказами и клиентами
- Генерация PDF билетов с QR-кодами
- Система бронирования мест

### 📊 Аналитика и отчеты
- Статистика продаж
- Отчеты по событиям
- Управление клиентской базой
- Экспорт данных

### 🔧 Интеграции
- Встраиваемые виджеты для внешних сайтов
- Facebook Pixel интеграция
- API для внешних систем
- Поддержка мультивалютности

## 🏗️ Архитектура

### Backend (Node.js/Express)
- **Framework**: Express.js
- **Database**: PostgreSQL с Sequelize ORM
- **Authentication**: JWT токены
- **File Storage**: Локальное хранилище с поддержкой различных форматов
- **PDF Generation**: Автоматическая генерация билетов
- **QR Codes**: Генерация уникальных QR-кодов для билетов

### Frontend (React/TypeScript)
- **Framework**: React 18 с TypeScript
- **Build Tool**: Vite
- **Styling**: SCSS модули
- **State Management**: React Hooks и Context API
- **SVG Handling**: Кастомные компоненты для работы с интерактивными схемами
- **Responsive Design**: Адаптивный дизайн для всех устройств

## 📦 Установка и запуск

### Предварительные требования
- Node.js 16+
- PostgreSQL 12+
- npm или yarn

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Настройте переменные окружения в .env
npm run migrate
npm start
```

### Frontend
```bash
cd react-svg-seatmap
npm install
cp .env.example .env
# Настройте переменные окружения в .env
npm run dev
```

## 🔧 Конфигурация

### Backend Environment Variables
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=amb_ticket
DB_USERNAME=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
UPLOAD_PATH=./uploads
```

### Frontend Environment Variables
```env
VITE_API_URL=http://localhost:3001
VITE_APP_TITLE=AMB Ticket Platform
```

## 📚 Структура проекта

```
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/     # Контроллеры API
│   │   ├── models/         # Sequelize модели
│   │   ├── routes/         # API маршруты
│   │   ├── middleware/     # Промежуточное ПО
│   │   ├── services/       # Бизнес-логика
│   │   └── utils/          # Утилиты
│   ├── data/               # Начальные данные
│   ├── uploads/            # Загруженные файлы
│   └── migrations/         # Миграции БД
│
├── react-svg-seatmap/      # React frontend
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── pages/          # Страницы приложения
│   │   ├── hooks/          # Кастомные хуки
│   │   ├── services/       # API сервисы
│   │   ├── types/          # TypeScript типы
│   │   └── utils/          # Утилиты
│   └── public/             # Статические файлы
```

## 🎨 Ключевые компоненты

### Интерактивные схемы залов
- `RawSeatmap` - Базовый компонент для отображения SVG схем
- `PriceCanvas` - Компонент для настройки цен на места
- `SeatEditor` - Редактор для создания и изменения схем

### Управление событиями
- `EventCreatePage` - Создание новых событий
- `SessionCreatePage` - Создание сеансов для событий
- `PriceSchemeManager` - Управление ценовыми схемами

### Продажа билетов
- `EmbedTicketSalesPage` - Встраиваемый виджет продаж
- `PaymentForm` - Форма оплаты билетов
- `TicketDownload` - Скачивание PDF билетов

## 🔌 API Endpoints

### События
- `GET /api/events` - Список событий
- `POST /api/events` - Создание события
- `PUT /api/events/:id` - Обновление события
- `DELETE /api/events/:id` - Удаление события

### Залы
- `GET /api/halls` - Список залов
- `POST /api/halls` - Создание зала
- `PUT /api/halls/:id` - Обновление зала

### Заказы
- `GET /api/orders` - Список заказов
- `POST /api/orders` - Создание заказа
- `GET /api/orders/:id/tickets` - Получение билетов

### Файлы
- `POST /api/files/upload` - Загрузка файлов
- `GET /api/files/:filename` - Получение файла

## 🛠️ Разработка

### Запуск в режиме разработки
```bash
# Backend
cd backend && npm run dev

# Frontend
cd react-svg-seatmap && npm run dev
```

### Сборка для продакшена
```bash
# Backend
cd backend && npm run build

# Frontend
cd react-svg-seatmap && npm run build
```

## 📝 Лицензия

Этот проект распространяется под лицензией MIT. См. файл [LICENSE](LICENSE) для подробной информации.

## 🤝 Участие в разработке

1. Форкните репозиторий
2. Создайте ветку для новой функции (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📞 Поддержка

Если у вас есть вопросы или предложения, создайте [Issue](https://github.com/mrAniren/amb-ticket-saas/issues) в репозитории.

---

**AMB Ticket SaaS Platform** - современное решение для организации продажи билетов с интуитивно понятным интерфейсом и мощным функционалом.
