const csvUrl = "./Studierenden_Ausgaben_April_Juni_2026.csv";
const euro = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2
});
const shortEuro = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});
const monthFormatter = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" });
const monthShortFormatter = new Intl.DateTimeFormat("de-DE", { month: "short" });
const dateFormatter = new Intl.DateTimeFormat("de-DE");
let transactions = [];
let months = [];

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
})[character]);

const categoryFor = transaction => {
  const description = `${transaction.recipient} ${transaction.purpose}`.toLocaleLowerCase("de");
  if (description.includes("miete")) return "Wohnen";
  if (description.includes("strom")) return "Energie";
  if (description.includes("internet")) return "Internet";
  if (description.includes("geldautomat") || description.includes("bargeld")) return "Bargeld";
  if (description.includes("h&m") || description.includes("bekleidung")) return "Kleidung";
  if (description.includes("versicherung")) return "Versicherung";
  if (description.includes("fitness")) return "Fitness";
  if (description.includes("lebensmittel")) return "Lebensmittel";
  if (description.includes("övm") || description.includes("monatsticket")) return "Mobilität";
  return "Sonstiges";
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ";") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some(value => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("Die CSV-Datei enthält ein nicht geschlossenes Anführungszeichen.");
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some(value => value.length > 0)) rows.push(row);
  }
  return rows;
}

function parseTransactions(csvText) {
  const rows = parseCsv(csvText);
  const expectedHeaders = ["Date", "Transaction ID", "Amount", "Currency", "Recipient", "Purpose"];
  const headers = rows.shift()?.map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/, "").trim() : header.trim()
  );
  if (!headers || headers.length !== expectedHeaders.length
      || headers.some((header, index) => header !== expectedHeaders[index])) {
    throw new Error(`Die CSV-Kopfzeile muss lauten: ${expectedHeaders.join("; ")}`);
  }
  if (rows.length === 0) throw new Error("Die CSV-Datei enthält keine Transaktionen.");

  return rows.map((row, index) => {
    if (row.length !== expectedHeaders.length) {
      throw new Error(`CSV-Zeile ${index + 2} hat ${row.length} statt ${expectedHeaders.length} Spalten.`);
    }
    const [date, id, amountText, currency, recipient, purpose] = row.map(value => value.trim());
    const dateMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(date);
    const amountMatch = /^(\d+)(?:,(\d{1,2}))?$/.exec(amountText);
    if (!dateMatch) throw new Error(`Ungültiges Datum in CSV-Zeile ${index + 2}: ${date}`);
    if (!amountMatch) throw new Error(`Ungültiger Betrag in CSV-Zeile ${index + 2}: ${amountText}`);
    const [, dayText, monthText, yearText] = dateMatch;
    const dateValue = new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
    if (dateValue.getFullYear() !== Number(yearText)
        || dateValue.getMonth() !== Number(monthText) - 1
        || dateValue.getDate() !== Number(dayText)) {
      throw new Error(`Ungültiges Datum in CSV-Zeile ${index + 2}: ${date}`);
    }
    if (!id || !currency || !recipient || !purpose) {
      throw new Error(`Pflichtfeld fehlt in CSV-Zeile ${index + 2}.`);
    }
    if (currency !== "EUR") {
      throw new Error(`Nicht unterstützte Währung in CSV-Zeile ${index + 2}: ${currency}`);
    }
    const euros = Number(amountMatch[1]);
    const cents = Number((amountMatch[2] ?? "").padEnd(2, "0"));

    return {
      date,
      dateValue,
      monthKey: `${yearText}-${monthText}`,
      id,
      amount: euros * 100 + cents,
      currency,
      recipient,
      purpose
    };
  });
}

function setupFilters() {
  const categories = [...new Set(transactions.map(categoryFor))]
    .sort((a, b) => a.localeCompare(b, "de"));
  const categoryFilter = document.getElementById("category-filter");
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.append(option);
  });

  const monthFilter = document.getElementById("month-filter");
  months.forEach(month => {
    const option = document.createElement("option");
    option.value = month.key;
    option.textContent = month.label;
    monthFilter.append(option);
  });
}

