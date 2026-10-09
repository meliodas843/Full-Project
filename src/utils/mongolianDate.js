const MONTHS = [
  "Нэгдүгээр",
  "Хоёрдугаар",
  "Гуравдугаар",
  "Дөрөвдүгээр",
  "Тавдугаар",
  "Зургаадугаар",
  "Долоодугаар",
  "Наймдугаар",
  "Есдүгээр",
  "Аравдугаар",
  "Арван нэгдүгээр",
  "Арван хоёрдугаар",
];

const WEEKDAYS = [
  "Ням",
  "Даваа",
  "Мягмар",
  "Лхагва",
  "Пүрэв",
  "Баасан",
  "Бямба",
];

export function formatMonthMN(value) {
  const date = new Date(value);

  return `${date.getFullYear()} оны ${date.getMonth() + 1} сар`;
}

export function formatDateMN(value) {
  const date = new Date(value);

  return `${date.getFullYear()} оны ${
    date.getMonth() + 1
  }-р сарын ${date.getDate()}`;
}

export function formatWeekdayMN(value) {
  const date = new Date(value);

  return `${date.getMonth() + 1} сарын ${
    date.getDate()
  }, ${WEEKDAYS[date.getDay()]} гараг`;
}

export function formatLongMonthMN(value) {
  const date = new Date(value);

  return `${MONTHS[date.getMonth()]} сар ${date.getFullYear()}`;
}