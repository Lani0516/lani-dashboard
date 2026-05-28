# Lani Dashboard

個人 homelab 用的即時監控 Dashboard。拖曳式 Widget 佈局，支援主題切換，所有敏感設定（API 金鑰、SSH 憑證）都在 UI 裡配置、存在本地，不寫進程式碼。

## 功能

| Widget | 說明 |
|--------|------|
| **系統監控** | CPU 使用率、記憶體、網路流量（WebSocket 即時推送） |
| **AI Token** | Anthropic / OpenAI 用量與費用追蹤 |
| **Discord** | 伺服器成員數、在線數、頻道列表、Boost 等級 |
| **Minecraft** | 伺服器在線狀態、玩家清單、MOTD、延遲 |
| **SFTP 管理器** | SSH 檔案瀏覽器，支援上傳 / 下載 / 刪除，金鑰或密碼驗證 |
| **VPN** | WireGuard / Tailscale / OpenVPN 狀態（開發中） |
| **Wake-on-LAN** | 對設定好的裝置發送魔術封包喚醒 |

## 技術棧

- **前端**：React 19 + Vite + Tailwind CSS 3 + react-grid-layout
- **後端**：Express + WebSocket（`ws`）+ systeminformation
- **語言**：TypeScript（全端共用 `shared/types`）
- **套件管理**：Bun

## 快速開始

**需求**：[Bun](https://bun.sh) >= 1.0

```bash
# 安裝依賴
bun install && cd server && bun install && cd ../client && bun install && cd ..

# 複製環境變數範本
cp server/.env.example server/.env

# 開發模式（server :3001 + client :5173 同時啟動）
bun run dev
```

開啟 http://localhost:5173

## 環境變數

編輯 `server/.env`：

```env
PORT=3001

# Discord（選填，也可在 Dashboard UI 裡設定）
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=
```

其餘設定（AI API 金鑰、SFTP 連線、WOL 裝置）全在 UI 裡管理，存於 `server/data/config.json`（gitignored）。

## 專案結構

```
lani-dashboard/
├── client/          # React 前端
│   └── src/
│       ├── components/widgets/   # 各 Widget 元件
│       ├── hooks/                # useApi, useWebSocket
│       ├── services/api.ts       # API 封裝
│       └── themes/themes.ts      # 5 套主題定義
├── server/          # Express 後端
│   └── src/
│       ├── modules/              # 各功能模組（router + service）
│       ├── config/               # ConfigManager 單例
│       ├── polling.ts            # WebSocket 定期推送
│       └── ws.ts                 # broadcastUpdate
└── shared/
    └── types/index.ts            # 前後端共用型別
```

## 主題

內建 5 套主題：**Dark**、**Light**、**Midnight**、**Nord**、**Catppuccin**。

右上角切換，選擇存在 localStorage。主題以 CSS 自訂屬性實作，Tailwind class 直接對應主題變數，Widget 程式碼無需感知主題。

## 建置 & 部署

```bash
# 建置前端靜態檔
bun run build

# 啟動（Express 同時 serve 靜態檔 + API）
bun run start
```

Server 預設 `:3001`，`client/dist` 由 Express 直接 serve。
