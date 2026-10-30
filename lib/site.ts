// Адрес сайта (для поисковиков). Если домен поменяется, задайте переменную NEXT_PUBLIC_SITE_URL на хостинге.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://isushiclub.ru').replace(/\/$/, '');
