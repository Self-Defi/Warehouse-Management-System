const STATUS_OPTIONS = ["received", "hold", "delivered", "inspection"];

let inventory = [];
let racks = [];
let searchType = "rack_code";
let searchValue = "";
let currentItemId = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDisplayDate(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getStatusLabel(status) {
  const map = {
    received: "Received",
    hold: "Hold",
    delivered: "Delivered",
    inspection: "Inspection"
  };
  return map[status] || status || "";
}

function getStatusBadge(status) {
  return `<span class="badge ${escapeHtml(status || "received")}">${escapeHtml(getStatusLabel(status || "received"))}</span>`;
}

function setConnectionState(state, text) {
  const badge = document.getElementById("connectionBadge");
  if (!badge) return;

  badge.className = "pill";
  if (state === "success") badge.classList.add("success");
  else if (state === "error") badge.classList.add("error");
  else badge.classList.add("neutral");

  badge.textContent = text;
}

function showMessage(text, type = "success") {
  const bar = document.getElementById("messageBar");
  if (!bar) return;

  if (!text) {
    bar.className = "message hidden";
    bar.textContent = "";
    return;
  }

  bar.className = `message ${type}`;
  bar.textContent = text;
}

function updateCounts() {
  const recordCount = document.getElementById("recordCount");
  const rackCount = document.getElementById("rackCount");

  if (recordCount) recordCount.textContent = String(inventory.length);
  if (rackCount) rackCount.textContent = String(racks.length);
}

function updateSearchPlaceholder() {
  const input = document.getElementById("searchValue");
  if (!input) return;

  if (searchType === "item_code") {
    input.placeholder = "Search item code (ex: WH-000000001)";
    return;
  }

  if (searchType === "project_name") {
    input.placeholder = "Search project name";
    return;
  }

  if (searchType === "rack_code") {
    input.placeholder = "Search rack code (ex: 302-02B)";
    return;
  }

  input.placeholder = "Search any visible field";
}

async function fetchRacks() {
  const { data, error } = await db
    .from("racks")
    .select("rack_code, series, level_code, side_code")
    .order("rack_code", { ascending: true });

  if (error) throw error;
  racks = data || [];
}

async function fetchItems() {
  const { data, error } = await db
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  inventory = data || [];
}

function getFilteredInventory() {
  if (!searchValue.trim()) return inventory;

  const value = searchValue.trim().toLowerCase();

  return inventory.filter((row) => {
    if (searchType === "all") {
      return [
        row.project_name,
        row.item_code,
        row.item_name,
        row.status,
        row.rack_code,
        row.notes
      ].some((field) => String(field || "").toLowerCase().includes(value));
    }

    return String(row[searchType] || "").toLowerCase().includes(value);
  });
}

function findItemById(id) {
  return inventory.find((row) => row.id === id) || null;
}

function showItemCard(row) {
  const section = document.getElementById("itemCardSection");
  if (!section || !row) return;

  currentItemId = row.id;

  document.getElementById("detailItemName").textContent = row.item_name || "Unnamed Item";
  document.getElementById("detailItemCode").textContent = row.item_code || "";
  document.getElementById("detailProject").textContent = row.project_name || "";
  document.getElementById("detailRackCode").textContent = row.rack_code || "";
  document.getElementById("detailStatus").textContent = getStatusLabel(row.status || "received");
  document.getElementById("detailNotes").textContent = row.notes || "";
  document.getElementById("detailCreatedAt").textContent = formatDisplayDate(row.created_at);

  const badge = document.getElementById("detailStatusBadge");
  badge.className = `badge ${row.status || "received"}`;
  badge.textContent = getStatusLabel(row.status || "received");

  section.classList.remove("hidden");
}

function hideItemCard() {
  const section = document.getElementById("itemCardSection");
  if (section) section.classList.add("hidden");
  currentItemId = null;
}

function openItemCardById(id) {
  const row = findItemById(id);
  if (!row) return;
  showItemCard(row);
  closeRackModal();
}

function buildRackItems(rackCode) {
  return inventory
    .filter((row) => String(row.rack_code || "").toUpperCase() === String(rackCode || "").toUpperCase())
    .sort((a, b) => String(a.item_code || "").localeCompare(String(b.item_code || "")));
}

function openRackModal(rackCode) {
  const modal = document.getElementById("rackModal");
  const title = document.getElementById("rackModalTitle");
  const subtitle = document.getElementById("rackModalSubtitle");
  const summary = document.getElementById("rackSummary");
  const body = document.getElementById("rackItemsBody");

  if (!modal || !title || !subtitle || !summary || !body) return;

  const rackItems = buildRackItems(rackCode);

  title.textContent = `Rack ${rackCode}`;
  subtitle.textContent = "Live items currently assigned to this rack";
  summary.innerHTML = "";
  body.innerHTML = "";

  const receivedCount = rackItems.filter((item) => item.status === "received").length;
  const deliveredCount = rackItems.filter((item) => item.status === "delivered").length;

  [
    `Rack: ${rackCode}`,
    `Records: ${rackItems.length}`,
    `Received: ${receivedCount}`,
    `Delivered: ${deliveredCount}`
  ].forEach((text) => {
    const chip = document.createElement("div");
    chip.className = "summary-chip";
    chip.textContent = text;
    summary.appendChild(chip);
  });

  if (!rackItems.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5">No items currently assigned to this rack.</td>`;
    body.appendChild(tr);
  } else {
    rackItems.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <button type="button" class="rack-item-button" onclick="openItemCardById(${row.id})">
            ${escapeHtml(row.item_code)}
          </button>
        </td>
        <td>${escapeHtml(row.item_name || "")}</td>
        <td>${escapeHtml(row.project_name || "")}</td>
        <td>${getStatusBadge(row.status || "received")}</td>
        <td>${escapeHtml(row.rack_code || "")}</td>
      `;
      body.appendChild(tr);
    });
  }

  modal.classList.remove("hidden");
}

function closeRackModal() {
  const modal = document.getElementById("rackModal");
  if (modal) modal.classList.add("hidden");
}

function createRackSelect(currentValue, itemId) {
  const options = ['<option value="">Unassigned</option>']
    .concat(
      racks.map(
        (rack) =>
          `<option value="${escapeHtml(rack.rack_code)}" ${
            rack.rack_code === (currentValue || "") ? "selected" : ""
          }>${escapeHtml(rack.rack_code)}</option>`
      )
    )
    .join("");

  return `<select onchange="updateField(${itemId}, 'rack_code', this.value)">${options}</select>`;
}

function createStatusSelect(currentValue, itemId) {
  const options = STATUS_OPTIONS.map(
    (status) =>
      `<option value="${status}" ${status === currentValue ? "selected" : ""}>${getStatusLabel(status)}</option>`
  ).join("");

  return `<select onchange="updateField(${itemId}, 'status', this.value)">${options}</select>`;
}

function updateUiForSearch(filteredInventory) {
  if (searchType === "item_code" && searchValue.trim()) {
    if (filteredInventory.length > 0) {
      showItemCard(filteredInventory[0]);
    } else if (currentItemId && !filteredInventory.find((row) => row.id === currentItemId)) {
      hideItemCard();
    }
    return;
  }

  if (searchType === "rack_code" && searchValue.trim()) {
    hideItemCard();
    const exactRack = racks.find(
      (rack) => String(rack.rack_code).toLowerCase() === searchValue.trim().toLowerCase()
    );
    if (exactRack) openRackModal(exactRack.rack_code);
    else closeRackModal();
    return;
  }

  if (!searchValue.trim()) {
    closeRackModal();
  }
}

function renderInventory() {
  const table = document.getElementById("inventoryTable");
  if (!table) return;

  const filteredInventory = getFilteredInventory();
  updateUiForSearch(filteredInventory);
  updateCounts();

  table.innerHTML = "";

  if (!filteredInventory.length) {
    const emptyRow = document.createElement("tr");
    emptyRow.className = "empty-message";
    emptyRow.innerHTML = `<td colspan="9">No items match that search.</td>`;
    table.appendChild(emptyRow);
    return;
  }

  filteredInventory.forEach((row) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        <div class="project-cell">
          <input
            type="text"
            value="${escapeHtml(row.project_name || "")}"
            onchange="updateField(${row.id}, 'project_name', this.value)"
            placeholder="Project Name"
          />
          <button
            type="button"
            class="view-button"
            onclick="openItemCardById(${row.id})"
            title="Open item card"
          >
            View Item Card
          </button>
        </div>
      </td>

      <td>
        <button type="button" class="link-button" onclick="openItemCardById(${row.id})">
          ${escapeHtml(row.item_code || "")}
        </button>
      </td>

      <td>
        <input
          type="text"
          value="${escapeHtml(row.item_name || "")}"
          onchange="updateField(${row.id}, 'item_name', this.value)"
        />
      </td>

      <td>
        ${createStatusSelect(row.status || "received", row.id)}
        ${getStatusBadge(row.status || "received")}
      </td>

      <td>
        ${createRackSelect(row.rack_code || "", row.id)}
      </td>

      <td>
        <textarea onchange="updateField(${row.id}, 'notes', this.value)">${escapeHtml(row.notes || "")}</textarea>
      </td>

      <td>${escapeHtml(formatDisplayDate(row.created_at))}</td>
      <td>${escapeHtml(formatDisplayDate(row.updated_at))}</td>

      <td>
        <button class="delete-btn" type="button" onclick="deleteRow(${row.id})">Delete</button>
      </td>
    `;

    table.appendChild(tr);
  });
}