function render() {
  const selectedMonth = document.getElementById("month-filter").value;
  const selectedCategory = document.getElementById("category-filter").value;
  const sortOrder = document.getElementById("sort-filter").value;
  const query = document.getElementById("search").value.trim().toLocaleLowerCase("de");
  const periodTransactions = transactions.filter(transaction =>
    Object.values(transaction).join(" ").toLocaleLowerCase("de").includes(query)
    && (selectedCategory === "all" || categoryFor(transaction) === selectedCategory)
  );
  const filtered = periodTransactions.filter(transaction =>
    selectedMonth === "all" || transaction.monthKey === selectedMonth
  );
  const total = filtered.reduce((sum, transaction) => sum + transaction.amount, 0);
  const average = filtered.length ? total / filtered.length : 0;
  const periodTotal = periodTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  document.getElementById("total-spent").textContent = euro.format(total / 100);
  document.getElementById("transaction-count").textContent = filtered.length;
  document.getElementById("average-spent").textContent = euro.format(average / 100);
  document.getElementById("count-detail").textContent =
    filtered.length === 1 ? "erfasste Zahlung" : "erfasste Zahlungen";
  document.getElementById("total-detail").textContent = selectedMonth === "all"
    ? "im ausgewählten Zeitraum"
    : `im ${months.find(month => month.key === selectedMonth).label}`;
  document.getElementById("chart-total").textContent = `${euro.format(periodTotal / 100)} Periode`;
  document.getElementById("visible-count").textContent = `${filtered.length} Transaktionen`;

  const largest = filtered.reduce((best, item) => !best || item.amount > best.amount ? item : best, null);
  document.getElementById("largest-amount").textContent = largest ? euro.format(largest.amount / 100) : "–";
  document.getElementById("largest-recipient").textContent = largest ? largest.recipient : "Keine Transaktion";
  document.getElementById("largest-date").textContent = largest ? largest.date : "";

  const monthlyTotals = months.map(month => ({
    ...month,
    total: periodTransactions
      .filter(transaction => transaction.monthKey === month.key)
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  }));
  const maxMonthly = Math.max(...monthlyTotals.map(month => month.total), 1);
  document.getElementById("monthly-chart").innerHTML = monthlyTotals.map(month => {
    const height = month.total ? Math.max(8, month.total / maxMonthly * 100) : 0;
    const opacity = selectedMonth === "all" || selectedMonth === month.key ? 1 : .22;
    return `<div class="month-column">
      <span class="month-total">${shortEuro.format(month.total / 100)}</span>
      <div class="bar-wrap"><div class="bar" style="height:${height}%;opacity:${opacity}" aria-hidden="true"></div></div>
      <span class="month-name">${monthShortFormatter.format(month.dateValue)}</span>
    </div>`;
  }).join("");

  const categories = [...new Set(periodTransactions.map(categoryFor))]
    .sort((a, b) => a.localeCompare(b, "de"));
  const categoryTotals = categories
    .map(category => {
      const categoryTransactions = periodTransactions.filter(transaction => categoryFor(transaction) === category);
      const monthly = months.map(month => categoryTransactions
        .filter(transaction => transaction.monthKey === month.key)
        .reduce((sum, transaction) => sum + transaction.amount, 0));
      return { category, monthly, total: monthly.reduce((sum, amount) => sum + amount, 0) };
    })
    .sort((a, b) => sortOrder === "category-asc"
      ? a.category.localeCompare(b.category, "de")
      : b.total - a.total || a.category.localeCompare(b.category, "de"));
  document.getElementById("category-summary-head").innerHTML =
    `<tr><th scope="col">Ausgabenart</th>${months.map(month =>
      `<th scope="col">${escapeHtml(monthShortFormatter.format(month.dateValue))}</th>`
    ).join("")}<th scope="col">Periode</th></tr>`;
  document.getElementById("category-summary-rows").innerHTML = categoryTotals.length
    ? categoryTotals.map(item => `<tr>
        <td><span class="category-tag">${escapeHtml(item.category)}</span></td>
        ${item.monthly.map(amount => `<td>${euro.format(amount / 100)}</td>`).join("")}
        <td><strong>${euro.format(item.total / 100)}</strong></td>
      </tr>`).join("")
    : `<tr><td class="empty-state" colspan="${months.length + 2}">Keine passenden Ausgabenarten gefunden.</td></tr>`;
  const monthlyPeriodTotals = months.map((month, index) =>
    categoryTotals.reduce((sum, category) => sum + category.monthly[index], 0)
  );
  const visiblePeriodTotal = monthlyPeriodTotals.reduce((sum, amount) => sum + amount, 0);
  document.getElementById("category-summary-total").innerHTML = categoryTotals.length
    ? `<tr><td>Gesamt</td>${monthlyPeriodTotals.map(amount => `<td>${euro.format(amount / 100)}</td>`).join("")}<td>${euro.format(visiblePeriodTotal / 100)}</td></tr>`
    : "";

  const rows = document.getElementById("transaction-rows");
  if (!filtered.length) {
    rows.innerHTML = '<tr><td class="empty-state" colspan="5">Keine passenden Transaktionen gefunden.</td></tr>';
    return;
  }
  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === "category-asc") {
      return categoryFor(a).localeCompare(categoryFor(b), "de") || b.dateValue - a.dateValue;
    }
    if (sortOrder === "amount-desc") return b.amount - a.amount || b.dateValue - a.dateValue;
    if (sortOrder === "amount-asc") return a.amount - b.amount || b.dateValue - a.dateValue;
    return b.dateValue - a.dateValue;
  });
  rows.innerHTML = sorted.map(transaction => `<tr>
    <td class="date-cell">${escapeHtml(dateFormatter.format(transaction.dateValue))}</td>
    <td class="category-cell"><span class="category-tag">${escapeHtml(categoryFor(transaction))}</span></td>
    <td class="recipient-cell">${escapeHtml(transaction.recipient)}</td>
    <td class="purpose-cell">${escapeHtml(transaction.purpose)}</td>
    <td class="amount-cell">${euro.format(transaction.amount / 100)}</td>
  </tr>`).join("");
}

