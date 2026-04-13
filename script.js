document.addEventListener('DOMContentLoaded', () => {
    const mobileMenu = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    const header = document.querySelector('header');

    if (mobileMenu && navLinks) {
        mobileMenu.addEventListener('click', () => {
            const expanded = mobileMenu.getAttribute('aria-expanded') === 'true';
            navLinks.classList.toggle('active');
            mobileMenu.setAttribute('aria-expanded', String(!expanded));
        });

        navLinks.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                mobileMenu.setAttribute('aria-expanded', 'false');
            });
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', function onAnchorClick(event) {
            const targetSelector = this.getAttribute('href');
            const target = targetSelector ? document.querySelector(targetSelector) : null;

            if (!target) {
                return;
            }

            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        });
    });

    window.addEventListener('scroll', () => {
        if (!header) {
            return;
        }

        header.style.padding = window.scrollY > 50 ? '12px 0' : '20px 0';
    });

    const revealItems = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && revealItems.length > 0) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        revealItems.forEach((item) => observer.observe(item));
    } else {
        revealItems.forEach((item) => item.classList.add('visible'));
    }
});

// ===== CONFIG =====
const BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQkLvYO7zFb0hAHx-c1Y_oIjFd9XrLVc3PNbO3SFkcDZB0c0cN1rSufukzRr2kqA1nacfBpNOw9vPuX/pub';

const SHEETS = {
    Investors: `${BASE}?gid=0&single=true&output=csv`,
    Investments: `${BASE}?gid=1466113161&single=true&output=csv`,
    Notices: `${BASE}?gid=1179149768&single=true&output=csv`
};

// ===== GLOBAL DATA =====
let investors = [];
let investments = [];
let notices = [];

let currentUser = null;
let isDataLoaded = false;

function hasDashboardView() {
    return Boolean(document.getElementById('loginPage') && document.getElementById('dashboardPage'));
}

function saveSessionUser(user) {
    sessionStorage.setItem('investorUser', JSON.stringify({ username: user.username }));
}

function getSessionUser() {
    const raw = sessionStorage.getItem('investorUser');
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

// ===== CSV PARSER =====
function parseCSV(text) {
    const rows = text.trim().split('\n').map((r) => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));

    const headers = rows.shift().map((h) => h.trim().toLowerCase());

    return rows.map((r) => {
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = r[i]?.replace(/(^"|"$)/g, '').trim() || '';
        });
        return obj;
    });
}

// ===== LOAD DATA =====
async function initSheets() {
    try {
        for (const key in SHEETS) {
            const res = await fetch(SHEETS[key]);
            if (!res.ok) throw new Error(`Failed: ${key}`);

            const text = await res.text();
            const data = parseCSV(text);

            if (key === 'Investors') investors = data;
            if (key === 'Investments') investments = data;
            if (key === 'Notices') notices = data;
        }

        isDataLoaded = true;

        if (hasDashboardView()) {
            tryAutoLoginFromSession();
        }

        loadNotices();
        loadReviews();
    } catch (err) {
        alert('Sheet loading failed');
        console.error(err);
    }
}

// ===== LOGIN =====
function waitForDataAndLogin() {
    if (!isDataLoaded) {
        setTimeout(waitForDataAndLogin, 500);
    } else {
        login();
    }
}

function login() {
    const u = document.getElementById('username')?.value.trim();
    const p = document.getElementById('password')?.value.trim();

    currentUser = investors.find((i) => i.username === u && i.password === p);

    if (!currentUser) {
        alert('❌ Wrong username or password');
        return;
    }

    saveSessionUser(currentUser);

    if (hasDashboardView()) {
        showDashboard();
    } else {
        window.location.href = 'user.html';
    }
}

function tryAutoLoginFromSession() {
    const sessionUser = getSessionUser();
    if (!sessionUser?.username) return;

    const foundUser = investors.find((i) => i.username === sessionUser.username);
    if (!foundUser) return;

    currentUser = foundUser;
    showDashboard();
}

function showDashboard() {
    const loginPage = document.getElementById('loginPage');
    const dashboardPage = document.getElementById('dashboardPage');

    if (loginPage) loginPage.style.display = 'none';
    if (dashboardPage) dashboardPage.style.display = 'block';

    closeLoginModal();
    loadDashboard();
}

function logoutUser() {
    currentUser = null;
    sessionStorage.removeItem('investorUser');

    const loginPage = document.getElementById('loginPage');
    const dashboardPage = document.getElementById('dashboardPage');

    if (dashboardPage) dashboardPage.style.display = 'none';
    if (loginPage) loginPage.style.display = 'block';
}

