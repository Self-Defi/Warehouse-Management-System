(function () {
  const STORAGE_KEY = "kw_install_day_pull_list_v4";

  const inventoryTabBtn = document.getElementById("inventoryTabBtn");
  const installDayTabBtn = document.getElementById("installDayTabBtn");
  const inventoryTab = document.getElementById("inventoryTab");
  const installDayTab = document.getElementById("installDayTab");

  const installDayAddBtn = document.getElementById("installDayAddBtn");
  const installDaySaveBtn = document.getElementById("installDaySaveBtn");
  const installDayPrintBtn = document.getElementById("installDayPrintBtn");
  const installDayClearBtn = document.getElementById("installDayClearBtn");

  const installProjectFilter = document.getElementById("installProjectFilter");
  const installProjectSearch = document.getElementById("installProjectSearch");
  const installStatusFilter = document.getElementById("installStatusFilter");
  const installDayTable = document.getElementById("installDayTable");
  const installDayMessage = document.getElementById("installDayMessage");

  let installRows = loadRows();

  function showMessage(text, tone = "success") {
    if (!installDayMessage) return;

    installDayMessage.textContent = text;
    installDayMessage.classList.remove("hidden", "error", "success", "neutral");
    installDayMessage.classList.add(tone);

    clearTimeout(showMessage._timer);
    showMessage._timer = setTimeout(() => {
      installDayMessage.classList.add("hidden");
    }, 2500);
  }

  function activateTab(target) {
    const isInventory = target === "inventory";

    inventoryTabBtn?.classList.toggle("active", isInventory);
    installDayTabBtn?.classList.toggle("active", !isInventory);

    inventoryTab?.classList.toggle("hidden", !isInventory);
    installDayTab?.classList.toggle("hidden", isInventory);

    inventoryTab?.classList.toggle("active", isInventory);
    installDayTab?.classList.toggle("active", !isInventory);
  }

  inventoryTabBtn?.addEventListener("click", () => activateTab("inventory"));
  installDayTabBtn?.addEventListener("click", () => activateTab("install"));

  function uid() {
    return `pull_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getLiveInventory() {
    try {
      if (typeof window.getInventoryItems === "function") {
        return window.getInventoryItems() || [];
      }
      return [];
    } catch (err) {
      return [];
    }
  }

  function blankRow() {
    return {
      id: uid(),
      project: "",
      sourceItemId: "",
      sourceItemCode: "",
      area: "",
      category: "",
      type: "",
      name: "",
      quantity: 1,
      imageData: "",
      pullStatus: "Not Pulled",
      staging: "",
      loaded: false,
      issue: false,
      notes: ""
    };
  }

  function loadRows() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function saveRows() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(installRows));
  }

  function getInventoryProjects() {
    const values = new Set();

    getLiveInventory().forEach((item) => {
      const value = String(item.project_name || "").trim();
      if (value) values.add(value);
    });

    installRows.forEach((row) => {
      const value = String(row.project || "").trim();
      if (value) values.add(value);
    });

    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }

  function populateProjectDropdowns() {
    const projects = getInventoryProjects();

    const currentFilter = installProjectFilter?.value || "";
    const currentSearch = installProjectSearch?.value || "";

    if (installProjectFilter) {
      installProjectFilter.innerHTML = `<option value="">All Projects</option>`;
      projects.forEach((project) => {
        const option = document.createElement("option");
        option.value = project;
        option.textContent = project;
        installProjectFilter.appendChild(option);
      });
      installProjectFilter.value = projects.includes(currentFilter) ? currentFilter : "";
    }

    if (installProjectSearch) {
      installProjectSearch.innerHTML = `<option value="">Select project</option>`;
      projects.forEach((project) => {
        const option = document.createElement("option");
        option.value = project;
        option.textContent = project;
        installProjectSearch.appendChild(option);
      });
      installProjectSearch.value = projects.includes(currentSearch) ? currentSearch : "";
    }
  }

  function getEffectiveProjectForRow(row) {
    return (
      row.project ||
      installProjectFilter?.value ||
      installProjectSearch?.value ||
      ""
    );
  }

  function getInventoryOptionsForProject(projectName) {
    const target = String(projectName || "").trim().toLowerCase();
    const items = getLiveInventory();

    const filtered = target
      ? items.filter((item) => String(item.project_name || "").trim().toLowerCase() === target)
      : items;

    return filtered
      .slice()
      .sort((a, b) => {
        const aCode = String(a.item_code || "");
        const bCode = String(b.item_code || "");
        return aCode.localeCompare(bCode);
      });
  }

  function buildInventorySelect(row) {
    const projectName = getEffectiveProjectForRow(row);
    const options = getInventoryOptionsForProject(projectName);

    const defaultOption = `<option value="">Select inventory item</option>`;

    const optionHtml = options.map((item) => {
      const label = `${item.item_code || "No Code"} — ${item.item_name || "Unnamed Item"}`;
      const selected = String(item.id) === String(row.sourceItemId) ? "selected" : "";
      return `<option value="${escapeHtml(item.id)}" ${selected}>${escapeHtml(label)}</option>`;
    }).join("");

    return `
      <select class="install-input install-source-select" data-field="sourceItemId">
        ${defaultOption}
        ${optionHtml}
      </select>
    `;
  }

  function filteredRows() {
    const projectValue = (installProjectFilter?.value || "").trim().toLowerCase();
    const searchProjectValue = (installProjectSearch?.value || "").trim().toLowerCase();
    const statusValue = (installStatusFilter?.value || "").trim().toLowerCase();

    return installRows.filter((row) => {
      const rowProject = String(row.project || "").trim().toLowerCase();
      const rowStatus = String(row.pullStatus || "").trim().toLowerCase();

      const matchesProjectFilter = !projectValue || rowProject === projectValue;
      const matchesProjectSearch = !searchProjectValue || rowProject === searchProjectValue;
      const matchesStatus = !statusValue || rowStatus === statusValue;

      return matchesProjectFilter && matchesProjectSearch && matchesStatus;
    });
  }

  function render() {
    populateProjectDropdowns();

    const rows = filteredRows();

    if (!rows.length) {
      installDayTable.innerHTML = `
        <tr>
          <td colspan="14" style="text-align:center; opacity:.75; padding: 20px;">
            No install-day pull rows found.
          </td>
        </tr>
      `;
      return;
    }

    installDayTable.innerHTML = rows.map((row) => {
      return `
        <tr data-row-id="${escapeHtml(row.id)}">
          <td>
            <input
              class="install-input"
              data-field="project"
              value="${escapeHtml(row.project)}"
              placeholder="Project"
            />
          </td>

          <td>
            ${buildInventorySelect(row)}
          </td>

          <td>
            <input
              class="install-input"
              data-field="area"
              value="${escapeHtml(row.area)}"
              placeholder="Area"
            />
          </td>

          <td>
            <input
              class="install-input"
              data-field="category"
              value="${escapeHtml(row.category)}"
              placeholder="Category"
            />
          </td>

          <td>
            <input
              class="install-input"
              data-field="type"
              value="${escapeHtml(row.type)}"
              placeholder="Type"
            />
          </td>

          <td>
            <input
              class="install-input"
              data-field="name"
              value="${escapeHtml(row.name)}"
              placeholder="Name"
            />
          </td>

          <td>
            <input
              class="install-input"
              data-field="quantity"
              type="number"
              min="1"
              value="${escapeHtml(row.quantity)}"
            />
          </td>

          <td>
            <div class="install-image-cell">
              ${
                row.imageData
                  ? `<img src="${row.imageData}" alt="Install item" class="install-thumb" />`
                  : `<div class="install-thumb-placeholder">No Image</div>`
              }
              <label class="install-upload-btn">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  class="install-image-input"
                  data-row-id="${escapeHtml(row.id)}"
                  hidden
                />
              </label>
            </div>
          </td>

          <td>
            <select class="install-input" data-field="pullStatus">
              <option value="Not Pulled" ${row.pullStatus === "Not Pulled" ? "selected" : ""}>Not Pulled</option>
              <option value="Pulled" ${row.pullStatus === "Pulled" ? "selected" : ""}>Pulled</option>
              <option value="Staged" ${row.pullStatus === "Staged" ? "selected" : ""}>Staged</option>
              <option value="Loaded" ${row.pullStatus === "Loaded" ? "selected" : ""}>Loaded</option>
              <option value="Issue" ${row.pullStatus === "Issue" ? "selected" : ""}>Issue</option>
            </select>
          </td>

          <td>
            <input
              class="install-input"
              data-field="staging"
              value="${escapeHtml(row.staging)}"
              placeholder="Staging Zone"
            />
          </td>

          <td style="text-align:center;">
            <input data-field="loaded" type="checkbox" ${row.loaded ? "checked" : ""} />
          </td>

          <td style="text-align:center;">
            <input data-field="issue" type="checkbox" ${row.issue ? "checked" : ""} />
          </td>

          <td>
            <input
              class="install-input"
              data-field="notes"
              value="${escapeHtml(row.notes)}"
              placeholder="Notes"
            />
          </td>

          <td>
            <button class="reset-btn install-delete-btn" type="button">Delete</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function updateRow(rowId, field, value) {
    installRows = installRows.map((row) => {
      if (row.id !== rowId) return row;

      let nextValue = value;

      if (field === "quantity") {
        const num = Number(value);
        nextValue = Number.isFinite(num) && num > 0 ? num : 1;
      }

      return { ...row, [field]: nextValue };
    });

    saveRows();
  }

  function autoFillFromInventory(rowId, sourceItemId) {
    const liveItems = getLiveInventory();
    const selectedItem = liveItems.find((item) => String(item.id) === String(sourceItemId));

    if (!selectedItem) {
      installRows = installRows.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          sourceItemId: "",
          sourceItemCode: ""
        };
      });
      saveRows();
      render();
      return;
    }

    installRows = installRows.map((row) => {
      if (row.id !== rowId) return row;

      return {
        ...row,
        sourceItemId: String(selectedItem.id),
        sourceItemCode: selectedItem.item_code || "",
        project: selectedItem.project_name || row.project || "",
        area: selectedItem.area || row.area || "",
        category: selectedItem.category || row.category || "",
        type: selectedItem.type || row.type || "",
        name: selectedItem.item_name || row.name || "",
        quantity: Number(selectedItem.quantity) || 1,
        imageData: selectedItem.image_url || row.imageData || "",
        notes: row.notes || selectedItem.notes || ""
      };
    });

    saveRows();
    render();
    showMessage("Install row auto-filled from inventory.");
  }

  function deleteRow(rowId) {
    installRows = installRows.filter((row) => row.id !== rowId);
    saveRows();
    render();
  }

  function updateRowImage(rowId, imageData) {
    installRows = installRows.map((row) => {
      if (row.id !== rowId) return row;
      return { ...row, imageData };
    });

    saveRows();
    render();
    showMessage("Image uploaded.");
  }

  installDayTable?.addEventListener("input", (event) => {
    const target = event.target;
    const rowEl = target.closest("tr[data-row-id]");
    if (!rowEl) return;

    const rowId = rowEl.dataset.rowId;
    const field = target.dataset.field;
    if (!field) return;

    updateRow(rowId, field, target.value);
  });

  installDayTable?.addEventListener("change", (event) => {
    const target = event.target;

    if (target.classList.contains("install-image-input")) {
      const rowId = target.dataset.rowId;
      const file = target.files?.[0];
      if (!file || !rowId) return;

      const reader = new FileReader();
      reader.onload = () => updateRowImage(rowId, reader.result);
      reader.readAsDataURL(file);
      return;
    }

    if (target.classList.contains("install-source-select")) {
      const rowEl = target.closest("tr[data-row-id]");
      if (!rowEl) return;
      autoFillFromInventory(rowEl.dataset.rowId, target.value);
      return;
    }

    const rowEl = target.closest("tr[data-row-id]");
    if (!rowEl) return;

    const rowId = rowEl.dataset.rowId;
    const field = target.dataset.field;
    if (!field) return;

    if (target.type === "checkbox") {
      updateRow(rowId, field, target.checked);
      return;
    }

    updateRow(rowId, field, target.value);
    render();
  });

  installDayTable?.addEventListener("click", (event) => {
    const btn = event.target.closest(".install-delete-btn");
    if (!btn) return;

    const rowEl = btn.closest("tr[data-row-id]");
    if (!rowEl) return;

    deleteRow(rowEl.dataset.rowId);
    showMessage("Pull row deleted.", "neutral");
  });

  installDayAddBtn?.addEventListener("click", () => {
    const row = blankRow();

    if (installProjectFilter?.value) {
      row.project = installProjectFilter.value;
    } else if (installProjectSearch?.value) {
      row.project = installProjectSearch.value;
    }

    if (installStatusFilter?.value) {
      row.pullStatus = installStatusFilter.value;
    }

    installRows.unshift(row);
    saveRows();
    render();
    showMessage("New pull row added.");
  });

  installDaySaveBtn?.addEventListener("click", () => {
    saveRows();
    showMessage("Install-day pull list saved.");
  });

  installDayClearBtn?.addEventListener("click", () => {
    const confirmed = window.confirm("Clear the full install-day pull list?");
    if (!confirmed) return;

    installRows = [];
    saveRows();
    render();
    showMessage("Install-day pull list cleared.", "neutral");
  });

  installDayPrintBtn?.addEventListener("click", () => {
    window.print();
  });

  installProjectFilter?.addEventListener("change", render);

  installProjectSearch?.addEventListener("change", () => {
    if (installProjectSearch.value) {
      installProjectFilter.value = installProjectSearch.value;
    } else {
      installProjectFilter.value = "";
    }
    render();
  });

  installStatusFilter?.addEventListener("change", render);

  document.addEventListener("inventoryDataUpdated", () => {
    render();
  });

  render();
})();
