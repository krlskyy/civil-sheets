// ============================================================
// Таблицы — основная логика приложения
// ============================================================

const CFG = window.APP_CONFIG;
const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

const ICONS = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  sort: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0 3 3m-3-3-3 3"/></svg>',
  row: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18"/></svg>',
  col: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  type: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',
};

let state = {
  sheets: [],          // [{id, title, updated_at}]
  currentSheet: null,  // {id, title, data:{columns, rows}}
  search: "",
  saveTimer: null,
  dirty: false,
};

// ============================================================
// Утилиты
// ============================================================

function genId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function runTwemoji(root) {
  if (window.twemoji) window.twemoji.parse(root || document.body);
}

function formatRelativeDate(iso) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} дн назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

// ============================================================
// Экран пароля
// ============================================================

const lockScreen = document.getElementById("lock-screen");
const lockForm = document.getElementById("lock-form");
const lockPassword = document.getElementById("lock-password");
const lockError = document.getElementById("lock-error");
const appRoot = document.getElementById("app");

lockForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (lockPassword.value === CFG.PASSWORD) {
    sessionStorage.setItem("tables_unlocked", "1");
    unlockApp();
  } else {
    lockError.textContent = "Неверный пароль";
    lockPassword.value = "";
    lockPassword.focus();
  }
});

function unlockApp() {
  lockScreen.style.display = "none";
  appRoot.classList.add("visible");
  initApp();
}

if (sessionStorage.getItem("tables_unlocked") === "1") {
  unlockApp();
}

// ============================================================
// Инициализация приложения
// ============================================================

async function initApp() {
  wireGlobalUI();
  await loadSheets();
  renderEmptyMain();
}

function wireGlobalUI() {
  document.getElementById("new-sheet-btn").addEventListener("click", () => promptCreateSheet());
  document.getElementById("search-input").addEventListener("input", (e) => {
    state.search = e.target.value.trim().toLowerCase();
    renderSidebar();
  });

  const tabSheets = document.getElementById("tab-sheets");
  const tabNew = document.getElementById("tab-new");
  const sidebar = document.getElementById("sidebar");

  tabSheets.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
  tabNew.addEventListener("click", () => promptCreateSheet());

  document.addEventListener("click", (e) => {
    // закрытие сайдбара на мобиле при выборе таблицы
    if (window.innerWidth <= 860 && sidebar.classList.contains("open")) {
      if (!sidebar.contains(e.target) && e.target !== tabSheets && !tabSheets.contains(e.target)) {
        sidebar.classList.remove("open");
      }
    }
    closeAnyDropdown(e);
  });
}

// ============================================================
// Загрузка / список таблиц
// ============================================================

async function loadSheets() {
  const { data, error } = await sb
    .from("sheets")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    renderSidebarError();
    return;
  }
  state.sheets = data || [];
  renderSidebar();
}

function renderSidebarError() {
  const list = document.getElementById("sidebar-list");
  list.innerHTML = `<div style="padding:14px;font-size:12.5px;color:var(--text-muted)">
    Не удалось загрузить таблицы. Проверь конфигурацию Supabase в config.js.
  </div>`;
}

function renderSidebar() {
  const list = document.getElementById("sidebar-list");
  const filtered = state.search
    ? state.sheets.filter(s => s.title.toLowerCase().includes(state.search))
    : state.sheets;

  if (filtered.length === 0) {
    list.innerHTML = `<div style="padding:14px;font-size:12.5px;color:var(--text-muted);text-align:center;">
      ${state.search ? "Ничего не найдено" : "Пока нет таблиц"}
    </div>`;
    return;
  }

  list.innerHTML = filtered.map(s => `
    <div class="sheet-item ${state.currentSheet && state.currentSheet.id === s.id ? "active" : ""}" data-id="${s.id}">
      <button class="sheet-item-title" data-action="open" data-id="${s.id}" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</button>
      <button class="sheet-item-menu-btn" data-action="menu" data-id="${s.id}">${ICONS.dots}</button>
    </div>
  `).join("");

  list.querySelectorAll('[data-action="open"]').forEach(btn => {
    btn.addEventListener("click", () => openSheet(btn.dataset.id));
  });
  list.querySelectorAll('[data-action="menu"]').forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openSheetItemMenu(btn, btn.dataset.id);
    });
  });

  runTwemoji(list);
}

