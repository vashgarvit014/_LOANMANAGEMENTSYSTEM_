import Web3 from 'web3';
import contractABI from './contractABI.json';

const contractAddress = "0xd1e3D48B720928235fCCDae0631EcAc748434CcC";
let web3;
let contract;
let account;
let isConnected = false;

const eduChainConfig = {
  chainId: "0xa045c",
  chainName: "EDU Chain Testnet",
  rpcUrls: ["https://rpc.open-campus-codex.gelato.digital"],
  nativeCurrency: { name: "EDU", symbol: "EDU", decimals: 18 },
  blockExplorerUrls: ["https://opencampus-codex.blockscout.com"]
};

async function switchToEduChain() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: eduChainConfig.chainId }]
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [eduChainConfig]
      });
    } else {
      console.error('Network switch failed:', err);
      throw err;
    }
  }
}

async function connectWallet() {
  if (!window.ethereum) return alert("Please install MetaMask.");
  try {
    await switchToEduChain();
    web3 = new Web3(window.ethereum);
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    account = accounts[0];
    contract = new web3.eth.Contract(contractABI, contractAddress);
    isConnected = true;
    localStorage.setItem('connectedAccount', account);

    document.getElementById('account').innerText = account;
    const admin = await contract.methods.admin().call();
    document.getElementById('admin').innerText = admin;
    document.getElementById('connect-wallet').innerText = "Wallet Connected";
    document.getElementById('connect-wallet').disabled = true;
  } catch (err) {
    console.error("Wallet connection failed:", err);
    alert(err.message);
  }
}

async function init() {
  if (!window.ethereum) return;
  web3 = new Web3(window.ethereum);
  const storedAccount = localStorage.getItem('connectedAccount');
  if (!storedAccount) return;

  const accounts = await web3.eth.getAccounts();
  if (accounts[0]?.toLowerCase() === storedAccount.toLowerCase()) {
    account = accounts[0];
    contract = new web3.eth.Contract(contractABI, contractAddress);
    isConnected = true;

    document.getElementById('account').innerText = account;
    document.getElementById('connect-wallet').innerText = "Wallet Connected";
    document.getElementById('connect-wallet').disabled = true;

    const admin = await contract.methods.admin().call();
    document.getElementById('admin').innerText = admin;
  }
}

function checkConnection() {
  if (!isConnected) {
    alert('Please connect your wallet first.');
    return false;
  }
  return true;
}

// ================== Contract Functions ==================

async function requestLoan() {
  if (!checkConnection()) return;
  const amount = document.getElementById('loan-amount').value;
  if (!amount || isNaN(amount) || Number(amount) <= 0) return alert("Invalid loan amount");
  const wei = web3.utils.toWei(amount, 'ether');
  try {
    const gas = await contract.methods.requestLoan(wei).estimateGas({ from: account });
    await contract.methods.requestLoan(wei).send({ from: account, gas });
    document.getElementById('request-status').innerText = `Loan requested: ${amount} EDU`;
  } catch (err) {
    document.getElementById('request-status').innerText = `Error: ${err.message}`;
    document.getElementById('request-status').style.color = 'red';
  }
}

async function repayLoan() {
  if (!checkConnection()) return;
  const amount = document.getElementById('repay-amount').value;
  if (!amount || isNaN(amount) || Number(amount) <= 0) return alert("Invalid repay amount");
  const wei = web3.utils.toWei(amount, 'ether');
  try {
    const gas = await contract.methods.repayLoan().estimateGas({ from: account, value: wei });
    await contract.methods.repayLoan().send({ from: account, value: wei, gas });
    document.getElementById('repay-status').innerText = `Loan repaid: ${amount} EDU`;
  } catch (err) {
    document.getElementById('repay-status').innerText = `Error: ${err.message}`;
    document.getElementById('repay-status').style.color = 'red';
  }
}

async function fundContract() {
  if (!checkConnection()) return;
  const amount = document.getElementById('fund-amount').value;
  if (!amount || isNaN(amount) || Number(amount) <= 0) return alert("Invalid fund amount");
  const wei = web3.utils.toWei(amount, 'ether');
  try {
    const admin = await contract.methods.admin().call();
    if (admin.toLowerCase() !== account.toLowerCase()) throw new Error("Only admin can fund");
    const gas = await contract.methods.fundContract().estimateGas({ from: account, value: wei });
    await contract.methods.fundContract().send({ from: account, value: wei, gas });
    document.getElementById('fund-status').innerText = `Funded contract with ${amount} EDU`;
  } catch (err) {
    document.getElementById('fund-status').innerText = `Error: ${err.message}`;
    document.getElementById('fund-status').style.color = 'red';
  }
}

