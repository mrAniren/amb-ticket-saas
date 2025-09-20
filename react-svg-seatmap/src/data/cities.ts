// Данные городов по странам
export interface City {
  name: string;
  timezone: string;
}

export interface CountryCities {
  [countryCode: string]: City[];
}

// Города стран СНГ с их временными зонами
export const citiesByCountry: CountryCities = {
  'AZ': [
    { name: 'Баку', timezone: 'Asia/Baku' },
    { name: 'Гянджа', timezone: 'Asia/Baku' },
    { name: 'Сумгаит', timezone: 'Asia/Baku' },
    { name: 'Мингечаур', timezone: 'Asia/Baku' },
    { name: 'Ленкорань', timezone: 'Asia/Baku' },
    { name: 'Нахичевань', timezone: 'Asia/Baku' },
    { name: 'Шеки', timezone: 'Asia/Baku' },
    { name: 'Губа', timezone: 'Asia/Baku' },
    { name: 'Ширван', timezone: 'Asia/Baku' },
    { name: 'Евлах', timezone: 'Asia/Baku' }
  ],
  'AM': [
    { name: 'Ереван', timezone: 'Asia/Yerevan' },
    { name: 'Гюмри', timezone: 'Asia/Yerevan' },
    { name: 'Ванадзор', timezone: 'Asia/Yerevan' },
    { name: 'Вагаршапат', timezone: 'Asia/Yerevan' },
    { name: 'Раздан', timezone: 'Asia/Yerevan' },
    { name: 'Абовян', timezone: 'Asia/Yerevan' },
    { name: 'Капан', timezone: 'Asia/Yerevan' },
    { name: 'Армавир', timezone: 'Asia/Yerevan' },
    { name: 'Гавар', timezone: 'Asia/Yerevan' },
    { name: 'Арташат', timezone: 'Asia/Yerevan' }
  ],
  'BY': [
    { name: 'Минск', timezone: 'Europe/Minsk' },
    { name: 'Гомель', timezone: 'Europe/Minsk' },
    { name: 'Могилёв', timezone: 'Europe/Minsk' },
    { name: 'Витебск', timezone: 'Europe/Minsk' },
    { name: 'Гродно', timezone: 'Europe/Minsk' },
    { name: 'Брест', timezone: 'Europe/Minsk' },
    { name: 'Бобруйск', timezone: 'Europe/Minsk' },
    { name: 'Барановичи', timezone: 'Europe/Minsk' },
    { name: 'Борисов', timezone: 'Europe/Minsk' },
    { name: 'Пинск', timezone: 'Europe/Minsk' }
  ],
  'GE': [
    { name: 'Тбилиси', timezone: 'Asia/Tbilisi' },
    { name: 'Батуми', timezone: 'Asia/Tbilisi' },
    { name: 'Кутаиси', timezone: 'Asia/Tbilisi' },
    { name: 'Рустави', timezone: 'Asia/Tbilisi' },
    { name: 'Гори', timezone: 'Asia/Tbilisi' },
    { name: 'Зугдиди', timezone: 'Asia/Tbilisi' },
    { name: 'Поти', timezone: 'Asia/Tbilisi' },
    { name: 'Самтредиа', timezone: 'Asia/Tbilisi' },
    { name: 'Хашури', timezone: 'Asia/Tbilisi' },
    { name: 'Сенаки', timezone: 'Asia/Tbilisi' }
  ],
  'KZ': [
    { name: 'Алматы', timezone: 'Asia/Almaty' },
    { name: 'Нур-Султан', timezone: 'Asia/Almaty' },
    { name: 'Шымкент', timezone: 'Asia/Almaty' },
    { name: 'Актобе', timezone: 'Asia/Aqtobe' },
    { name: 'Тараз', timezone: 'Asia/Almaty' },
    { name: 'Павлодар', timezone: 'Asia/Almaty' },
    { name: 'Семей', timezone: 'Asia/Almaty' },
    { name: 'Усть-Каменогорск', timezone: 'Asia/Almaty' },
    { name: 'Уральск', timezone: 'Asia/Oral' },
    { name: 'Костанай', timezone: 'Asia/Qyzylorda' }
  ],
  'KG': [
    { name: 'Бишкек', timezone: 'Asia/Bishkek' },
    { name: 'Ош', timezone: 'Asia/Bishkek' },
    { name: 'Джалал-Абад', timezone: 'Asia/Bishkek' },
    { name: 'Токмок', timezone: 'Asia/Bishkek' },
    { name: 'Каракол', timezone: 'Asia/Bishkek' },
    { name: 'Узген', timezone: 'Asia/Bishkek' },
    { name: 'Балыкчы', timezone: 'Asia/Bishkek' },
    { name: 'Кара-Балта', timezone: 'Asia/Bishkek' },
    { name: 'Кант', timezone: 'Asia/Bishkek' },
    { name: 'Кызыл-Кия', timezone: 'Asia/Bishkek' }
  ],
  'MD': [
    { name: 'Кишинёв', timezone: 'Europe/Chisinau' },
    { name: 'Тирасполь', timezone: 'Europe/Chisinau' },
    { name: 'Бельцы', timezone: 'Europe/Chisinau' },
    { name: 'Бендеры', timezone: 'Europe/Chisinau' },
    { name: 'Рыбница', timezone: 'Europe/Chisinau' },
    { name: 'Кагул', timezone: 'Europe/Chisinau' },
    { name: 'Унгены', timezone: 'Europe/Chisinau' },
    { name: 'Сороки', timezone: 'Europe/Chisinau' },
    { name: 'Орхей', timezone: 'Europe/Chisinau' },
    { name: 'Комрат', timezone: 'Europe/Chisinau' }
  ],
  'RU': [
    { name: 'Москва', timezone: 'Europe/Moscow' },
    { name: 'Санкт-Петербург', timezone: 'Europe/Moscow' },
    { name: 'Новосибирск', timezone: 'Asia/Novosibirsk' },
    { name: 'Екатеринбург', timezone: 'Asia/Yekaterinburg' },
    { name: 'Казань', timezone: 'Europe/Moscow' },
    { name: 'Нижний Новгород', timezone: 'Europe/Moscow' },
    { name: 'Челябинск', timezone: 'Asia/Yekaterinburg' },
    { name: 'Самара', timezone: 'Europe/Samara' },
    { name: 'Омск', timezone: 'Asia/Omsk' },
    { name: 'Ростов-на-Дону', timezone: 'Europe/Moscow' },
    { name: 'Уфа', timezone: 'Asia/Yekaterinburg' },
    { name: 'Красноярск', timezone: 'Asia/Krasnoyarsk' },
    { name: 'Воронеж', timezone: 'Europe/Moscow' },
    { name: 'Пермь', timezone: 'Asia/Yekaterinburg' },
    { name: 'Волгоград', timezone: 'Europe/Volgograd' },
    { name: 'Краснодар', timezone: 'Europe/Moscow' },
    { name: 'Саратов', timezone: 'Europe/Saratov' },
    { name: 'Тюмень', timezone: 'Asia/Yekaterinburg' },
    { name: 'Тольятти', timezone: 'Europe/Samara' },
    { name: 'Ижевск', timezone: 'Europe/Samara' }
  ],
  'TJ': [
    { name: 'Душанбе', timezone: 'Asia/Dushanbe' },
    { name: 'Худжанд', timezone: 'Asia/Dushanbe' },
    { name: 'Бохтар', timezone: 'Asia/Dushanbe' },
    { name: 'Куляб', timezone: 'Asia/Dushanbe' },
    { name: 'Истаравшан', timezone: 'Asia/Dushanbe' },
    { name: 'Пенджикент', timezone: 'Asia/Dushanbe' },
    { name: 'Вахдат', timezone: 'Asia/Dushanbe' },
    { name: 'Исфара', timezone: 'Asia/Dushanbe' },
    { name: 'Турсунзаде', timezone: 'Asia/Dushanbe' },
    { name: 'Канибадам', timezone: 'Asia/Dushanbe' }
  ],
  'TM': [
    { name: 'Ашхабад', timezone: 'Asia/Ashgabat' },
    { name: 'Туркменабад', timezone: 'Asia/Ashgabat' },
    { name: 'Дашогуз', timezone: 'Asia/Ashgabat' },
    { name: 'Мары', timezone: 'Asia/Ashgabat' },
    { name: 'Балканабад', timezone: 'Asia/Ashgabat' },
    { name: 'Туркменбаши', timezone: 'Asia/Ashgabat' },
    { name: 'Байрамали', timezone: 'Asia/Ashgabat' },
    { name: 'Теджен', timezone: 'Asia/Ashgabat' },
    { name: 'Абадан', timezone: 'Asia/Ashgabat' },
    { name: 'Керки', timezone: 'Asia/Ashgabat' }
  ],
  'UZ': [
    { name: 'Ташкент', timezone: 'Asia/Tashkent' },
    { name: 'Наманган', timezone: 'Asia/Tashkent' },
    { name: 'Самарканд', timezone: 'Asia/Tashkent' },
    { name: 'Андижан', timezone: 'Asia/Tashkent' },
    { name: 'Бухара', timezone: 'Asia/Tashkent' },
    { name: 'Нукус', timezone: 'Asia/Samarkand' },
    { name: 'Карши', timezone: 'Asia/Tashkent' },
    { name: 'Коканд', timezone: 'Asia/Tashkent' },
    { name: 'Маргилан', timezone: 'Asia/Tashkent' },
    { name: 'Джизак', timezone: 'Asia/Tashkent' }
  ],
  'UA': [
    { name: 'Киев', timezone: 'Europe/Kiev' },
    { name: 'Харьков', timezone: 'Europe/Kiev' },
    { name: 'Одесса', timezone: 'Europe/Kiev' },
    { name: 'Днепр', timezone: 'Europe/Kiev' },
    { name: 'Донецк', timezone: 'Europe/Kiev' },
    { name: 'Запорожье', timezone: 'Europe/Kiev' },
    { name: 'Львов', timezone: 'Europe/Kiev' },
    { name: 'Кривой Рог', timezone: 'Europe/Kiev' },
    { name: 'Николаев', timezone: 'Europe/Kiev' },
    { name: 'Мариуполь', timezone: 'Europe/Kiev' }
  ]
};

// Функция для получения городов по коду страны
export const getCitiesByCountry = (countryCode: string): City[] => {
  return citiesByCountry[countryCode] || [];
};

// Функция для получения временной зоны по стране и городу
export const getTimezoneByCity = (countryCode: string, cityName: string): string | null => {
  const cities = getCitiesByCountry(countryCode);
  const city = cities.find(c => c.name === cityName);
  return city ? city.timezone : null;
};