function openSheetItemMenu(anchor, sheetId) {
  const sheet = state.sheets.find(s => s.id === sheetId);
  openDropdown(anchor, [
    { label: "Переименовать", icon: ICONS.edit, onClick: () => promptRenameSheet(sheet) },
    { label: "Дублировать", icon: ICONS.copy, onClick: () => duplicateSheet(sheetId) },
    { label: "Удалить", icon: ICONS.trash, danger: true, onClick: () => confirmDeleteSheet(sheet) },
  ]);
}

// ============================================================
// Пустое состояние / каркас редактора
// ============================================================

function renderEmptyMain() {
  const main = document.getElementById("main-area");
  main.innerHTML = `
    <div class="empty-state">
      <svg class="empty-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
        <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
      </svg>
      <h3>Пока нет открытой таблицы</h3>
      <p>Создай новую таблицу или выбери одну из существующих в списке слева, чтобы начать работу.</p>
      <button class="btn-gold" id="empty-create-btn">${ICONS.plus} Создать таблицу</button>
    </div>
  `;
  document.getElementById("empty-create-btn").addEventListener("click", () => promptCreateSheet());
  runTwemoji(main);
}

// ============================================================
// Создание / переименование / дублирование / удаление таблиц
// ============================================================

function defaultSheetData() {
  const cols = [genId("c"), genId("c"), genId("c")];
  const colNames = ["Столбец A", "Столбец B", "Столбец C"];
  const columns = cols.map((id, i) => ({ id, name: colNames[i], width: 140 }));
  const rows = Array.from({ length: 6 }, () => {
    const cells = {};
    cols.forEach(c => { cells[c] = { value: "", type: "text" }; });
    return { id: genId("r"), cells };
  });
  return { columns, rows };
}

function promptCreateSheet() {
  showPromptModal({
    title: "Новая таблица",
    subtitle: "Дай таблице название",
    defaultValue: "Новая таблица",
    confirmLabel: "Создать",
    onConfirm: async (title) => {
      const { data, error } = await sb
        .from("sheets")
        .insert({ title: title || "Без названия", data: defaultSheetData() })
        .select()
        .single();
      if (error) { console.error(error); alert("Не удалось создать таблицу"); return; }
      await loadSheets();
      state.currentSheet = data;
      renderEditor();
      renderSidebar();
    },
  });
}

function promptRenameSheet(sheet) {
  showPromptModal({
    title: "Переименовать таблицу",
    subtitle: "Новое название таблицы",
    defaultValue: sheet.title,
    confirmLabel: "Сохранить",
    onConfirm: async (title) => {
      if (!title) return;
      const { error } = await sb.from("sheets").update({ title }).eq("id", sheet.id);
      if (error) { console.error(error); return; }
      if (state.currentSheet && state.currentSheet.id === sheet.id) {
        state.currentSheet.title = title;
        renderEditor();
      }
      await loadSheets();
    },
  });
}

async function duplicateSheet(sheetId) {
  const { data: original, error } = await sb.from("sheets").select("*").eq("id", sheetId).single();
  if (error) { console.error(error); return; }
  const { error: insertError } = await sb.from("sheets").insert({
    title: original.title + " (копия)",
    data: original.data,
  });
  if (insertError) { console.error(insertError); return; }
  await loadSheets();
}

function confirmDeleteSheet(sheet) {
  showConfirmModal({
    title: "Удалить таблицу?",
    subtitle: `«${sheet.title}» будет удалена без возможности восстановления.`,
    confirmLabel: "Удалить",
    onConfirm: async () => {
      const { error } = await sb.from("sheets").delete().eq("id", sheet.id);
      if (error) { console.error(error); return; }
      if (state.currentSheet && state.currentSheet.id === sheet.id) {
        state.currentSheet = null;
        renderEmptyMain();
      }
      await loadSheets();
    },
  });
}

// ============================================================
// Открытие таблицы и редактор
// ============================================================

async function openSheet(id) {
  const { data, error } = await sb.from("sheets").select("*").eq("id", id).single();
  if (error) { console.error(error); return; }
  state.currentSheet = data;
  renderEditor();
  renderSidebar();
  if (window.innerWidth <= 860) document.getElementById("sidebar").classList.remove("open");
}

