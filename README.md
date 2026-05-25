<div align="center">

<a href="https://www.kasikornbank.com/th/kbiz/pages/index.aspx" target="_blank">
  <img src="./KBiz-Logo.svg" width="180" height="180" alt="KBiz Logo" />
</a>

<h1>KBiz API</h1>

<p>
  <strong>An unofficial Node.js client for KASIKORNBANK's <a href="https://kbiz.kasikornbank.com">KBiz</a> internet banking portal.</strong><br/>
  Retrieve account summaries and transaction history programmatically.
</p>

<p>
  <img src="https://img.shields.io/badge/Node.js-18%2B-43853D?logo=node.js&logoColor=white" alt="Node.js 18+" />
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" />
  <img src="https://img.shields.io/badge/status-educational-orange" alt="Status: educational" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
</p>

</div>

---

## 📑 Table of Contents

- [About](#-about)
- [Disclaimer](#%EF%B8%8F-disclaimer)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Requirements](#-requirements)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [API Reference](#-api-reference)
- [Response Shapes](#-response-shapes)
- [Error Handling](#-error-handling)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)
- [Author](#-author)
- [Acknowledgments](#-acknowledgments)

---

## 👋 About

`KBiz API` is a small, dependency-light Node.js wrapper around the private endpoints used by the KBiz web portal. It performs the cookie/session/token handshake on your behalf and exposes a few high-level methods for reading account balances and transaction history.

It was built as a personal learning exercise to explore how Thai banking portals authenticate clients and serve account data — **not** as a production-grade SDK.

## ⚠️ Disclaimer

> **This project is for educational purposes only.**
>
> It is **not** affiliated with, endorsed by, or supported by KASIKORNBANK. The endpoints used here are undocumented and may change or be revoked at any time, which can break this library without warning.
>
> **Do not use this in production or for any commercial purpose.** Doing so may violate KASIKORNBANK's terms of service and could result in your account being suspended or locked.
>
> The author accepts no responsibility for misuse, account suspension, financial loss, or any other consequence — **use it entirely at your own risk.**

## ✨ Features

- 🔐 **Authentication** — handles the full cookie / session / token / RSSO exchange
- 💓 **Session keep-alive** — verify a session is still valid before issuing more calls
- 👤 **Account summaries** — list account numbers, names, and balances
- 💸 **Transaction history** — fetch recent transactions and enrich each row with its detail payload
- ♻️ **Resilient retries** — bounded retry with backoff on `401 Unauthorized`
- 🧼 **Isolated state** — per-instance Axios client; safe to create multiple `KBiz` instances
- 🪶 **Minimal dependencies** — only [`axios`](https://www.npmjs.com/package/axios)

## 🛠 Tech Stack

| Layer    | Choice                                                |
| -------- | ----------------------------------------------------- |
| Runtime  | [Node.js](https://nodejs.org) 18+                     |
| HTTP     | [Axios](https://github.com/axios/axios) `^1.7.4`      |
| Language | JavaScript (CommonJS, ES2022 private class fields)    |

## 📋 Requirements

- **Node.js 18 or newer** (uses native `URLSearchParams` and private class fields)
- An **active KBiz account** with web-portal access
- The **bank account number** you want to query (must be linked to your KBiz account)

## 📚 Installation

```bash
# 1. Clone the repository
git clone https://github.com/jumpogpo/KBiz-API.git
cd KBiz-API

# 2. Install dependencies
npm install
```

## 🚀 Quick Start

### Option A — Run the bundled example

Edit `index.js` and fill in your credentials, then run:

```bash
node index.js
```

### Option B — Use the class in your own code

```js
const KBiz = require("./class/KBiz.js");

(async () => {
  const client = new KBiz({
    username: "YOUR_USERNAME",
    password: "YOUR_PASSWORD",
    bankAccountNumber: "0000000000",
  });

  // 1. Authenticate
  const { success } = await client.login();
  if (!success) return console.error("Login failed.");

  // 2. Verify the session is alive
  if (!(await client.checkSession())) return console.error("Session is dead.");

  // 3. List accounts
  const userInfo = await client.getUserInfo();
  for (const { accountNo, accountNameTh, acctBalance } of userInfo.accountSummaryList) {
    console.log(`${accountNo} | ${accountNameTh} | ${acctBalance} Baht`);
  }

  // 4. Fetch recent transactions
  const transactions = await client.getTransactionList(100, "01/09/2024", "14/09/2024");
  console.log(transactions);
})();
```

## 📖 API Reference

### `new KBiz(config)`

Create a new client. Throws synchronously if a required field is missing or empty.

| Field               | Type     | Required | Description                                            |
| ------------------- | -------- | :------: | ------------------------------------------------------ |
| `username`          | `string` |    ✅    | KBiz login username                                    |
| `password`          | `string` |    ✅    | KBiz login password                                    |
| `bankAccountNumber` | `string` |    ✅    | Account number to query                                |
| `ibId`              | `string` |    ❌    | Restore a previous internet-banking id (skip re-login) |
| `token`             | `string` |    ❌    | Restore a previous session token (skip re-login)       |

### `await client.login()`

Performs the full login flow and stores the session token and `ibId` on the instance.

**Returns:** `Promise<{ success: boolean, ibId?: string, token?: string }>`

### `await client.checkSession()`

Pings the refresh-session endpoint to verify the current session is still alive. Retries up to **3 times** with a 500 ms delay before giving up.

**Returns:** `Promise<boolean>`

### `await client.getUserInfo()`

Fetches the account summary list for the logged-in user.

**Returns:** `Promise<object | null>` — `null` on failure

### `await client.getTransactionList(limitRow?, startDate?, endDate?)`

Fetches recent transactions and enriches each row with its detail payload.

| Argument    | Type     | Default     | Description                                    |
| ----------- | -------- | ----------- | ---------------------------------------------- |
| `limitRow`  | `number` | `7`         | Maximum number of rows to return               |
| `startDate` | `string` | today (DMY) | `DD/MM/YYYY` — e.g., `"01/09/2024"`            |
| `endDate`   | `string` | today (DMY) | `DD/MM/YYYY`                                   |

**Returns:** `Promise<Array<Transaction & { detail: object | null }>>` — empty array on failure

### `await client.getRecentTransactionDetail(transaction)`

Fetches the detail payload for a single transaction. Pass the full transaction object returned by `getTransactionList`.

**Returns:** `Promise<object | null>` — `null` on failure

## 📦 Response Shapes

<details>
<summary><strong>getUserInfo()</strong> — click to expand</summary>

```js
{
  accountSummaryList: [
    {
      accountNo: "0000000000",
      accountNameTh: "นาย ตัวอย่าง ใจดี",
      acctBalance: "1,234.56",
      // ...other KBiz fields
    },
  ],
  // ...other top-level fields
}
```

</details>

<details>
<summary><strong>getTransactionList()</strong> — click to expand</summary>

```js
[
  {
    transDate: "01/09/2024 09:15",
    debitCreditIndicator: "C",
    transCode: "...",
    transType: "...",
    origRqUid: "...",
    originalSourceId: "...",
    // ...other transaction fields
    detail: {
      // detail payload returned by getRecentTransactionDetail
    },
  },
]
```

</details>

## 🛡 Error Handling

- The constructor **throws** `Error("<field> is required.")` if `username`, `password`, or `bankAccountNumber` is missing or empty.
- `login()` returns `{ success: false }` on any failure and logs the error to `console.error`.
- `checkSession()` returns `false` after exhausting retries.
- `getUserInfo()`, `getTransactionList()`, and `getRecentTransactionDetail()` return `null` / `[]` on failure (after retrying once on `401`).

```js
const client = new KBiz(config);
const { success } = await client.login();

if (!success) {
  // Login failed — credentials wrong, network down, or KBiz API changed
  process.exit(1);
}
```

## 🗂 Project Structure

```
KBiz-API/
├── class/
│   └── KBiz.js          # Main client class — login + API calls
├── index.js             # Example entry point
├── KBiz-Logo.svg        # KBiz logo
├── LICENSE              # MIT license
├── package.json
└── README.md
```

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome! Since the KBiz API is undocumented, fixes for endpoint changes are especially appreciated.

1. **Fork** the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes following the project's emoji-prefixed style (e.g., `✨ (add): ...`, `🐛 (bug): ...`, `♻️ (refactor): ...`)
4. Push to your fork and open a **Pull Request**

Please **never** commit real credentials, account numbers, or session tokens.

## 📝 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for the full text.

## 👤 Author

**jumpogpo** — [@jumpogpo on GitHub](https://github.com/jumpogpo)

## 🙏 Acknowledgments

- [KBiz portal](https://www.kasikornbank.com/th/kbiz/pages/index.aspx) — KASIKORNBANK's internet banking platform that this project explores
- The Node.js and Axios communities for the underlying tools
