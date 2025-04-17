import { generateTOTP } from './otp.js';

const codesContainer = document.getElementById('codes');
const timerBar = document.getElementById('timerBar');
const toggleAddBtn = document.getElementById('toggleAdd');
const addForm = document.getElementById('addForm');
const accountInput = document.getElementById('accountName');
const secretInput = document.getElementById('secretKey');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFile');
const cancelAdd = document.getElementById('cancelAdd');
const addFirstAccount = document.getElementById('addFirstAccount');


cancelAdd.addEventListener('click', () => {
    addForm.classList.toggle('hidden');
  });

toggleAddBtn.addEventListener('click', () => {
  addForm.classList.toggle('hidden');
});

addFirstAccount.addEventListener('click', () => {
    addForm.classList.toggle('hidden');
  });

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = accountInput.value.trim();
  const secret = secretInput.value.trim().toUpperCase();

  if (!name || !secret) return;

  const newAccount = { label: name, secret };

  chrome.storage.local.get(['accounts'], (res) => {
    const accounts = res.accounts || [];
    accounts.push(newAccount);
    chrome.storage.local.set({ accounts }, () => {
      accountInput.value = '';
      secretInput.value = '';
      addForm.classList.add('hidden');
      renderCodes();
    });
  });
});

async function getAccounts() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['accounts'], (res) => {
      resolve(res.accounts || []);
    });
  });
}

async function renderCodes() {
    const accounts = await getAccounts();
    codesContainer.innerHTML = '';
  
    // Check if accounts are empty and show/hide the empty state message
    const emptyState = document.getElementById('emptyState');
    if (accounts.length === 0) {
      emptyState.classList.remove('hidden');  
    } else {
      emptyState.classList.add('hidden');   
    }
  
    for (const account of accounts) {
      const code = await generateTOTP(account.secret);
      const box = document.createElement('div');
      box.className = 'code-item';
      box.innerHTML = `
        <div class="code-card">
    <div class="code-content">
      <div class="label">${account.label}</div>
      <div class="code">${code}</div>
    </div>
    <div class="code-actions">
      <button class="copy-btn" data-code="${code}">Copy</button>
      <button class="remove-btn" data-label="${account.label}">Remove</button>
    </div>
  </div>
      `;
      codesContainer.appendChild(box);
    }

    const codeElements = document.querySelectorAll('.code');
    codeElements.forEach(codeElement => {
      codeElement.addEventListener('click', (e) => {
        const code = e.target.innerText;  // Get the OTP code from the clicked element
        copyToClipboard(code);
      });
    });
  
    // Add event listeners to the "Copy" buttons
    const copyBtns = document.querySelectorAll('.copy-btn');
    copyBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const code = e.target.getAttribute('data-code');
        copyToClipboard(code);
      });
    });
  
    // Add event listeners to the "Remove" buttons
    const removeBtns = document.querySelectorAll('.remove-btn');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const label = e.target.getAttribute('data-label');
        removeAccount(label);
      });
    });
  }
  
  function copyToClipboard(code) {
    navigator.clipboard.writeText(code).then(() => {
      // Show a temporary "Copied!" message
      const copyBtn = document.querySelector(`[data-code="${code}"]`);
      const originalText = copyBtn.innerText;
      copyBtn.innerText = 'Copied!';
      
      setTimeout(() => {
        copyBtn.innerText = originalText; // Reset text after a short delay
      }, 1000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }
  

async function removeAccount(label) {
  chrome.storage.local.get(['accounts'], (res) => {
    let accounts = res.accounts || [];
    accounts = accounts.filter(account => account.label !== label); // Filter out the account to remove
    chrome.storage.local.set({ accounts }, () => {
      renderCodes(); // Re-render the updated list of accounts
    });
  });
}

function updateProgressBar() {
  const seconds = 30 - (Math.floor(Date.now() / 1000) % 30);
  const percentage = (seconds / 30) * 100;
  timerBar.style.width = `${percentage}%`;
}

function refreshLoop() {
  renderCodes();
  updateProgressBar();
  setInterval(() => {
    updateProgressBar();
    const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
    if (remaining === 30) renderCodes();
  }, 1000);
}

function exportAccounts(accounts) {
  const blob = new Blob([JSON.stringify(accounts)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'accounts.json';
  link.click();
}

function importAccounts(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const accounts = JSON.parse(reader.result);
    chrome.storage.local.set({ accounts }, () => {
      renderCodes();
    });
  };
  reader.readAsText(file);
}

exportBtn.addEventListener('click', async () => {
  const accounts = await getAccounts();
  exportAccounts(accounts);
});

importBtn.addEventListener('click', () => {
  importFileInput.click();
});

importFileInput.addEventListener('change', () => {
  const file = importFileInput.files[0];
  if (file) {
    importAccounts(file);
  }
});

refreshLoop();