function showLoadError(error) {
  console.error("Die Ausgabendaten konnten nicht geladen werden.", error);
  const status = document.getElementById("data-status");
  status.hidden = false;
  status.textContent =
    "Die CSV-Daten konnten nicht geladen werden. Starte die Seite über einen lokalen Webserver und prüfe den CSV-Dateipfad.";
}

async function initialize() {
  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error(`CSV-Anfrage fehlgeschlagen: ${response.status} ${response.statusText}`);
  transactions = parseTransactions(await response.text());
  months = [...new Set(transactions.map(transaction => transaction.monthKey))]
    .sort()
    .map(key => {
      const dateValue = transactions.find(transaction => transaction.monthKey === key).dateValue;
      return { key, dateValue, label: monthFormatter.format(dateValue) };
    });
  if (!months.length) throw new Error("Aus der CSV konnten keine Monate ermittelt werden.");

  const firstMonth = months[0];
  const lastMonth = months[months.length - 1];
  const period = months.length === 1
    ? firstMonth.label
    : `${monthShortFormatter.format(firstMonth.dateValue)} — ${monthShortFormatter.format(lastMonth.dateValue)} ${lastMonth.dateValue.getFullYear()}`;
  document.getElementById("period-label").textContent = period.toLocaleUpperCase("de");
  document.title = `Ausgaben im Überblick · ${firstMonth.label} bis ${lastMonth.label}`;
  document.getElementById("page-subtitle").textContent =
    `Eine Übersicht aller ${transactions.length} erfassten Transaktionen von ${firstMonth.label} bis ${lastMonth.label}.`;
  document.getElementById("category-summary-caption").textContent =
    `Monatssummen und Periodensumme von ${firstMonth.label} bis ${lastMonth.label}. Suche und Ausgabenart filtern diese Übersicht; der Monatsfilter der Transaktionsliste ändert sie nicht.`;
  setupFilters();
  render();
}

for (const id of ["month-filter", "category-filter", "sort-filter"]) {
  document.getElementById(id).addEventListener("change", render);
}
document.getElementById("search").addEventListener("input", render);
initialize().catch(showLoadError);
