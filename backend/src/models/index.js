// Экспорт всех моделей для удобного импорта
const User = require('./User');
const Hall = require('./Hall');
const Event = require('./Event');
const Session = require('./Session');
const PriceScheme = require('./PriceScheme');
const PromoCode = require('./PromoCode');

module.exports = {
  User,
  Hall,
  Event,
  Session,
  PriceScheme,
  PromoCode
};