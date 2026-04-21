# Maxter

SSH / SFTP / Server-control client с живой панелью мониторинга, в визуальном стиле под Starcraft / cyberpunk.

![themes](https://img.shields.io/badge/themes-24-blueviolet) ![fonts](https://img.shields.io/badge/fonts-20-blue) ![license](https://img.shields.io/badge/license-MIT-green)

## Что умеет

- **SSH-терминал** с цветами, авторекoннектом, многосессионностью (вкладки)
- **SFTP** — двупанельный файловый менеджер, multi-select, drag-and-drop между local↔remote, рекурсивные передачи папок, overwrite-диалог с "Apply to all", встроенный текстовый редактор файлов с line numbers
- **Панель мониторинга:**
  - CPU / RAM / Disk live (полосы, % с цветом — accent / warn / alert)
  - Top-процессы по CPU и памяти (drill-down с авто-обновлением)
  - DirStat-style drilldown по размеру папок (`du -hxd 1` + breadcrumb)
  - Docker контейнеры: stats, ports, compose project links (`.env`, `compose.yaml`, `Dockerfile` — открываются во встроенном редакторе)
  - Кнопки start / stop / restart / **rebuild** (`compose up -d --build`) / export
  - Docker volumes: размер, какие контейнеры используют, скачать tar.gz, удалить
  - Listening ports с процессами (требует sudo)
  - Nginx sites — список enabled конфигов с server_name + listen, открыть конфиг в редакторе, ссылка на главный nginx.conf
  - Iptables: live-список INPUT-правил, удалить правило, добавить кастомное правило (форма с превью команды), сохранить через `netfilter-persistent`
- **Безопасность:**
  - PIN-блокировка приложения (PBKDF2-SHA256 хеш + соль)
  - SSH host key verification — fingerprints в `known_hosts.json`, MITM-warning при смене ключа
  - Пароли SSH хранятся через Electron `safeStorage` (Keychain на macOS, DPAPI на Windows)
  - Sudo-пароль кешируется только в RAM на время сессии, никогда не пишется на диск
- **24 темы** (Obsidian / Polar / Cybertron / Mars / Matrix / Nord / Solar / Void / Dracula / Tokyo / Synthwave / Amber / Monokai / Gruvbox / Catppuccin / Terminator / Ocean / Sunset / Carbon / Paper / Linear / Gruvlight / Sakura / Mint), **20 шрифтов**
- Lock-кнопка в шапке (`⌘L` на macOS, `Ctrl+Shift+L` на Win/Linux — без конфликта с xterm clear-screen)

## Установка

### Windows (готовый exe)

1. Зайди в [Releases](../../releases/latest) → скачай `Maxter-X.Y.Z-portable.exe`
2. Дважды кликни — приложение запустится без установки
3. Все данные (`servers.json`, `auth.json`) хранятся в папке `Maxter data` рядом с exe — переноси на флешку с собой если надо

### macOS / Linux (из исходников)

Нужен Node.js ≥ 18.

```bash
git clone https://github.com/publicsmoke/maxter.git
cd maxter
npm install
npm start
```

### Сборка Windows portable exe из исходников (на macOS)

```bash
git clone -b windows https://github.com/publicsmoke/maxter.git maxter-win
cd maxter-win
npm install
npm run dist:win
# результат: dist/Maxter-X.Y.Z-portable.exe
```

> Если `cpu-features` падает на cross-compile — `rm -rf node_modules/cpu-features node_modules/nan` и повтори (это опциональная нативка ssh2, без неё работает).

## Структура веток

- **main** — основная разработка (macOS dev), исходники
- **windows** — портабл-сборка (electron-builder + иконка из мятной темы через `@napi-rs/canvas`)

## Хоткеи

| | macOS | Win/Linux |
|---|---|---|
| Lock | `⌘L` | `Ctrl+Shift+L` |
| New endpoint | `⌘N` | `Ctrl+N` |
| Close session | `⌘W` | `Ctrl+W` |
| Toggle sidebar | `⌘B` | `Ctrl+B` |
| Save (in editor) | `⌘S` | `Ctrl+S` |

## Куда что складывается

- macOS: `~/Library/Application Support/nexus-term/`
- Windows portable: `Maxter data/` рядом с .exe
- Внутри:
  - `servers.json` — список endpoint'ов, пароли зашифрованы
  - `auth.json` — PIN hash + соль
  - `known_hosts.json` — fingerprints SSH-серверов

## Лицензия

MIT.
