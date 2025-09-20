import React from 'react';
import Select from 'react-select';

// Расширенный список валют мира
const currencyOptions = [
  // Основные мировые валюты
  { value: 'USD', label: 'Доллар США ($)', symbol: '$' },
  { value: 'EUR', label: 'Евро (€)', symbol: '€' },
  { value: 'GBP', label: 'Британский фунт (£)', symbol: '£' },
  { value: 'JPY', label: 'Японская иена (¥)', symbol: '¥' },
  { value: 'CHF', label: 'Швейцарский франк (CHF)', symbol: 'CHF' },
  
  // СНГ и Восточная Европа
  { value: 'RUB', label: 'Российский рубль (₽)', symbol: '₽' },
  { value: 'UAH', label: 'Украинская гривна (₴)', symbol: '₴' },
  { value: 'BYN', label: 'Белорусский рубль (Br)', symbol: 'Br' },
  { value: 'KZT', label: 'Казахстанский тенге (₸)', symbol: '₸' },
  { value: 'KGS', label: 'Кыргызский сом (сом)', symbol: 'сом' },
  { value: 'AMD', label: 'Армянский драм (֏)', symbol: '֏' },
  { value: 'GEL', label: 'Грузинский лари (₾)', symbol: '₾' },
  { value: 'AZN', label: 'Азербайджанский манат (₼)', symbol: '₼' },
  { value: 'TJS', label: 'Таджикский сомони (SM)', symbol: 'SM' },
  { value: 'TMT', label: 'Туркменский манат (T)', symbol: 'T' },
  { value: 'UZS', label: 'Узбекский сум (сум)', symbol: 'сум' },
  { value: 'MDL', label: 'Молдавский лей (L)', symbol: 'L' },
  
  // Европа
  { value: 'SEK', label: 'Шведская крона (kr)', symbol: 'kr' },
  { value: 'NOK', label: 'Норвежская крона (kr)', symbol: 'kr' },
  { value: 'DKK', label: 'Датская крона (kr)', symbol: 'kr' },
  { value: 'PLN', label: 'Польский злотый (zł)', symbol: 'zł' },
  { value: 'CZK', label: 'Чешская крона (Kč)', symbol: 'Kč' },
  { value: 'HUF', label: 'Венгерский форинт (Ft)', symbol: 'Ft' },
  { value: 'BGN', label: 'Болгарский лев (лв)', symbol: 'лв' },
  { value: 'RON', label: 'Румынский лей (lei)', symbol: 'lei' },
  { value: 'HRK', label: 'Хорватская куна (kn)', symbol: 'kn' },
  { value: 'RSD', label: 'Сербский динар (дин)', symbol: 'дин' },
  { value: 'BAM', label: 'Боснийская марка (КМ)', symbol: 'КМ' },
  { value: 'MKD', label: 'Македонский денар (ден)', symbol: 'ден' },
  { value: 'ALL', label: 'Албанский лек (L)', symbol: 'L' },
  { value: 'ISK', label: 'Исландская крона (kr)', symbol: 'kr' },
  
  // Азия
  { value: 'CNY', label: 'Китайский юань (¥)', symbol: '¥' },
  { value: 'KRW', label: 'Южнокорейская вона (₩)', symbol: '₩' },
  { value: 'THB', label: 'Тайский бат (฿)', symbol: '฿' },
  { value: 'VND', label: 'Вьетнамский донг (₫)', symbol: '₫' },
  { value: 'IDR', label: 'Индонезийская рупия (Rp)', symbol: 'Rp' },
  { value: 'MYR', label: 'Малайзийский ринггит (RM)', symbol: 'RM' },
  { value: 'SGD', label: 'Сингапурский доллар (S$)', symbol: 'S$' },
  { value: 'PHP', label: 'Филиппинское песо (₱)', symbol: '₱' },
  { value: 'INR', label: 'Индийская рупия (₹)', symbol: '₹' },
  { value: 'PKR', label: 'Пакистанская рупия (₨)', symbol: '₨' },
  { value: 'BDT', label: 'Бангладешская така (৳)', symbol: '৳' },
  { value: 'LKR', label: 'Шри-ланкийская рупия (₨)', symbol: '₨' },
  { value: 'NPR', label: 'Непальская рупия (₨)', symbol: '₨' },
  { value: 'BTN', label: 'Бутанский нгултрум (Nu)', symbol: 'Nu' },
  { value: 'MVR', label: 'Мальдивская руфия (Rf)', symbol: 'Rf' },
  { value: 'AFN', label: 'Афганский афгани (؋)', symbol: '؋' },
  { value: 'MMK', label: 'Мьянманский кьят (K)', symbol: 'K' },
  { value: 'LAK', label: 'Лаосский кип (₭)', symbol: '₭' },
  { value: 'KHR', label: 'Камбоджийский риель (៛)', symbol: '៛' },
  { value: 'BND', label: 'Брунейский доллар (B$)', symbol: 'B$' },
  { value: 'MOP', label: 'Патака Макао (MOP$)', symbol: 'MOP$' },
  { value: 'HKD', label: 'Гонконгский доллар (HK$)', symbol: 'HK$' },
  { value: 'TWD', label: 'Тайваньский доллар (NT$)', symbol: 'NT$' },
  { value: 'MNT', label: 'Монгольский тугрик (₮)', symbol: '₮' },
  
  // Ближний Восток и Центральная Азия
  { value: 'TRY', label: 'Турецкая лира (₺)', symbol: '₺' },
  { value: 'ILS', label: 'Израильский шекель (₪)', symbol: '₪' },
  { value: 'AED', label: 'Дирхам ОАЭ (د.إ)', symbol: 'د.إ' },
  { value: 'SAR', label: 'Саудовский риял (ر.س)', symbol: 'ر.س' },
  { value: 'QAR', label: 'Катарский риал (ر.ق)', symbol: 'ر.ق' },
  { value: 'KWD', label: 'Кувейтский динар (د.ك)', symbol: 'د.ك' },
  { value: 'BHD', label: 'Бахрейнский динар (د.ب)', symbol: 'د.ب' },
  { value: 'OMR', label: 'Оманский риал (ر.ع)', symbol: 'ر.ع' },
  { value: 'JOD', label: 'Иорданский динар (د.ا)', symbol: 'د.ا' },
  { value: 'LBP', label: 'Ливанский фунт (ل.ل)', symbol: 'ل.ل' },
  { value: 'IQD', label: 'Иракский динар (د.ع)', symbol: 'د.ع' },
  { value: 'IRR', label: 'Иранский риал (﷼)', symbol: '﷼' },
  { value: 'YER', label: 'Йеменский риал (﷼)', symbol: '﷼' },
  { value: 'SYP', label: 'Сирийский фунт (ل.س)', symbol: 'ل.س' },
  
  // Африка
  { value: 'ZAR', label: 'Южноафриканский рэнд (R)', symbol: 'R' },
  { value: 'NGN', label: 'Нигерийская найра (₦)', symbol: '₦' },
  { value: 'KES', label: 'Кенийский шиллинг (KSh)', symbol: 'KSh' },
  { value: 'UGX', label: 'Угандийский шиллинг (USh)', symbol: 'USh' },
  { value: 'TZS', label: 'Танзанийский шиллинг (TSh)', symbol: 'TSh' },
  { value: 'ETB', label: 'Эфиопский быр (Br)', symbol: 'Br' },
  { value: 'MAD', label: 'Марокканский дирхам (د.م)', symbol: 'د.م' },
  { value: 'TND', label: 'Тунисский динар (د.ت)', symbol: 'د.ت' },
  { value: 'DZD', label: 'Алжирский динар (د.ج)', symbol: 'د.ج' },
  { value: 'EGP', label: 'Египетский фунт (ج.م)', symbol: 'ج.م' },
  { value: 'GHS', label: 'Ганский седи (₵)', symbol: '₵' },
  { value: 'XOF', label: 'Западноафриканский франк (CFA)', symbol: 'CFA' },
  { value: 'XAF', label: 'Центральноафриканский франк (FCFA)', symbol: 'FCFA' },
  { value: 'MWK', label: 'Малавийская квача (MK)', symbol: 'MK' },
  { value: 'ZMW', label: 'Замбийская квача (ZK)', symbol: 'ZK' },
  { value: 'BWP', label: 'Ботсванская пула (P)', symbol: 'P' },
  { value: 'SZL', label: 'Свазилендский лилангени (L)', symbol: 'L' },
  { value: 'LSL', label: 'Лесотский лоти (L)', symbol: 'L' },
  { value: 'NAD', label: 'Намибийский доллар (N$)', symbol: 'N$' },
  { value: 'AOA', label: 'Ангольская кванза (Kz)', symbol: 'Kz' },
  { value: 'MZN', label: 'Мозамбикский метикал (MT)', symbol: 'MT' },
  { value: 'RWF', label: 'Руандский франк (RF)', symbol: 'RF' },
  { value: 'BIF', label: 'Бурундийский франк (FBu)', symbol: 'FBu' },
  { value: 'DJF', label: 'Джибутийский франк (Fdj)', symbol: 'Fdj' },
  { value: 'SOS', label: 'Сомалийский шиллинг (S)', symbol: 'S' },
  { value: 'ERN', label: 'Эритрейская накфа (Nfk)', symbol: 'Nfk' },
  { value: 'SDG', label: 'Суданский фунт (ج.س)', symbol: 'ج.س' },
  { value: 'SSP', label: 'Южносуданский фунт (SS£)', symbol: 'SS£' },
  { value: 'CDF', label: 'Конголезский франк (FC)', symbol: 'FC' },
  { value: 'CVE', label: 'Эскудо Кабо-Верде (CVE)', symbol: 'CVE' },
  { value: 'STN', label: 'Добра Сан-Томе и Принсипи (Db)', symbol: 'Db' },
  { value: 'GMD', label: 'Гамбийский даласи (D)', symbol: 'D' },
  { value: 'GNF', label: 'Гвинейский франк (FG)', symbol: 'FG' },
  { value: 'LRD', label: 'Либерийский доллар (L$)', symbol: 'L$' },
  { value: 'SLE', label: 'Сьерра-леонский леоне (Le)', symbol: 'Le' },
  { value: 'MGA', label: 'Малагасийский ариари (Ar)', symbol: 'Ar' },
  { value: 'MUR', label: 'Маврикийская рупия (₨)', symbol: '₨' },
  { value: 'SCR', label: 'Сейшельская рупия (₨)', symbol: '₨' },
  { value: 'KMF', label: 'Коморский франк (CF)', symbol: 'CF' },
  
  // Америка
  { value: 'CAD', label: 'Канадский доллар (C$)', symbol: 'C$' },
  { value: 'AUD', label: 'Австралийский доллар (A$)', symbol: 'A$' },
  { value: 'NZD', label: 'Новозеландский доллар (NZ$)', symbol: 'NZ$' },
  { value: 'BRL', label: 'Бразильский реал (R$)', symbol: 'R$' },
  { value: 'MXN', label: 'Мексиканское песо ($)', symbol: '$' },
  { value: 'ARS', label: 'Аргентинское песо ($)', symbol: '$' },
  { value: 'CLP', label: 'Чилийское песо ($)', symbol: '$' },
  { value: 'COP', label: 'Колумбийское песо ($)', symbol: '$' },
  { value: 'PEN', label: 'Перуанский соль (S/)', symbol: 'S/' },
  { value: 'UYU', label: 'Уругвайское песо ($U)', symbol: '$U' },
  { value: 'PYG', label: 'Парагвайский гуарани (₲)', symbol: '₲' },
  { value: 'BOB', label: 'Боливийский боливиано (Bs)', symbol: 'Bs' },
  { value: 'VES', label: 'Венесуэльский боливар (Bs.S)', symbol: 'Bs.S' },
  { value: 'GYD', label: 'Гайанский доллар (G$)', symbol: 'G$' },
  { value: 'SRD', label: 'Суринамский доллар (Sr$)', symbol: 'Sr$' },
  { value: 'TTD', label: 'Доллар Тринидада и Тобаго (TT$)', symbol: 'TT$' },
  { value: 'BBD', label: 'Барбадосский доллар (Bds$)', symbol: 'Bds$' },
  { value: 'JMD', label: 'Ямайский доллар (J$)', symbol: 'J$' },
  { value: 'BZD', label: 'Белизский доллар (BZ$)', symbol: 'BZ$' },
  { value: 'GTQ', label: 'Гватемальский кетсаль (Q)', symbol: 'Q' },
  { value: 'HNL', label: 'Гондурасская лемпира (L)', symbol: 'L' },
  { value: 'NIO', label: 'Никарагуанская кордоба (C$)', symbol: 'C$' },
  { value: 'CRC', label: 'Коста-риканский колон (₡)', symbol: '₡' },
  { value: 'PAB', label: 'Панамский бальбоа (B/.)', symbol: 'B/.' },
  { value: 'DOP', label: 'Доминиканское песо (RD$)', symbol: 'RD$' },
  { value: 'HTG', label: 'Гаитянский гурд (G)', symbol: 'G' },
  { value: 'CUP', label: 'Кубинское песо ($)', symbol: '$' },
  { value: 'AWG', label: 'Арубанский флорин (ƒ)', symbol: 'ƒ' },
  { value: 'ANG', label: 'Нидерландский антильский гульден (ƒ)', symbol: 'ƒ' },
  { value: 'XCD', label: 'Восточно-карибский доллар (EC$)', symbol: 'EC$' },
  
  // Океания
  { value: 'FJD', label: 'Фиджийский доллар (FJ$)', symbol: 'FJ$' },
  { value: 'PGK', label: 'Кина Папуа-Новой Гвинеи (K)', symbol: 'K' },
  { value: 'SBD', label: 'Доллар Соломоновых островов (SI$)', symbol: 'SI$' },
  { value: 'VUV', label: 'Вату Вануату (Vt)', symbol: 'Vt' },
  { value: 'WST', label: 'Тала Самоа (WS$)', symbol: 'WS$' },
  { value: 'TOP', label: 'Паанга Тонга (T$)', symbol: 'T$' },
  { value: 'KID', label: 'Доллар Кирибати (A$)', symbol: 'A$' },
  { value: 'NPR', label: 'Рупия Непала (₨)', symbol: '₨' }
];

