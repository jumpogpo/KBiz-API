const axios = require("axios");

const BASE_URL = "https://kbiz.kasikornbank.com";
const CUST_TYPE = "IX";
const OWNER_TYPE = "Company";
const ACCT_TYPE_SAVING = "SA";
const LOCALE = "th";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

const ENDPOINTS = {
  loginAuthen: "/authen/loginAuthen.do",
  redirectToIB: "/authen/ib/redirectToIB.jsp",
  validateSession: "/services/api/authentication/validateSession",
  refreshSession: "/services/api/refreshSession",
  accountSummary: "/services/api/accountsummary/getAccountSummaryList",
  recentTransactionList: "/services/api/accountsummary/getRecentTransactionList",
  recentTransactionDetail: "/services/api/accountsummary/getRecentTransactionDetail",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatDateDMY = (date = new Date()) =>
  [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear(),
  ].join("/");

const parseSetCookies = (setCookieHeader = []) => {
  const cookies = new Map();
  for (const entry of setCookieHeader) {
    const [pair] = entry.split(";");
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1));
  }
  return cookies;
};

const extractBetween = (str, start, end) => {
  const startIdx = str.indexOf(start);
  if (startIdx === -1) return null;
  const from = startIdx + start.length;
  const endIdx = str.indexOf(end, from);
  return endIdx === -1 ? null : str.substring(from, endIdx);
};

class KBiz {
  #client;

  constructor({ username, password, bankAccountNumber, ibId, token } = {}) {
    for (const [field, value] of Object.entries({ username, password, bankAccountNumber })) {
      if (value == null || String(value).trim() === "") {
        throw new Error(`${field} is required.`);
      }
    }

    this.username = username;
    this.password = password;
    this.bankAccountNumber = bankAccountNumber;
    this.ibId = ibId ?? null;
    this.token = token ?? null;

    this.#client = axios.create({ baseURL: BASE_URL });
    if (this.token) this.#client.defaults.headers.common.Authorization = this.token;
    if (this.ibId) this.#client.defaults.headers.common["X-IB-ID"] = this.ibId;
  }

  async login() {
    try {
      const initRes = await this.#client.post(ENDPOINTS.loginAuthen);
      const initCookies = parseSetCookies(initRes.headers["set-cookie"]);
      const alteonP = initCookies.get("AlteonP");
      const jSessionId = initCookies.get("JSESSIONID");

      const tokenId = extractBetween(initRes.data, 'id="tokenId" value="', '"/>');
      if (!tokenId) throw new Error("Failed to extract tokenId from login page.");

      const body = new URLSearchParams({
        userName: this.username,
        password: this.password,
        tokenId,
        cmd: "authenticate",
        locale: LOCALE,
      }).toString();

      const loginRes = await this.#client.post(ENDPOINTS.loginAuthen, body, {
        headers: { Cookie: `AlteonP=${alteonP}; JSESSIONID=${jSessionId}` },
      });

      if (!loginRes.headers["set-cookie"]) {
        throw new Error("Login failed: missing set-cookie header. Please re-check your username and password.");
      }

      const rssoJSessionId = parseSetCookies(loginRes.headers["set-cookie"]).get("JSESSIONID");
      const redirectRes = await this.#client.get(ENDPOINTS.redirectToIB, {
        headers: { Cookie: `AlteonP=${alteonP}; JSESSIONID=${rssoJSessionId};` },
      });

      const dataRsso = extractBetween(redirectRes.data, "dataRsso=", '";');
      if (!dataRsso) throw new Error("Failed to extract dataRsso from redirect page.");

      const validateRes = await this.#client.post(ENDPOINTS.validateSession, { dataRsso });

      this.ibId = validateRes.data.data.userProfiles[0].ibId;
      this.token = validateRes.headers["x-session-token"];

      Object.assign(this.#client.defaults.headers.common, {
        Authorization: this.token,
        "X-IB-ID": this.ibId,
        Cookie: `AlteonP=${alteonP};`,
      });

      return { success: true, ibId: this.ibId, token: this.token };
    } catch (error) {
      console.error(error);
      return { success: false };
    }
  }

  async checkSession() {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await this.#client.post(ENDPOINTS.refreshSession, {});
        return true;
      } catch {
        if (attempt < MAX_RETRIES - 1) await sleep(RETRY_DELAY_MS);
      }
    }
    return false;
  }

  async getUserInfo() {
    const res = await this.#requestWithRetry(() =>
      this.#client.post(ENDPOINTS.accountSummary, {
        custType: CUST_TYPE,
        isReload: "N",
        lang: LOCALE,
        nicknameType: "OWNAC",
        ownerId: this.ibId,
        ownerType: OWNER_TYPE,
        pageAmount: 6,
      })
    );
    return res?.data?.data ?? null;
  }

  async getTransactionList(limitRow = 7, startDate = null, endDate = null) {
    const today = formatDateDMY();
    const res = await this.#requestWithRetry(() =>
      this.#client.post(ENDPOINTS.recentTransactionList, {
        acctNo: this.bankAccountNumber,
        acctType: ACCT_TYPE_SAVING,
        custType: CUST_TYPE,
        endDate: endDate ?? today,
        ownerId: this.ibId,
        ownerType: OWNER_TYPE,
        pageNo: "1",
        rowPerPage: limitRow,
        startDate: startDate ?? today,
      })
    );

    const transactions = res?.data?.data?.recentTransactionList;
    if (!transactions) return [];

    const result = [];
    for (const tx of transactions) {
      const detail = await this.getRecentTransactionDetail(tx);
      result.push({ ...tx, detail: detail?.data ?? null });
    }
    return result;
  }

  async getRecentTransactionDetail(transaction) {
    const { transDate, origRqUid, originalSourceId, debitCreditIndicator, transCode, transType } = transaction;
    const res = await this.#requestWithRetry(() =>
      this.#client.post(ENDPOINTS.recentTransactionDetail, {
        transDate: transDate.split(" ")[0],
        acctNo: this.bankAccountNumber,
        origRqUid,
        custType: CUST_TYPE,
        originalSourceId,
        transCode,
        debitCreditIndicator,
        transType,
        ownerType: OWNER_TYPE,
        ownerId: this.ibId,
      })
    );
    return res?.data ?? null;
  }

  async #requestWithRetry(fn) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const status = error.response?.status;
        if (status === 401 && attempt < MAX_RETRIES - 1) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        console.error(error.response?.data ?? error.response ?? error);
        return null;
      }
    }
    return null;
  }
}

module.exports = KBiz;