function renderEditor() {
  const main = document.getElementById("main-area");
  const sheet = state.currentSheet;
  const { columns, rows } = sheet.data;

  main.innerHTML = `
    <div class="topbar">
      <h2 id="sheet-title-display">${escapeHtml(sheet.title)}</h2>
      <button class="icon-btn" id="rename-btn" title="Переименовать">${ICONS.edit}</button>
      <button class="icon-btn" id="duplicate-btn" title="Дублировать">${ICONS.copy}</button>
      <button class="icon-btn danger" id="delete-btn" title="Удалить">${ICONS.trash}</button>
    </div>
    <div class="toolbar">
      <button class="toolbar-btn" id="add-row-btn">${ICONS.plus} Строка</button>
      <button class="toolbar-btn" id="add-col-btn">${ICONS.plus} Столбец</button>
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn" id="export-csv-btn">${ICONS.download} Экспорт CSV</button>
      <div class="save-indicator" id="save-indicator"><span class="dot"></span><span id="save-indicator-text">Сохранено</span></div>
    </div>
    <div class="table-scroll" id="table-scroll"></div>
  `;

  document.getElementById("rename-btn").addEventListener("click", () => promptRenameSheet(sheet));
  document.getElementById("duplicate-btn").addEventListener("click", () => duplicateSheet(sheet.id));
  document.getElementById("delete-btn").addEventListener("click", () => confirmDeleteSheet(sheet));
  document.getElementById("add-row-btn").addEventListener("click", () => addRow());
  document.getElementById("add-col-btn").addEventListener("click", () => addColumn());
  document.getElementById("export-csv-btn").addEventListener("click", () => exportCSV());

  renderTable();
  runTwemoji(main);
}

function renderTable() {
  const wrap = document.getElementById("table-scroll");
  const { columns, rows } = state.currentSheet.data;

  const headHtml = columns.map(col => `
    <th class="col-header" data-col-id="${col.id}">
      <span class="col-name">${escapeHtml(col.name)}</span>
      <button class="icon-btn col-header-menu" data-action="col-menu" data-col-id="${col.id}">${ICONS.dots}</button>
    </th>
  `).join("");

  const bodyHtml = rows.map((row, ri) => `
    <tr data-row-id="${row.id}">
      <td class="row-handle" data-action="row-menu" data-row-id="${row.id}">${ri + 1}</td>
      ${columns.map(col => {
        const cell = row.cells[col.id] || { value: "", type: "text" };
        const inputType = cell.type === "number" ? "number" : (cell.type === "date" ? "date" : "text");
        return `<td>
          <input
            class="cell-input ${cell.type === "number" ? "type-number" : ""}"
            type="${inputType}"
            value="${escapeHtml(cell.value ?? "")}"
            data-row-id="${row.id}"
            data-col-id="${col.id}"
          >
        </td>`;
      }).join("")}
    </tr>
  `).join("");

  wrap.innerHTML = `
    <table class="sheet-table">
      <thead>
        <tr>
          <th class="col-corner"></th>
          ${headHtml}
          <th class="add-col-th"><button id="add-col-inline-btn" title="Добавить столбец">${ICONS.plus}</button></th>
        </tr>
      </thead>
      <tbody>
        ${bodyHtml}
        <tr class="add-row-row">
          <td class="add-row-cell" colspan="${columns.length + 1}">
            <button id="add-row-inline-btn">${ICONS.plus} Добавить строку</button>
          </td>
        </tr>
      </tbody>
    </table>
  `;

  wrap.querySelectorAll(".cell-input").forEach(input => {
    input.addEventListener("input", (e) => {
      updateCellValue(e.target.dataset.rowId, e.target.dataset.colId, e.target.value);
    });
  });

  wrap.querySelectorAll('[data-action="col-menu"]').forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openColumnMenu(btn, btn.dataset.colId);
    });
  });

  wrap.querySelectorAll(".row-handle").forEach(td => {
    td.addEventListener("click", (e) => openRowMenu(td, td.dataset.rowId));
  });

  const addColBtn = document.getElementById("add-col-inline-btn");
  if (addColBtn) addColBtn.addEventListener("click", () => addColumn());
  const addRowBtn = document.getElementById("add-row-inline-btn");
  if (addRowBtn) addRowBtn.addEventListener("click", () => addRow());
}

