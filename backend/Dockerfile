FROM php:8.5-fpm
RUN apt-get update && apt-get install -y --no-install-recommends libicu-dev libzip-dev libonig-dev unzip && docker-php-ext-install pdo_mysql intl zip mbstring opcache && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY . .
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader && chown -R www-data:www-data storage bootstrap/cache
USER www-data
CMD ["php-fpm"]
