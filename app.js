
let dailyContent = [];
let today = null;
let lastVerseRef = null;

function localParts() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Melbourne";

  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date()).map(p => [p.type, p.value])
  );
}

function schedule() {
  try {
    const s = JSON.parse(localStorage.getItem("dailyFaithReminder") || "null");
    if (s?.times?.length) return s;
  } catch {}

  return { times: ["08:00", "18:00"], enabled: true };
}

/* Shared rotation formula.
   Twelve two-hour blocks per local day.
   The starting point advances by twelve entries every day. */
function verseIndexAtTime(year, month, day, hour, minute) {
  const dateNumber = Math.floor(
    Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86400000
  );

  const block = Math.floor(
    (Number(hour) * 60 + Number(minute)) / 120
  );

  return ((dateNumber * 12 + block) % dailyContent.length + dailyContent.length) % dailyContent.length;
}

function currentVerse() {
  const p = localParts();

  return dailyContent[
    verseIndexAtTime(p.year, p.month, p.day, p.hour, p.minute)
  ];
}

function paint(v) {
  if (!v) return;

  today = v;
  lastVerseRef = v.ref;

  document.getElementById("verseText").textContent = v.text;
  document.getElementById("verseReference").textContent = v.ref + " · WEB";
  document.getElementById("verseContext").textContent = v.context;
  document.getElementById("reflectionTitle").textContent = v.title;
  document.getElementById("reflectionText").textContent = v.reflection;
  document.getElementById("prayerText").textContent = v.prayer;

  document.getElementById("dayCount").textContent =
    "NEW VERSE EVERY 2 HOURS";
}

function refreshVerse() {
  if (!dailyContent.length) return;

  const v = currentVerse();

  if (v && v.ref !== lastVerseRef) {
    paint(v);
  }
}

const date = new Date();

document.getElementById("todayDate").textContent =
  date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

document.getElementById("year").textContent = date.getFullYear();

const share = () => today
  ? `“${today.text}”\n${today.ref} · World English Bible\n\nDaily Faith`
  : "Daily Faith";

const toast = message => {
  const e = document.getElementById("toast");
  e.textContent = message;
  e.classList.add("show");
  setTimeout(() => e.classList.remove("show"), 2200);
};

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  } catch {
    toast("Copy is unavailable in this browser");
  }
}

document.getElementById("copyVerse").addEventListener("click", () => {
  if (today) copy(share());
});

document.getElementById("copyPrayer").addEventListener("click", () => {
  if (today) copy(today.prayer);
});

document.getElementById("shareVerse").addEventListener("click", async () => {
  if (!today) return;

  const data = {
    title: "Daily Faith — Verse of the Day",
    text: share()
  };

  if (navigator.share) {
    try {
      await navigator.share(data);
    } catch {}
  } else {
    copy(share());
  }
});

/* Full verse library */
function renderLibrary(filter = "All") {
  const items = filter === "All"
    ? dailyContent
    : dailyContent.filter(v => v.tag === filter);

  document.getElementById("libraryGrid").innerHTML =
    items.map(v => `
      <article class="library-item">
        <p>“${v.text}”</p>
        <small>${v.ref.toUpperCase()} · ${(v.tag || "FAITH").toUpperCase()} · WEB</small>
      </article>
    `).join("");
}

document.getElementById("filters").addEventListener("click", e => {
  const button = e.target.closest("button[data-filter]");
  if (!button) return;

  document.querySelectorAll(".filter").forEach(x => {
    x.classList.remove("active");
  });

  button.classList.add("active");
  renderLibrary(button.dataset.filter);
});

document.getElementById("menuToggle").addEventListener("click", () => {
  document.querySelector(".site-header nav").classList.toggle("open");
});

document.querySelectorAll(".site-header nav a").forEach(a => {
  a.addEventListener("click", () => {
    document.querySelector(".site-header nav").classList.remove("open");
  });
});

/* Load the shared content file */
async function initialiseDailyFaith() {
  try {
    const response = await fetch("/daily-content.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Could not load daily-content.json");
    }

    const content = await response.json();

    if (!Array.isArray(content) || content.length < 12) {
      throw new Error("The verse library needs at least 12 entries");
    }

    dailyContent = content;

    renderLibrary();
    paint(currentVerse());

    setInterval(refreshVerse, 15000);

    window.addEventListener("focus", refreshVerse);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshVerse();
    });

    window.addEventListener("dailyfaithschedulechange", refreshVerse);

  } catch (error) {
    console.error("Daily Faith loading error:", error);
    toast("Unable to load today's verse. Please refresh.");
  }
}

initialiseDailyFaith();