// ============================================================
// Редактирование данных таблицы
// ============================================================

function updateCellValue(rowId, colId, value) {
  const row = state.currentSheet.data.rows.find(r => r.id === rowId);
  if (!row) return;
  const existing = row.cells[colId] || { type: "text" };
  row.cells[colId] = { value, type: existing.type || "text" };
  scheduleSave();
}

function addRow() {
  const { columns, rows } = state.currentSheet.data;
  const cells = {};
  columns.forEach(c => { cells[c.id] = { value: "", type: "text" }; });
  rows.push({ id: genId("r"), cells });
  renderTable();
  scheduleSave();
}

function addColumn() {
  const { columns, rows } = state.currentSheet.data;
  const newCol = { id: genId("c"), name: `Столбец ${columns.length + 1}`, width: 140 };
  columns.push(newCol);
  rows.forEach(r => { r.cells[newCol.id] = { value: "", type: "text" }; });
  renderTable();
  scheduleSave();
}

function removeColumn(colId) {
  const data = state.currentSheet.data;
  if (data.columns.length <= 1) { alert("Должен остаться хотя бы один столбец"); return; }
  data.columns = data.columns.filter(c => c.id !== colId);
  data.rows.forEach(r => { delete r.cells[colId]; });
  renderTable();
  scheduleSave();
}

function removeRow(rowId) {
  const data = state.currentSheet.data;
  if (data.rows.length <= 1) { alert("Должна остаться хотя бы одна строка"); return; }
  data.rows = data.rows.filter(r => r.id !== rowId);
  renderTable();
  scheduleSave();
}

function renameColumn(colId) {
  const col = state.currentSheet.data.columns.find(c => c.id === colId);
  showPromptModal({
    title: "Переименовать столбец",
    subtitle: "Новое название столбца",
    defaultValue: col.name,
    confirmLabel: "Сохранить",
    onConfirm: (name) => {
      col.name = name || col.name;
      renderTable();
      scheduleSave();
    },
  });
}

function setColumnType(colId, type) {
  const data = state.currentSheet.data;
  data.rows.forEach(r => {
    const cell = r.cells[colId];
    if (cell) cell.type = type;
  });
  renderTable();
  scheduleSave();
}

function sortByColumn(colId) {
  const data = state.currentSheet.data;
  const col = data.columns.find(c => c.id === colId);
  const isNumber = col && data.rows.some(r => r.cells[colId]?.type === "number");
  data.rows.sort((a, b) => {
    const va = a.cells[colId]?.value ?? "";
    const vb = b.cells[colId]?.value ?? "";
    if (isNumber) return (parseFloat(va) || 0) - (parseFloat(vb) || 0);
    return String(va).localeCompare(String(vb), "ru");
  });
  renderTable();
  scheduleSave();
}

function openColumnMenu(anchor, colId) {
  openDropdown(anchor, [
    { label: "Переименовать", icon: ICONS.edit, onClick: () => renameColumn(colId) },
    { label: "Сортировать по столбцу", icon: ICONS.sort, onClick: () => sortByColumn(colId) },
    { label: "Тип: текст", icon: ICONS.type, onClick: () => setColumnType(colId, "text") },
    { label: "Тип: число", icon: ICONS.type, onClick: () => setColumnType(colId, "number") },
    { label: "Тип: дата", icon: ICONS.type, onClick: () => setColumnType(colId, "date") },
    { label: "Удалить столбец", icon: ICONS.trash, danger: true, onClick: () => removeColumn(colId) },
  ]);
}

function openRowMenu(anchor, rowId) {
  openDropdown(anchor, [
    { label: "Удалить строку", icon: ICONS.trash, danger: true, onClick: () => removeRow(rowId) },
  ]);
}

// ============================================================
// Автосохранение
// ============================================================

function scheduleSave() {
  state.dirty = true;
  setSaveIndicator("saving");
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(saveCurrentSheet, 700);
}

async function saveCurrentSheet() {
  if (!state.currentSheet) return;
  const sheet = state.currentSheet;
  const { error } = await sb.from("sheets").update({ data: sheet.data }).eq("id", sheet.id);
  if (error) {
    console.error(error);
    setSaveIndicator("error");
    return;
  }
  state.dirty = false;
  setSaveIndicator("saved");
}

