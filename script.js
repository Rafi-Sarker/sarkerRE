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

/*
// ===== CONFIG =====
const BASE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkLvYO7zFb0hAHx-c1Y_oIjFd9XrLVc3PNbO3SFkcDZB0c0cN1rSufukzRr2kqA1nacfBpNOw9vPuX/pub";

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

// ===== CSV PARSER =====
function parseCSV(text) {
  const rows = text.trim().split("\n").map(r =>
    r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
  );

  const headers = rows.shift().map(h => h.trim().toLowerCase());

  return rows.map(r => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = r[i]?.replace(/(^"|"$)/g, "").trim() || "";
    });
    return obj;
  });
}

// ===== LOAD DATA =====
async function initSheets() {
  console.log("⏳ Loading Sheets...");

  try {
    for (const key in SHEETS) {
      const res = await fetch(SHEETS[key]);
      if (!res.ok) throw new Error(`Failed: ${key}`);

      const text = await res.text();
      const data = parseCSV(text);

      if (key === "Investors") investors = data;
      if (key === "Investments") investments = data;
      if (key === "Notices") notices = data;

      console.log(`✅ ${key}`, data);
    }

    isDataLoaded = true;
    console.log("✅ ALL DATA LOADED");

    loadNotices();
    loadReviews(); // 🔥 NEW

  } catch (err) {
    console.error("❌ ERROR:", err);
    alert("Sheet loading failed");
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
  const u = document.getElementById("username")?.value.trim();
  const p = document.getElementById("password")?.value.trim();

  currentUser = investors.find(i => i.username === u && i.password === p);

  if (!currentUser) return alert("❌ Wrong login");

  document.getElementById("loginPage").style.display = "none";
  document.getElementById("dashboardPage").style.display = "block";

  loadDashboard();
}

// ===== DASHBOARD =====
function loadDashboard() {

  loadNotices();
  loadReviews(); // 🔥 ensure always fresh

  const userInvestments = investments.filter(i =>
    i.username === currentUser.username
  );

  const grouped = {};

  userInvestments.forEach(i => {
    if (!grouped[i.project]) {
      grouped[i.project] = {
        total: Number(i.total) || 0,
        invested: []
      };
    }

    grouped[i.project].invested.push({
      amount: Number(i.amount) || 0,
      date: i.date || "-"
    });
  });

  let totalValue = 0;
  let totalInvested = 0;
  let projectHTML = "";
  let historyHTML = "";

  Object.keys(grouped).forEach(project => {

    const inv = grouped[project];
    const investedSum = inv.invested.reduce((s, i) => s + i.amount, 0);
    const progress = inv.total > 0
      ? ((investedSum / inv.total) * 100).toFixed(2)
      : 0;

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

    inv.invested.forEach(i => {
      historyHTML += `
        <tr>
          <td>${project}</td>
          <td>৳${i.amount}</td>
          <td>${i.date}</td>
        </tr>`;
    });
  });

  document.getElementById("user") && (document.getElementById("user").innerText = currentUser.name || currentUser.username);
  document.getElementById("investment") && (document.getElementById("investment").innerText = "৳" + totalValue);
  document.getElementById("invested") && (document.getElementById("invested").innerText = "৳" + totalInvested);
  document.getElementById("totalProjects") && (document.getElementById("totalProjects").innerText = Object.keys(grouped).length);
  document.getElementById("projectList") && (document.getElementById("projectList").innerHTML = projectHTML);
  document.getElementById("historyTable") && (document.getElementById("historyTable").innerHTML = historyHTML);
}

// ===== REVIEWS (FROM INVESTORS) =====
function loadReviews() {
  const box = document.getElementById("reviewList");
  if (!box) return;

  const reviewUsers = investors.filter(i => i.comment && i.comment.trim() !== "");

  if (!reviewUsers.length) {
    box.innerHTML = `<div class="review-empty">No reviews yet ⭐</div>`;
    return;
  }

  let html = "";

  reviewUsers.forEach((u, index) => {

    const rating = Number(u.rating || 5);
    const stars = "⭐".repeat(rating) + "☆".repeat(5 - rating);

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
    filtered = notices.filter(n =>
      !n.username || n.username === currentUser.username
    );
  } else {
    filtered = notices.filter(n =>
      !n.username
    );
  }

  const today = new Date();

  filtered = filtered.filter(n =>
    !n.expiry || new Date(n.expiry) >= today
  );

  filtered.sort((a, b) =>
    (String(b.pin).toLowerCase() === "true") -
    (String(a.pin).toLowerCase() === "true")
  );

  window.noticeData = filtered;

  let read = JSON.parse(localStorage.getItem("readNotices") || "[]");

  let html = "";
  let unreadCount = 0;

  filtered.forEach((n, i) => {

    const isRead = read.includes(n.title);
    if (!isRead) unreadCount++;

    html += `
      <div class="notice-item ${!isRead ? "unread" : ""}" onclick="openNotice(${i})">
        <h4>${n.title || "No Title"} ${String(n.pin).toLowerCase() === "true" ? "📌" : ""}</h4>
        <small>${n.date || "-"}</small>
      </div>
    `;
  });

  if (filtered.length === 0) {
    html = "<p style='font-size:13px;color:#777;'>No updates</p>";
  }

  const list = document.getElementById("noticeList");
  if (list) list.innerHTML = html;

  const badge = document.getElementById("noticeCount");
  if (badge) badge.innerText = unreadCount;
}

// ===== MODAL =====
function openNotice(i) {
  const n = window.noticeData[i];

  document.getElementById("noticeTitle") && (document.getElementById("noticeTitle").innerText = n.title);
  document.getElementById("noticeMessage") && (document.getElementById("noticeMessage").innerText = n.message);
  document.getElementById("noticeModal") && (document.getElementById("noticeModal").style.display = "flex");

  let read = JSON.parse(localStorage.getItem("readNotices") || "[]");

  if (!read.includes(n.title)) {
    read.push(n.title);
    localStorage.setItem("readNotices", JSON.stringify(read));
  }

  loadNotices();
}

function closeNotice() {
  document.getElementById("noticeModal") && (document.getElementById("noticeModal").style.display = "none");
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  initSheets();
});

*/
