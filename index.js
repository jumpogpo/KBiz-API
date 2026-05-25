const KBiz = require("./class/KBiz.js");

const config = {
  username: "",
  password: "",
  bankAccountNumber: "",
};

(async () => {
  const client = new KBiz(config);

  const { success } = await client.login();
  if (!success) return console.log("Login failed.");

  const sessionIsAlive = await client.checkSession();
  if (!sessionIsAlive) return console.log("Session is dead.");

  const userInfo = await client.getUserInfo();
  if (!userInfo) return console.log("Failed to get user info.");

  for (const { accountNo, accountNameTh, acctBalance } of userInfo.accountSummaryList) {
    console.log(`Account: ${accountNo} | Account Name: ${accountNameTh} | Balance: ${acctBalance} Baht`);
  }

  const transactionList = await client.getTransactionList(100, "01/09/2024", "14/09/2024");
  console.log(transactionList);
})();