function setSaveIndicator(status) {
  const el = document.getElementById("save-indicator");
  const text = document.getElementById("save-indicator-text");
  if (!el || !text) return;
  el.classList.toggle("saving", status === "saving");
  text.textContent = status === "saving" ? "Сохранение…" : status === "error" ? "Ошибка сохранения" : "Сохранено";
}

// ============================================================
// Экспорт CSV
// ============================================================

function exportCSV() {
  const { columns, rows } = state.currentSheet.data;
  const escapeCsv = (v) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    columns.map(c => escapeCsv(c.name)).join(","),
    ...rows.map(r => columns.map(c => escapeCsv(r.cells[c.id]?.value ?? "")).join(",")),
  ];
  const csv = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${state.currentSheet.title || "таблица"}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ============================================================
// Модалки (prompt / confirm)
// ============================================================

function showPromptModal({ title, subtitle, defaultValue = "", confirmLabel = "Сохранить", onConfirm }) {
  const tpl = document.getElementById("tpl-modal-prompt").content.cloneNode(true);
  const overlay = tpl.querySelector(".modal-overlay");
  tpl.querySelector(".modal-title").textContent = title;
  tpl.querySelector(".modal-subtitle").textContent = subtitle;
  const input = tpl.querySelector(".modal-input");
  input.value = defaultValue;
  tpl.querySelector(".modal-confirm").textContent = confirmLabel;

  document.body.appendChild(tpl);
  const realOverlay = document.body.querySelector(".modal-overlay:last-child");
  const realInput = realOverlay.querySelector(".modal-input");
  realInput.focus();
  realInput.select();

  function close() { realOverlay.remove(); }

  realOverlay.querySelector(".modal-cancel").addEventListener("click", close);
  realOverlay.addEventListener("click", (e) => { if (e.target === realOverlay) close(); });
  realOverlay.querySelector(".modal-confirm").addEventListener("click", () => {
    onConfirm(realInput.value.trim());
    close();
  });
  realInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { onConfirm(realInput.value.trim()); close(); }
    if (e.key === "Escape") close();
  });

  runTwemoji(realOverlay);
}

function showConfirmModal({ title, subtitle, confirmLabel = "Удалить", onConfirm }) {
  const tpl = document.getElementById("tpl-modal-confirm").content.cloneNode(true);
  document.body.appendChild(tpl);
  const overlay = document.body.querySelector(".modal-overlay:last-child");
  overlay.querySelector(".modal-title").textContent = title;
  overlay.querySelector(".modal-subtitle").textContent = subtitle;
  overlay.querySelector(".modal-confirm").textContent = confirmLabel;

  function close() { overlay.remove(); }

  overlay.querySelector(".modal-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector(".modal-confirm").addEventListener("click", () => { onConfirm(); close(); });

  runTwemoji(overlay);
}

// ============================================================
// Выпадающее меню (для строк/столбцов/элементов списка)
// ============================================================

let activeDropdown = null;

function openDropdown(anchor, items) {
  closeAnyDropdown();
  const tpl = document.getElementById("tpl-dropdown").content.cloneNode(true);
  document.body.appendChild(tpl);
  const menu = document.body.querySelector(".dropdown-menu:last-child");

  menu.innerHTML = items.map((item, i) => `
    <button data-i="${i}" class="${item.danger ? "danger" : ""}">${item.icon || ""}<span>${escapeHtml(item.label)}</span></button>
  `).join("");

  items.forEach((item, i) => {
    menu.querySelector(`[data-i="${i}"]`).addEventListener("click", (e) => {
      e.stopPropagation();
      item.onClick();
      closeAnyDropdown();
    });
  });

  const rect = anchor.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 6 + window.scrollY}px`;
  let left = rect.right - menu.offsetWidth;
  if (left < 8) left = rect.left;
  menu.style.left = `${Math.max(8, left)}px`;

  activeDropdown = menu;
}

function closeAnyDropdown(e) {
  if (activeDropdown) {
    if (e && activeDropdown.contains(e.target)) return;
    activeDropdown.remove();
    activeDropdown = null;
  }
}