async function approveLoan() {
  if (!checkConnection()) return;
  const loanId = document.getElementById('loan-id').value;
  if (!loanId || isNaN(loanId)) return alert("Invalid loan ID");
  try {
    const gas = await contract.methods.approveLoan(loanId).estimateGas({ from: account });
    await contract.methods.approveLoan(loanId).send({ from: account, gas });
    document.getElementById('approve-status').innerText = `Loan ${loanId} approved`;
  } catch (err) {
    document.getElementById('approve-status').innerText = `Error: ${err.message}`;
    document.getElementById('approve-status').style.color = 'red';
  }
}

async function withdrawFunds() {
  if (!checkConnection()) return;
  const amount = document.getElementById('withdraw-amount').value;
  if (!amount || isNaN(amount) || Number(amount) <= 0) return alert("Invalid withdrawal amount");
  const wei = web3.utils.toWei(amount, 'ether');
  try {
    const gas = await contract.methods.withdrawFunds(wei).estimateGas({ from: account });
    await contract.methods.withdrawFunds(wei).send({ from: account, gas });
    document.getElementById('withdraw-status').innerText = `Withdrew ${amount} EDU`;
  } catch (err) {
    document.getElementById('withdraw-status').innerText = `Error: ${err.message}`;
    document.getElementById('withdraw-status').style.color = 'red';
  }
}

async function checkLoanStatus() {
  if (!checkConnection()) return;
  try {
    const result = await contract.methods.getLoanStatus(account).call();
    const [loanId, amount, approved, repaid, timestamp] = Object.values(result);
    const edu = web3.utils.fromWei(amount, 'ether');
    const time = new Date(Number(timestamp) * 1000).toLocaleString();
    document.getElementById('loan-status').innerText =
      `Loan ID: ${loanId}, Amount: ${edu} EDU, Approved: ${approved}, Repaid: ${repaid}, Timestamp: ${time}`;
  } catch (err) {
    document.getElementById('loan-status').innerText = `Error: ${err.message}`;
    document.getElementById('loan-status').style.color = 'red';
  }
}

async function checkExistingLoan() {
  if (!checkConnection()) return;
  try {
    const loanId = await contract.methods.borrowerToLoanId(account).call();
    const loan = await contract.methods.getLoanById(loanId).call();
    const amount = web3.utils.fromWei(loan.amount, 'ether');
    const time = new Date(Number(loan.timestamp) * 1000).toLocaleString();
    document.getElementById('loan-status').innerText =
      `Existing Loan - ID: ${loanId}, Borrower: ${loan.borrower}, Amount: ${amount} EDU, Approved: ${loan.approved}, Repaid: ${loan.repaid}, Timestamp: ${time}`;
  } catch (err) {
    document.getElementById('loan-status').innerText = `Error: ${err.message}`;
    document.getElementById('loan-status').style.color = 'red';
  }
}

async function getLoanById() {
  if (!checkConnection()) return;
  const loanId = document.getElementById('loan-id-query').value;
  if (!loanId || isNaN(loanId)) return alert("Invalid loan ID");
  try {
    const loan = await contract.methods.getLoanById(loanId).call();
    const amount = web3.utils.fromWei(loan.amount, 'ether');
    const time = new Date(Number(loan.timestamp) * 1000).toLocaleString();
    const info = `Loan ID: ${loanId}, Borrower: ${loan.borrower}, Amount: ${amount} EDU, Approved: ${loan.approved}, Repaid: ${loan.repaid}, Timestamp: ${time}`;
    document.getElementById('loan-by-id-result').innerText = info;
  } catch (err) {
    document.getElementById('loan-by-id-result').innerText = `Error: ${err.message}`;
  }
}

async function getAllLoans() {
  if (!checkConnection()) return;
  try {
    const loans = await contract.methods.getAllLoanRequests().call();
    const container = document.getElementById('all-loans');
    container.innerHTML = '';
    if (!loans.length) {
      container.innerHTML = '<p>No loans found.</p>';
      return;
    }
    loans.forEach((loan, i) => {
      const edu = web3.utils.fromWei(loan.amount, 'ether');
      const date = new Date(Number(loan.timestamp) * 1000).toLocaleString();
      const p = document.createElement('p');
      p.innerText = `Loan ${i}: Borrower: ${loan.borrower}, Amount: ${edu} EDU, Approved: ${loan.approved}, Repaid: ${loan.repaid}, Timestamp: ${date}`;
      container.appendChild(p);
    });
  } catch (err) {
    document.getElementById('all-loans').innerHTML = `<p>Error: ${err.message}</p>`;
  }
}

// ================== Expose to Window ==================

window.connectWallet = connectWallet;
window.requestLoan = requestLoan;
window.repayLoan = repayLoan;
window.fundContract = fundContract;
window.approveLoan = approveLoan;
window.withdrawFunds = withdrawFunds;
window.checkLoanStatus = checkLoanStatus;
window.checkExistingLoan = checkExistingLoan;
window.getLoanById = getLoanById;
window.getAllLoans = getAllLoans;

window.addEventListener('load', init);
// Add this to your existing app.js