export interface CurrencyOption {
  value: string;
  label: string;
  symbol: string;
}

export interface CurrencySelectorProps {
  value?: string;
  onChange: (currency: string) => void;
  placeholder?: string;
  className?: string;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onChange,
  placeholder = "Выберите валюту...",
  className = ""
}) => {
  const selectedOption = currencyOptions.find(option => option.value === value);

  const handleChange = (selectedOption: CurrencyOption | null) => {
    if (selectedOption) {
      onChange(selectedOption.value);
    }
  };

  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      minHeight: '40px',
      border: state.isFocused ? '2px solid #007bff' : '1px solid #ddd',
      boxShadow: state.isFocused ? '0 0 0 0.2rem rgba(0, 123, 255, 0.25)' : 'none',
      '&:hover': {
        border: '1px solid #007bff'
      }
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? '#007bff' 
        : state.isFocused 
          ? '#f8f9fa' 
          : 'white',
      color: state.isSelected ? 'white' : '#333',
      padding: '8px 12px'
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#6c757d'
    })
  };

  return (
    <div className={`currency-selector ${className}`}>
      <Select
        value={selectedOption}
        onChange={handleChange}
        options={currencyOptions}
        placeholder={placeholder}
        isSearchable
        isClearable
        styles={customStyles}
        classNamePrefix="currency-select"
        noOptionsMessage={() => "Валюта не найдена"}
        loadingMessage={() => "Поиск..."}
      />
    </div>
  );
};