async function refreshData(showToast = false) {
  try {
    setConnectionState("neutral", "Loading…");
    await Promise.all([fetchRacks(), fetchItems()]);
    setConnectionState("success", "Connected");
    renderInventory();
    if (showToast) showMessage("Inventory refreshed from backend.", "success");
  } catch (error) {
    console.error(error);
    setConnectionState("error", "Error");
    showMessage(`Backend error: ${error.message}`, "error");
  }
}

async function addRow() {
  const payload = {
    item_name: "New Item",
    project_name: "",
    status: "received",
    rack_code: null,
    notes: ""
  };

  try {
    const { error } = await db.from("items").insert(payload);
    if (error) throw error;

    showMessage("New warehouse item created.", "success");
    await refreshData();
  } catch (error) {
    console.error(error);
    showMessage(`Could not create item: ${error.message}`, "error");
  }
}

async function updateField(itemId, field, value) {
  try {
    const payload = { [field]: value === "" ? null : value };

    if (field === "status" && value === "delivered") {
      payload.rack_code = null;
    }

    const { error } = await db.from("items").update(payload).eq("id", itemId);
    if (error) throw error;

    await refreshData();

    if (currentItemId === itemId) {
      const latest = findItemById(itemId);
      if (latest) showItemCard(latest);
    }
  } catch (error) {
    console.error(error);
    showMessage(`Update failed: ${error.message}`, "error");
  }
}

