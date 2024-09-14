const KBiz = require("./class/KBiz.js");

(async() => {
    var config = {
      username: "",
      password: "",
      bankAccountNumber: "",
    };

    const kBizClient = new KBiz(config);
    const loginData = await kBizClient.login();
    
    if (loginData.success) {
      const sessionIsAlive = await kBizClient.checkSession();

      if (sessionIsAlive) {
        const userInfo = await kBizClient.getUserInfo();
  
        if (userInfo == null) return console.log('Failed to get user info.');
  
        for (let account of userInfo["accountSummaryList"]) {
          const accountId = account["accountNo"];
          const accountBalance = account["acctBalance"];
          const accountNameTh = account["accountNameTh"]
          console.log(`Account: ${accountId} | Account Name: ${accountNameTh} | Balance: ${accountBalance} Baht`);
        }
  
        const transactionList = await kBizClient.getTransactionList(100, "01/09/2024", "14/09/2024"); // or await kBizClient.getTransactionList(100);
        console.log(transactionList)
      } else {
        console.log("Session is dead.");
      }
    } else {
      console.log('Login failed.');
    }
})();