# Развёртывание на Oracle Cloud (бесплатно навсегда)

Инструкция для Ubuntu 24.04 на Oracle Cloud Always Free.
Итог: сайт на `https://ваш-домен/`, Mini App на `https://ваш-домен/app`, бот работает
24/7 и перезапускается сам.

Время: ~50 минут. Стоимость: **0 €**.

---

## Почему именно такой сервер

| Требование | Причина |
|---|---|
| Постоянный диск | База SQLite и фото товаров лежат в файлах |
| Процесс не спит | Бот использует polling — если он спит, заказы не приходят |
| Ровно один экземпляр | Два процесса с одним токеном конфликтуют и теряют сообщения |
| Постоянный HTTPS | Требование Telegram для Mini App и входа через Telegram |

Поэтому **не подойдут**: Vercel, Netlify, Cloudflare Pages (нет диска и постоянного
процесса), Render Free (засыпает через 15 минут — заказы перестают приходить),
Railway и Fly.io (бесплатных тарифов больше нет).

Oracle Always Free даёт настоящий сервер с диском — это то, что нужно.

---

## Три особенности Oracle

Прочитайте до начала — на них спотыкаются почти все:

1. **Регион выбирается один раз и навсегда.** Home Region потом не поменять.
2. **Два файрвола.** Кроме файрвола внутри сервера есть облачный (Security List).
   Открыть порты нужно в обоих, иначе сайт не откроется.
3. **Вход под пользователем `ubuntu`, не `root`.** Команды с правами — через `sudo`.

---

## Шаг 1. Регистрация

1. Откройте [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)
2. **Start for free** → заполните данные
3. **Home Region** — выбирайте с умом, поменять нельзя:

   | Регион | Кому подходит |
   |---|---|
   | **Germany Central (Frankfurt)** | Рекомендуется — хорошая связность с СНГ |
   | **UAE East (Dubai)** | Ближе всего к Центральной Азии |
   | **South Korea Central (Seoul)** | Если вы сами в Корее |

4. Понадобится банковская карта — **только для проверки личности**.
   Списывается ~$1 и сразу возвращается. Автоматически на платный тариф
   аккаунт не переводится.

---

## Шаг 2. Создать сервер

**Menu → Compute → Instances → Create Instance**

- **Name**: `oilbot`
- **Image**: Change Image → **Canonical Ubuntu 24.04** → Select
- **Shape**: Change Shape → вкладка **Ampere** → `VM.Standard.A1.Flex`
  - OCPUs: **2**, Memory: **12 GB** (в пределах Always Free)
- **SSH keys**: **Paste public keys** → вставьте свой ключ

Ключ, если его нет — **на своём компьютере**:

```bash
ssh-keygen -t ed25519 -C "oilbot"
```

Содержимое `~/.ssh/id_ed25519.pub` вставьте в поле.

Нажмите **Create** и запишите **Public IP address**.

> ### Ошибка «Out of host capacity»
> Частая проблема с ARM-серверами. Варианты:
> - Повторите через несколько часов (часто помогает ночью)
> - Или выберите Shape → вкладка **Specialty and previous generation** →
>   **VM.Standard.E2.1.Micro** (1 CPU, 1 GB RAM). Медленнее, но всегда доступен
>   и для этого приложения достаточно.

---

## Шаг 3. Открыть порты в облаке

Без этого шага сайт не откроется, даже если внутри сервера всё настроено.

1. На странице инстанса нажмите на **Virtual cloud network** (ссылка в Instance details)
2. Слева **Security Lists** → **Default Security List**
3. **Add Ingress Rules**, добавьте два правила:

   | Source CIDR | IP Protocol | Destination Port |
   |---|---|---|
   | `0.0.0.0/0` | TCP | `80` |
   | `0.0.0.0/0` | TCP | `443` |

---

## Шаг 4. Бесплатный домен (DuckDNS)