async function deleteRow(itemId) {
  const item = findItemById(itemId);
  const label = item?.item_code || `ID ${itemId}`;
  const approved = window.confirm(`Delete ${label}?`);
  if (!approved) return;

  try {
    const { error } = await db.from("items").delete().eq("id", itemId);
    if (error) throw error;

    hideItemCard();
    showMessage(`${label} deleted.`, "success");
    await refreshData();
  } catch (error) {
    console.error(error);
    showMessage(`Delete failed: ${error.message}`, "error");
  }
}

function applyLookupFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const itemCode = params.get("itemCode");
  const rackCode = params.get("rack");

  const searchTypeEl = document.getElementById("searchType");
  const searchValueEl = document.getElementById("searchValue");

  if (itemCode) {
    searchType = "item_code";
    searchValue = itemCode;
  } else if (rackCode) {
    searchType = "rack_code";
    searchValue = rackCode;
  }

  if (searchTypeEl) searchTypeEl.value = searchType;
  updateSearchPlaceholder();
  if (searchValueEl) searchValueEl.value = searchValue;
}

document.addEventListener("DOMContentLoaded", async () => {
  const addRowBtn = document.getElementById("addRowBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const closeItemCardBtn = document.getElementById("closeItemCardBtn");
  const searchTypeEl = document.getElementById("searchType");
  const searchValueEl = document.getElementById("searchValue");
  const closeRackModalBtn = document.getElementById("closeRackModalBtn");
  const rackModalBackdrop = document.getElementById("rackModalBackdrop");

  applyLookupFromUrl();
  updateSearchPlaceholder();

  if (addRowBtn) addRowBtn.addEventListener("click", addRow);
  if (refreshBtn) refreshBtn.addEventListener("click", () => refreshData(true));
  if (closeItemCardBtn) closeItemCardBtn.addEventListener("click", hideItemCard);

  if (searchTypeEl) {
    searchTypeEl.addEventListener("change", (event) => {
      searchType = event.target.value || "rack_code";
      updateSearchPlaceholder();
      renderInventory();
    });
  }

  if (searchValueEl) {
    searchValueEl.addEventListener("input", (event) => {
      searchValue = event.target.value || "";
      renderInventory();
    });
  }

  if (closeRackModalBtn) closeRackModalBtn.addEventListener("click", closeRackModal);
  if (rackModalBackdrop) rackModalBackdrop.addEventListener("click", closeRackModal);

  await refreshData();
});

window.openItemCardById = openItemCardById;
window.closeRackModal = closeRackModal;
window.updateField = updateField;
window.deleteRow = deleteRow;