// ===== DASHBOARD =====
function loadDashboard() {
    if (!currentUser) return;

    loadNotices();
    loadReviews();

    const userInvestments = investments.filter((i) => i.username === currentUser.username);
    const grouped = {};

    userInvestments.forEach((i) => {
        if (!grouped[i.project]) {
            grouped[i.project] = {
                total: Number(i.total) || 0,
                invested: []
            };
        }

        grouped[i.project].invested.push({
            amount: Number(i.amount) || 0,
            date: i.date || '-'
        });
    });

    let totalValue = 0;
    let totalInvested = 0;
    let projectHTML = '';
    let historyHTML = '';

    Object.keys(grouped).forEach((project) => {
        const inv = grouped[project];
        const investedSum = inv.invested.reduce((s, item) => s + item.amount, 0);
        const progress = inv.total > 0 ? ((investedSum / inv.total) * 100).toFixed(2) : 0;

        totalValue += inv.total;
        totalInvested += investedSum;

        projectHTML += `
      <div class="project-card">
        <div class="project-content">
          <h3>${project}</h3>
          <p><b>Total Value:</b> ৳${inv.total}</p>
          <p><b>Invested:</b> ৳${investedSum}</p>
          <div class="progress-bar">
            <div class="progress" style="width:${progress}%">${progress}%</div>
          </div>
        </div>
      </div>
    `;

        inv.invested.forEach((item) => {
            historyHTML += `
        <tr>
          <td>${project}</td>
          <td>৳${item.amount}</td>
          <td>${item.date}</td>
        </tr>`;
        });
    });

    const userEl = document.getElementById('user');
    const investmentEl = document.getElementById('investment');
    const investedEl = document.getElementById('invested');
    const totalProjectsEl = document.getElementById('totalProjects');
    const projectListEl = document.getElementById('projectList');
    const historyTableEl = document.getElementById('historyTable');

    if (userEl) userEl.innerText = currentUser.name || currentUser.username;
    if (investmentEl) investmentEl.innerText = `৳${totalValue}`;
    if (investedEl) investedEl.innerText = `৳${totalInvested}`;
    if (totalProjectsEl) totalProjectsEl.innerText = Object.keys(grouped).length;
    if (projectListEl) projectListEl.innerHTML = projectHTML || '<p>No active projects found.</p>';
    if (historyTableEl) {
        historyTableEl.innerHTML = historyHTML || '<tr><td colspan="3">No investment history found.</td></tr>';
    }
}

// ===== REVIEWS (FROM INVESTORS) =====
function loadReviews() {
    const box = document.getElementById('reviewList');
    if (!box) return;

    const reviewUsers = investors.filter((i) => i.comment && i.comment.trim() !== '');

    if (!reviewUsers.length) {
        box.innerHTML = '<div class="review-empty">No reviews yet ⭐</div>';
        return;
    }

    let html = '';

    reviewUsers.forEach((u, index) => {
        const rating = Math.max(1, Math.min(5, Number(u.rating || 5)));
        const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);

        html += `
      <div class="review-card" style="animation-delay:${index * 0.05}s">
        <strong>${u.name || u.username}</strong>
        <div class="review-stars">${stars}</div>
        <div>${u.comment}</div>
      </div>
    `;
    });

    box.innerHTML = html;
}

// ===== NOTICES =====
function loadNotices() {
    let filtered = [];

    if (currentUser) {
        filtered = notices.filter((n) => !n.username || n.username === currentUser.username);
    } else {
        filtered = notices.filter((n) => !n.username);
    }

    const today = new Date();
    filtered = filtered.filter((n) => !n.expiry || new Date(n.expiry) >= today);

    filtered.sort((a, b) => (String(b.pin).toLowerCase() === 'true') - (String(a.pin).toLowerCase() === 'true'));

    window.noticeData = filtered;

    const read = JSON.parse(localStorage.getItem('readNotices') || '[]');
    let html = '';
    let unreadCount = 0;

    filtered.forEach((n, i) => {
        const isRead = read.includes(n.title);
        if (!isRead) unreadCount += 1;

        html += `
      <div class="notice-item ${!isRead ? 'unread' : ''}" onclick="openNotice(${i})">
        <h4>${n.title || 'No Title'} ${String(n.pin).toLowerCase() === 'true' ? '📌' : ''}</h4>
        <small>${n.date || '-'}</small>
      </div>
    `;
    });

    if (filtered.length === 0) {
        html = "<p style='font-size:13px;color:#777;'>No updates</p>";
    }

    const list = document.getElementById('noticeList');
    if (list) list.innerHTML = html;

    const badge = document.getElementById('noticeCount');
    if (badge) badge.innerText = unreadCount;
}

// ===== MODALS =====
function openNotice(i) {
    const n = window.noticeData[i];
    if (!n) return;

    const titleEl = document.getElementById('noticeTitle');
    const messageEl = document.getElementById('noticeMessage');
    const modalEl = document.getElementById('noticeModal');

    if (titleEl) titleEl.innerText = n.title;
    if (messageEl) messageEl.innerText = n.message;
    if (modalEl) modalEl.style.display = 'flex';

    const read = JSON.parse(localStorage.getItem('readNotices') || '[]');
    if (!read.includes(n.title)) {
        read.push(n.title);
        localStorage.setItem('readNotices', JSON.stringify(read));
    }

    loadNotices();
}

function closeNotice() {
    const modal = document.getElementById('noticeModal');
    if (modal) modal.style.display = 'none';
}

function toggleNoticePanel() {
    const panel = document.getElementById('noticePanel');
    if (!panel) return;
    panel.classList.toggle('open');
}

function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (!modal) {
        window.location.href = 'user.html';
        return;
    }

    modal.style.display = 'flex';
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (!modal) return;
    modal.style.display = 'none';
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    const noticeToggle = document.getElementById('noticeToggle');
    const loginToggle = document.getElementById('loginToggle');
    const loginSubmit = document.getElementById('loginSubmit');
    const pageLoginSubmit = document.getElementById('pageLoginSubmit');
    const logoutBtn = document.getElementById('logoutBtn');

    if (noticeToggle) {
        noticeToggle.addEventListener('click', toggleNoticePanel);
    }

    if (loginToggle) {
        loginToggle.addEventListener('click', openLoginModal);
    }

    if (loginSubmit) {
        loginSubmit.addEventListener('click', waitForDataAndLogin);
    }

    if (pageLoginSubmit) {
        pageLoginSubmit.addEventListener('click', waitForDataAndLogin);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }

    initSheets();
});
