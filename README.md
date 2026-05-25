<p align="center">
  <a href="https://www.kasikornbank.com/th/kbiz/pages/index.aspx" target="blank"><img src="./KBiz-Logo.svg" width="200" height="200" alt="KBiz Logo" /></a>
</p>

<h1 align="center">KBiz API</h1>

<p align="center">
  An unofficial Node.js client for KASIKORNBANK's <a href="https://kbiz.kasikornbank.com">KBiz</a> internet banking portal.<br/>
  Retrieve account summaries and transaction history programmatically.
</p>

---

## 👋 Description

This project provides a small Node.js wrapper around the endpoints used by the KBiz web portal. It was built as a personal learning exercise to explore how Thai banking portals authenticate and serve account data.

## ⚠️ Disclaimer

> **This project is for educational purposes only.** It is not affiliated with, endorsed by, or supported by KASIKORNBANK. The endpoints used here are undocumented and may change at any time. **Do not use this in production or for any commercial purpose.** The author accepts no responsibility for misuse, account suspension, or any other consequence — use it entirely at your own risk.

## ✨ Features

- 🔐 Login with username and password (handles cookie/session/token exchange)
- 💓 Session keep-alive checks
- 👤 Fetch account summaries (account number, name, balance)
- 💸 Fetch recent transactions with detail enrichment
- ♻️ Built-in retry with backoff on `401 Unauthorized`
- 🧼 Isolated per-instance Axios client (no global state pollution)

## 📋 Requirements

- Node.js **18+**
- An active KBiz account

## 📚 Installation

```bash
# Clone the project
git clone https://github.com/jumpogpo/KBiz-API.git
cd KBiz-API

# Install dependencies
npm install
```

## 🚀 Quick Start

Edit `index.js` and fill in your credentials, then run:

```bash
node index.js
```

Or use the class directly in your own code:

```js
const KBiz = require("./class/KBiz.js");

(async () => {
  const client = new KBiz({
    username: "YOUR_USERNAME",
    password: "YOUR_PASSWORD",
    bankAccountNumber: "0000000000",
  });

  const { success } = await client.login();
  if (!success) return console.log("Login failed.");

  if (!(await client.checkSession())) return console.log("Session is dead.");

  const userInfo = await client.getUserInfo();
  for (const { accountNo, accountNameTh, acctBalance } of userInfo.accountSummaryList) {
    console.log(`${accountNo} | ${accountNameTh} | ${acctBalance} Baht`);
  }

  const transactions = await client.getTransactionList(100, "01/09/2024", "14/09/2024");
  console.log(transactions);
})();
```

## 📖 API Reference

### `new KBiz(config)`

Create a new client. Throws if any required field is missing.

| Field               | Type     | Required | Description                                     |
| ------------------- | -------- | -------- | ----------------------------------------------- |
| `username`          | `string` | ✅       | KBiz login username                             |
| `password`          | `string` | ✅       | KBiz login password                             |
| `bankAccountNumber` | `string` | ✅       | The account number to query                     |
| `ibId`              | `string` | ❌       | Restore a previous IB id (skip login)           |
| `token`             | `string` | ❌       | Restore a previous session token (skip login)   |

### `await client.login()`

Authenticates against KBiz and stores the session token and `ibId` on the instance.

**Returns:** `{ success: boolean, ibId?: string, token?: string }`

### `await client.checkSession()`

Pings the refresh-session endpoint to verify the session is still alive. Retries up to 3 times with a short delay before giving up.

**Returns:** `boolean`

### `await client.getUserInfo()`

Fetches the account summary list (each entry includes `accountNo`, `accountNameTh`, `acctBalance`, and more).

**Returns:** `object | null`

### `await client.getTransactionList(limitRow?, startDate?, endDate?)`

Fetches recent transactions and enriches each with its detail payload.

| Argument    | Type     | Default     | Description                                |
| ----------- | -------- | ----------- | ------------------------------------------ |
| `limitRow`  | `number` | `7`         | Maximum number of rows                     |
| `startDate` | `string` | today (DMY) | `DD/MM/YYYY` (e.g., `"01/09/2024"`)        |
| `endDate`   | `string` | today (DMY) | `DD/MM/YYYY`                               |

**Returns:** `Array<{ ...transaction, detail }>`

### `await client.getRecentTransactionDetail(transaction)`

Fetches detail for a single transaction. Pass the full transaction object returned by `getTransactionList`.

**Returns:** `object | null`

## 📝 License

This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for full text.

## 🤝 References

- KBiz portal — <https://www.kasikornbank.com/th/kbiz/pages/index.aspx>