1. [duckdns.org](https://www.duckdns.org) → войдите через Google/GitHub
2. Создайте поддомен, например `xteeroil` → получится `xteeroil.duckdns.org`
3. В поле **current ip** впишите Public IP сервера → **update ip**

Позже можно купить настоящий домен (~$12/год) и поменять имя в двух местах.

---

## Шаг 5. Подготовить сервер

Подключение (пользователь `ubuntu`, не `root`):

```bash
ssh ubuntu@ВАШ_IP
```

Обновление и пакеты:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git sqlite3 rsync build-essential python3
```

Node.js 22:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
```

**Открыть порты внутри сервера.** Образы Oracle блокируют всё, кроме SSH:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

> **Не включайте `ufw` на Oracle.** Он конфликтует с их правилами iptables
> и может закрыть вам доступ по SSH.

Папка приложения:

```bash
sudo mkdir -p /opt/oilbot
sudo chown ubuntu:ubuntu /opt/oilbot
```

---

## Шаг 6. Загрузить код

**На своём компьютере**, из папки проекта:

```bash
rsync -av --exclude node_modules --exclude .env --exclude '*.db*' --exclude backups ./ ubuntu@ВАШ_IP:/opt/oilbot/
```

Снова **на сервере**:

```bash
cd /opt/oilbot
npm ci --omit=dev
```

> `better-sqlite3` содержит нативный код и собирается под систему, поэтому
> `node_modules` не копируем — сборка с Windows на Linux (тем более ARM) не заработает.

---

## Шаг 7. Настройки (.env)

```bash
nano /opt/oilbot/.env
```

Вставьте, заменив домен на свой:

```ini
BOT_TOKEN=8925813658:AAH1iSasWKIe9_OCUUT0bmWF1ET_9jFK0zI
BOT_USERNAME=hyundaixteeroilbot
ADMIN_IDS=6049615368,795023201

PORT=3000
WEBAPP_URL=https://xteeroil.duckdns.org
NODE_ENV=production
WEB_AT_ROOT=1
```

Сохранить: `Ctrl+O`, `Enter`, `Ctrl+X`. В файле лежит токен бота:

```bash
chmod 600 /opt/oilbot/.env
```

> **`DEV_AUTH` не добавляйте.** С ним любой запрос с заголовком `X-Dev-User-Id`
> получает права администратора: все заказы, телефоны и адреса клиентов.

---

## Шаг 8. Автозапуск (systemd)

```bash
sudo cp /opt/oilbot/deploy/oilbot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now oilbot
sudo systemctl status oilbot
```

Должно быть `active (running)`. Логи в реальном времени:

```bash
journalctl -u oilbot -f
```

Сервис перезапускается при падении и после перезагрузки.

---

## Шаг 9. HTTPS (Caddy)

Caddy сам получает и продлевает сертификат Let's Encrypt.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Конфиг:

```bash
sudo cp /opt/oilbot/deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile
```

Замените `xteeroil.duckdns.org` на свой поддомен, затем:

```bash
sudo systemctl reload caddy
```

Проверка (сертификат выдаётся ~30 секунд):

```bash
curl -I https://xteeroil.duckdns.org
```

Ожидается `HTTP/2 200`.

---

## Шаг 10. Переключить Telegram

Mini App переехал с `/` на `/app`, поэтому BotFather нужно обновить.

1. [@BotFather](https://t.me/BotFather) → `/mybots` → ваш бот
2. **Bot Settings → Menu Button** → вставьте:
   `https://xteeroil.duckdns.org/app`
3. `/setdomain` → выберите бота → отправьте:
   `xteeroil.duckdns.org`
   — это включит вход через Telegram на сайте

Откройте бота, `/start` → «Открыть магазин».

---

## Шаг 11. Резервные копии

```bash
chmod +x /opt/oilbot/deploy/backup.sh
crontab -e
```

Добавьте строку:

```
0 3 * * * /opt/oilbot/deploy/backup.sh >> /home/ubuntu/oilbot-backup.log 2>&1
```

Каждую ночь в 03:00 сохраняются база и фото в `/opt/oilbot/backups`,
снимки старше 30 дней удаляются. Проверить сразу:

```bash
/opt/oilbot/deploy/backup.sh
```

> **Обязательно скачивайте копии к себе** — на бесплатном тарифе это особенно
> важно. Раз в месяц, у себя на компьютере:
> ```bash
> rsync -av ubuntu@ВАШ_IP:/opt/oilbot/backups/ ./backups/
> ```

---

## Перенос текущих данных

Чтобы перенести товары и заказы с ноутбука — **сначала остановите локальный сервер**,
затем у себя:

```bash
rsync -av oil_bot.db ubuntu@ВАШ_IP:/opt/oilbot/
rsync -av public/uploads/ ubuntu@ВАШ_IP:/opt/oilbot/public/uploads/
```

На сервере:

```bash
sudo systemctl restart oilbot
```

> Копируйте базу только при остановленном сервере — иначе можно захватить
> незавершённую запись.

---

## Обновление кода в будущем

У себя:

```bash
rsync -av --exclude node_modules --exclude .env --exclude '*.db*' --exclude backups ./ ubuntu@ВАШ_IP:/opt/oilbot/
```

На сервере:

```bash
cd /opt/oilbot && npm ci --omit=dev && sudo systemctl restart oilbot
```

---

## Особенность бесплатного тарифа Oracle

Oracle может освобождать **простаивающие** Always Free серверы. Критерий —
низкая загрузка CPU, сети и памяти в течение 7 дней. Бот с polling создаёт
постоянный сетевой трафик, поэтому обычно проблем нет, но гарантий Oracle не даёт.

Что снижает риск:
- Заходите в аккаунт Oracle хотя бы раз в месяц
- Держите ночные резервные копии включёнными
- **Скачивайте копии к себе** — тогда даже потеря сервера не потеряет данные

Если сервер всё же освободят, восстановление — это повтор этой инструкции плюс
загрузка последней копии базы: около часа.

---

## Если что-то не работает

| Симптом | Проверка |
|---|---|
| Сайт не открывается | Порты 80/443 открыты **и** в Security List (шаг 3), **и** в iptables (шаг 5)? |
| Бот молчит | `journalctl -u oilbot -n 50` |
| `409 Conflict` в логах | Запущено два экземпляра — остановите локальный сервер на ноутбуке |
| Сертификат не выдан | DuckDNS указывает на верный IP? `sudo journalctl -u caddy -n 50` |
| Mini App пустой | В BotFather указан URL **с `/app`** на конце |
| Кнопка входа не работает | Выполнен ли `/setdomain` в BotFather |
| `npm ci` падает | Установлены ли `build-essential` и `python3` (шаг 5) |

Полный перезапуск:

```bash
sudo systemctl restart oilbot caddy
```
