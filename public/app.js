const listTypeDefs = {
  shopping: {
    id: "shopping",
    label: "Shopping",
    noun: "item",
    plural: "items",
    manualTitle: "Untitled item",
    linkLabel: "Product link",
    linkPlaceholder: "Paste a product link",
    searchPlaceholder: "Search products, tags, sites, orders...",
    priceLabel: "Price",
    priceMissing: "Price missing",
    emptyTitle: "No shopping items here yet",
    emptyCopy: "Saved products for this view will appear here.",
    defaultStatus: "wanted",
    statuses: [
      { id: "all", label: "All", color: "#3f4e57" },
      { id: "wanted", label: "Wanted", color: "#b89d6b" },
      { id: "maybe", label: "Maybe", color: "#536f93" },
      { id: "bought", label: "Bought", color: "#4f7c68" },
      { id: "ordered", label: "Ordered", color: "#a95b4f" }
    ]
  },
  games: {
    id: "games",
    label: "Gaming",
    noun: "game",
    plural: "games",
    manualTitle: "Untitled game",
    linkLabel: "Game link",
    linkPlaceholder: "Paste a store or game page link",
    searchPlaceholder: "Search games, platforms, tags...",
    priceLabel: "Price",
    priceMissing: "Price missing",
    emptyTitle: "No gaming items here yet",
    emptyCopy: "Gaming items for this view will appear here.",
    defaultStatus: "wanted",
    statuses: [
      { id: "all", label: "All", color: "#3f4e57" },
      { id: "wanted", label: "Wanted", color: "#b89d6b" },
      { id: "playing", label: "Playing", color: "#536f93" },
      { id: "finished", label: "Finished", color: "#4f7c68" },
      { id: "dropped", label: "Dropped", color: "#a95b4f" },
      { id: "bought", label: "Bought", color: "#6f86d6" }
    ]
  },
  shows: {
    id: "shows",
    label: "Movies & Shows",
    noun: "movie or show",
    plural: "movies and shows",
    manualTitle: "Untitled movie or show",
    linkLabel: "Movie or show link",
    linkPlaceholder: "Paste a movie, show, or streaming link",
    searchPlaceholder: "Search movies, shows, tags, notes...",
    priceLabel: "Cost",
    priceMissing: "Cost missing",
    emptyTitle: "No movies or shows here yet",
    emptyCopy: "Movies and shows for this view will appear here.",
    defaultStatus: "want_to_watch",
    statuses: [
      { id: "all", label: "All", color: "#3f4e57" },
      { id: "want_to_watch", label: "Want to watch", color: "#b89d6b" },
      { id: "watching", label: "Watching", color: "#536f93" },
      { id: "finished", label: "Finished", color: "#4f7c68" },
      { id: "dropped", label: "Dropped", color: "#a95b4f" }
    ]
  },
  locations: {
    id: "locations",
    label: "Locations",
    noun: "location",
    plural: "locations",
    manualTitle: "Untitled location",
    linkLabel: "Map link",
    linkPlaceholder: "Paste a map or place link",
    searchPlaceholder: "Search locations, tags, addresses...",
    priceLabel: "Cost",
    priceMissing: "Cost missing",
    emptyTitle: "No locations here yet",
    emptyCopy: "Locations for this view will appear here.",
    defaultStatus: "want_to_go",
    statuses: [
      { id: "all", label: "All", color: "#3f4e57" },
      { id: "want_to_go", label: "Want to go", color: "#b89d6b" },
      { id: "planned", label: "Planned", color: "#536f93" },
      { id: "visited", label: "Visited", color: "#4f7c68" }
    ]
  }
};

const orderLabels = {
  placed: "Placed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  delayed: "Delayed",
  cancelled: "Cancelled"
};

const currencyOptions = ["EUR", "USD", "JPY", "GBP", "CNY", "AUD", "CAD", "CHF", "HKD", "SGD"];
const quickFilterDefs = {
  shopping: [
    ["all", "Everything"],
    ["priced", "Has price"],
    ["missing-price", "Missing price"],
    ["with-notes", "Has notes"],
    ["ordered-active", "Active orders"]
  ],
  games: [
    ["all", "Everything"],
    ["priced", "Has price"],
    ["missing-price", "Missing price"],
    ["with-notes", "Has notes"],
    ["in-progress", "In progress"]
  ],
  shows: [
    ["all", "Everything"],
    ["with-notes", "Has notes"],
    ["in-progress", "Watching"]
  ],
  locations: [
    ["all", "Everything"],
    ["with-notes", "Has notes"],
    ["in-progress", "Planned"]
  ]
};
const historyLimit = 50;
const customProfileThemeId = "custom";
const staticStorageKey = "listy-static-db-v1";
const staticSyncFormat = "shoppinglist.sync.v1";
const bluetoothSync = {
  serviceUuid: "1e7d6a0a-4b8c-4f54-9f0c-3d38f5f03f42",
  rxUuid: "1e7d6a0b-4b8c-4f54-9f0c-3d38f5f03f42",
  txUuid: "1e7d6a0c-4b8c-4f54-9f0c-3d38f5f03f42",
  pull: 20,
  bundleStart: 1,
  bundleChunk: 2,
  bundleDone: 3,
  ack: 4,
  error: 5,
  pushStart: 21,
  pushChunk: 22,
  pushDone: 23,
  chunkSize: 18,
  connectTimeoutMs: 45000,
  setupTimeoutMs: 45000,
  serviceRetryMs: 1200,
  timeoutMs: 180000
};
const profileThemePresets = [
  { id: "slate", label: "Slate", light: "#3f4e57", dark: "#20282d" },
  { id: "forest", label: "Forest", light: "#49685c", dark: "#16251f" },
  { id: "plum", label: "Plum", light: "#654864", dark: "#211623" },
  { id: "navy", label: "Navy", light: "#405876", dark: "#111b2a" },
  { id: "olive", label: "Olive", light: "#5e6447", dark: "#1f2115" }
];

const defaultSettings = {
  defaultCurrency: "EUR",
  theme: "light",
  viewMode: "details",
  serverUrl: ""
};

const state = {
  profiles: [],
  items: [],
  binItems: [],
  syncHistory: [],
  storageInfo: null,
  pcLinkUrl: "",
  settings: { ...defaultSettings },
  activeProfileId: null,
  activeListType: "shopping",
  sectionChosen: false,
  statusFilter: "all",
  tagFilter: "",
  search: "",
  quickFilter: "all",
  sort: "newest",
  editingItem: null,
  editingProfileId: null,
  pendingDuplicateLink: null,
  profileThemeCustomActive: false,
  profileThemeCustomLight: "#3f4e57",
  profileThemeCustomDark: "#20282d",
  undoStack: [],
  redoStack: [],
  historyBusy: false,
  isDesktopApp: false,
  bluetoothBusy: false,
  bluetoothDevice: null,
  bluetoothCancelRequested: false,
  bluetoothCandidates: [],
  bluetoothRunId: 0
};

const els = {};
const mobileSwipe = {
  startX: 0,
  startY: 0,
  tracking: false,
  opened: false
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  setupDesktopShell();
  loadSettings();
  bindEvents();
  await loadState();
  openSectionChooser();
}

function cacheElements() {
  for (const id of [
    "desktopTitlebar",
    "desktopBackButton",
    "desktopForwardButton",
    "desktopTitleText",
    "desktopExportButton",
    "desktopFaqButton",
    "desktopTitleSettingsButton",
    "desktopMinimizeButton",
    "desktopMaximizeButton",
    "desktopCloseButton",
    "sectionChooser",
    "sectionChoiceGrid",
    "profileList",
    "addProfileButton",
    "sidebarBinButton",
    "settingsButton",
    "themeToggleButton",
    "mobileMenuButton",
    "mobileSettingsButton",
    "mobileNavCloseButton",
    "mobileNavScrim",
    "bottomAddItemButton",
    "statusTabs",
    "mobileStatusSelect",
    "brandLink",
    "sectionSwitchButton",
    "tagTabs",
    "tagScrollLeftButton",
    "tagScrollRightButton",
    "clearTagButton",
    "searchInput",
    "quickFilter",
    "sortSelect",
    "viewDetailsButton",
    "viewImagesButton",
    "profileSummary",
    "productGrid",
    "productScrollIndicator",
    "linkModal",
    "linkForm",
    "linkModalTitle",
    "productUrlLabel",
    "productUrlInput",
    "manualItemButton",
    "linkMessage",
    "duplicateNotice",
    "duplicateNoticeTitle",
    "duplicateNoticeMeta",
    "openDuplicateButton",
    "addDuplicateAnywayButton",
    "profileModal",
    "profileForm",
    "profileModalTitle",
    "profileNameInput",
    "profileAvatarInput",
    "profileAccentInput",
    "appColourPanel",
    "profileThemeOptions",
    "customThemeFields",
    "profileRailLightInput",
    "profileRailDarkInput",
    "profileRailLightCustomInput",
    "profileRailDarkCustomInput",
    "deleteProfileInModalButton",
    "settingsModal",
    "settingsForm",
    "defaultCurrencyInput",
    "serverUrlInput",
    "syncInfoText",
    "pcLinkUrlText",
    "copyPcLinkUrlButton",
    "storageInfoText",
    "openSyncHistoryButton",
    "exportSyncBundleButton",
    "importSyncBundleButton",
    "bluetoothSyncButton",
    "disconnectBluetoothButton",
    "bluetoothSyncStatus",
    "bluetoothDeviceChooser",
    "bluetoothDeviceList",
    "cancelBluetoothSelectButton",
    "syncBundleFileInput",
    "cleanupBinButton",
    "compactDatabaseButton",
    "binModal",
    "binList",
    "syncHistoryModal",
    "syncHistoryList",
    "faqModal",
    "editorModal",
    "editorForm",
    "editorTitle",
    "editorMessage",
    "refreshScrapeButton",
    "deleteItemButton",
    "deleteItemModal",
    "deleteItemTitle",
    "deleteItemImagePreview",
    "deleteItemName",
    "deleteItemMeta",
    "confirmDeleteItemButton",
    "previewImageWrap",
    "previewSite",
    "previewTitle",
    "previewDescription",
    "previewPrice",
    "previewTags",
    "itemProfileInput",
    "itemListTypeInput",
    "itemStatusInput",
    "itemPriorityInput",
    "itemTitleInput",
    "itemUrlLabel",
    "itemUrlInput",
    "itemImageInput",
    "itemPriceInput",
    "itemPriceLabel",
    "itemCurrencyInput",
    "itemTagsInput",
    "itemDescriptionInput",
    "itemNotesInput",
    "orderPanel",
    "orderStatusInput",
    "carrierInput",
    "trackingNumberInput",
    "trackingUrlInput",
    "orderedAtInput",
    "estimatedDeliveryInput",
    "orderNotesInput",
    "emptyStateTemplate"
  ]) {
    els[id] = document.getElementById(id);
  }
}

function bindEvents() {
  els.desktopBackButton.addEventListener("click", undoHistory);
  els.desktopForwardButton.addEventListener("click", redoHistory);
  els.desktopExportButton.addEventListener("click", exportCurrentCart);
  els.desktopFaqButton.addEventListener("click", openFaqModal);
  els.desktopTitleSettingsButton.addEventListener("click", openSettingsModal);
  els.desktopMinimizeButton.addEventListener("click", () => desktopWindowCommand("minimize"));
  els.desktopMaximizeButton.addEventListener("click", () => desktopWindowCommand("toggleMaximize"));
  els.desktopCloseButton.addEventListener("click", () => desktopWindowCommand("close"));
  els.sectionChoiceGrid.addEventListener("click", chooseListType);
  els.bottomAddItemButton.addEventListener("click", openLinkModal);
  els.addProfileButton.addEventListener("click", () => openProfileModal("new"));
  els.sidebarBinButton.addEventListener("click", openBinModal);
  els.settingsButton.addEventListener("click", openSettingsModal);
  els.themeToggleButton.addEventListener("click", toggleTheme);
  els.mobileMenuButton.addEventListener("click", openMobileNav);
  els.mobileSettingsButton.addEventListener("click", openSettingsModal);
  els.mobileNavCloseButton.addEventListener("click", closeMobileNav);
  els.mobileNavScrim.addEventListener("click", closeMobileNav);
  els.deleteProfileInModalButton.addEventListener("click", deleteEditingProfile);

  els.brandLink.addEventListener("click", (event) => {
    if (state.isDesktopApp) {
      event.preventDefault();
    }
  });
  els.sectionSwitchButton.addEventListener("click", openSectionChooser);

  els.tagScrollLeftButton.addEventListener("click", () => scrollTags(-1));
  els.tagScrollRightButton.addEventListener("click", () => scrollTags(1));
  els.tagTabs.closest(".tag-strip").addEventListener("wheel", handleTagWheel, { passive: false });
  els.tagTabs.addEventListener("scroll", updateTagScrollButtons, { passive: true });
  window.addEventListener("scroll", updateProductScrollIndicator, { passive: true });
  window.addEventListener("resize", () => {
    updateTagScrollButtons();
    updateProductScrollIndicator();
  });

  els.clearTagButton.addEventListener("click", () => {
    state.tagFilter = "";
    render();
  });

  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });

  els.quickFilter.addEventListener("change", (event) => {
    state.quickFilter = event.target.value;
    render();
  });

  els.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });

  els.viewDetailsButton.addEventListener("click", () => setViewMode("details"));
  els.viewImagesButton.addEventListener("click", () => setViewMode("images"));

  els.mobileStatusSelect.addEventListener("change", (event) => {
    state.statusFilter = event.target.value;
    state.tagFilter = "";
    render();
  });

  els.linkForm.addEventListener("submit", addItemFromLink);
  els.manualItemButton.addEventListener("click", createManualItem);
  els.productUrlInput.addEventListener("input", hideDuplicateNotice);
  els.openDuplicateButton.addEventListener("click", openDuplicateFromNotice);
  els.addDuplicateAnywayButton.addEventListener("click", addDuplicateAnyway);
  els.profileForm.addEventListener("submit", saveProfile);
  els.profileThemeOptions.addEventListener("click", selectProfileThemePreset);
  for (const input of [els.profileRailLightCustomInput, els.profileRailDarkCustomInput]) {
    input.addEventListener("input", updateCustomProfileTheme);
    input.addEventListener("change", updateCustomProfileTheme);
  }
  els.settingsForm.addEventListener("submit", saveSettings);
  els.copyPcLinkUrlButton.addEventListener("click", copyPcLinkUrl);
  els.openSyncHistoryButton.addEventListener("click", openSyncHistoryModal);
  els.exportSyncBundleButton.addEventListener("click", exportSyncBundle);
  els.importSyncBundleButton.addEventListener("click", () => {
    els.syncBundleFileInput.value = "";
    els.syncBundleFileInput.click();
  });
  els.bluetoothSyncButton.addEventListener("click", syncWithBluetooth);
  els.disconnectBluetoothButton.addEventListener("click", disconnectBluetoothPhone);
  els.cancelBluetoothSelectButton.addEventListener("click", cancelBluetoothSelection);
  els.bluetoothDeviceList.addEventListener("click", selectBluetoothCandidate);
  els.syncBundleFileInput.addEventListener("change", importSyncBundleFile);
  els.cleanupBinButton.addEventListener("click", cleanupStorage);
  els.compactDatabaseButton.addEventListener("click", compactDatabase);
  els.editorForm.addEventListener("submit", saveEditorItem);
  els.refreshScrapeButton.addEventListener("click", refreshEditorFromLink);
  els.deleteItemButton.addEventListener("click", openDeleteItemModal);
  els.confirmDeleteItemButton.addEventListener("click", deleteEditorItem);
  els.itemListTypeInput.addEventListener("change", () => {
    const type = currentEditorListType();
    renderEditorStatusOptions(type, els.itemStatusInput.value);
    updateEditorLabels(type);
    updateEditorPreview();
  });

  window.shoppingListDesktop?.onBluetoothDevices?.(renderBluetoothDeviceChooser);

  for (const input of editorInputs()) {
    input.addEventListener("input", updateEditorPreview);
    input.addEventListener("change", updateEditorPreview);
  }

  document.addEventListener("click", (event) => {
    const deleteCloseButton = event.target.closest("[data-close-delete-modal]");
    if (deleteCloseButton) {
      closeDeleteItemModal();
      return;
    }
    const closeButton = event.target.closest("[data-close-modal]");
    if (closeButton) {
      closeModals();
      return;
    }
    if (event.target === els.deleteItemModal) {
      closeDeleteItemModal();
      return;
    }
    if (event.target.classList.contains("modal-backdrop")) {
      closeModals();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileNav();
      closeModals();
    }
  });

  bindMobileSwipeNav();
}

async function loadState() {
  try {
    const data = await api("/api/state");
    state.profiles = data.profiles || [];
    state.items = data.items || [];
    const savedId = Number(localStorage.getItem("shopping-list-active-profile"));
    const nextProfile =
      state.profiles.find((profile) => profile.id === state.activeProfileId) ||
      state.profiles.find((profile) => profile.id === savedId) ||
      state.profiles[0];
    state.activeProfileId = nextProfile ? nextProfile.id : null;
    render();
  } catch (error) {
    showToast(error.message || "Could not load Listy.", true);
  }
}

function openSectionChooser() {
  els.sectionChooser.classList.remove("hidden");
}

function chooseListType(event) {
  const button = event.target.closest("[data-list-type]");
  if (!button) return;
  setActiveListType(button.dataset.listType || "shopping");
  state.sectionChosen = true;
  els.sectionChooser.classList.add("hidden");
  closeMobileNav();
  render();
}

function setActiveListType(value) {
  const type = listTypeDefs[value] ? value : "shopping";
  state.activeListType = type;
  state.statusFilter = "all";
  state.tagFilter = "";
  state.search = "";
  state.quickFilter = "all";
  if (els.searchInput) {
    els.searchInput.value = "";
  }
}

function render() {
  applySettings();
  applyProfileTheme(activeProfile());
  validateActiveFilters();
  updateListTypeUi();
  updateHistoryButtons();
  renderProfiles();
  renderStatusTabs();
  renderTagTabs();
  updateDesktopTitlebar();
  renderSummary();
  renderGrid();
  requestAnimationFrame(updateProductScrollIndicator);
}

function validateActiveFilters() {
  if (!statusDefsFor().some((status) => status.id === state.statusFilter)) {
    state.statusFilter = "all";
  }
}

function updateListTypeUi() {
  const def = activeListTypeDef();
  if (els.sectionSwitchButton) {
    els.sectionSwitchButton.textContent = def.label;
  }
  if (els.searchInput) {
    els.searchInput.placeholder = def.searchPlaceholder;
  }
  if (els.linkModalTitle) {
    els.linkModalTitle.textContent = `Paste a ${def.noun} link`;
  }
  if (els.productUrlLabel) {
    els.productUrlLabel.textContent = def.linkLabel;
  }
  if (els.productUrlInput) {
    els.productUrlInput.placeholder = def.linkPlaceholder;
  }
  for (const button of els.sectionChoiceGrid?.querySelectorAll("[data-list-type]") || []) {
    button.classList.toggle("active", button.dataset.listType === state.activeListType);
  }
  renderQuickFilterOptions();
}

function renderQuickFilterOptions() {
  if (!els.quickFilter) return;
  const options = quickFilterDefs[state.activeListType] || quickFilterDefs.shopping;
  if (!options.some(([value]) => value === state.quickFilter)) {
    state.quickFilter = "all";
  }
  const current = els.quickFilter.value;
  if (current === state.quickFilter && els.quickFilter.options.length === options.length) {
    const same = options.every(([value], index) => els.quickFilter.options[index]?.value === value);
    if (same) return;
  }
  els.quickFilter.replaceChildren();
  for (const [value, label] of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    els.quickFilter.appendChild(option);
  }
  els.quickFilter.value = state.quickFilter;
}

function renderProfiles() {
  els.profileList.replaceChildren();

  for (const profile of state.profiles) {
    const tile = document.createElement("div");
    tile.className = "profile-tile";
    tile.style.setProperty("--profile-accent", profile.accent || "#b89d6b");

    const button = document.createElement("button");
    button.type = "button";
    button.className = `profile-button${profile.id === state.activeProfileId ? " active" : ""}`;
    button.addEventListener("click", () => {
      state.activeProfileId = profile.id;
      localStorage.setItem("shopping-list-active-profile", String(profile.id));
      state.tagFilter = "";
      closeMobileNav();
      render();
    });

    const avatar = document.createElement("span");
    avatar.className = "profile-avatar";
    if (profile.avatarUrl) {
      const image = document.createElement("img");
      image.src = profile.avatarUrl;
      image.alt = "";
      image.addEventListener("error", () => {
        avatar.replaceChildren(initials(profile.name));
      });
      avatar.appendChild(image);
    } else {
      avatar.textContent = initials(profile.name);
    }

    const name = document.createElement("span");
    name.className = "profile-name";
    name.textContent = profile.name;
    button.append(avatar, name);

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "profile-edit-button";
    editButton.innerHTML = "&#9998;";
    editButton.title = `Edit ${profile.name}`;
    editButton.setAttribute("aria-label", `Edit ${profile.name}`);
    editButton.addEventListener("click", (event) => {
      event.stopPropagation();
      state.activeProfileId = profile.id;
      localStorage.setItem("shopping-list-active-profile", String(profile.id));
      state.tagFilter = "";
      render();
      openProfileModal("edit", profile.id);
    });

    tile.append(button, editButton);
    els.profileList.appendChild(tile);
  }
}

function renderStatusTabs() {
  const items = currentProfileItems();
  els.statusTabs.replaceChildren();
  els.mobileStatusSelect.replaceChildren();

  for (const status of statusDefsFor()) {
    const count =
      status.id === "all" ? items.length : items.filter((item) => item.status === status.id).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `status-tab${state.statusFilter === status.id ? " active" : ""}`;
    button.textContent = `${status.label} ${count}`;
    button.addEventListener("click", () => {
      state.statusFilter = status.id;
      state.tagFilter = "";
      render();
    });
    els.statusTabs.appendChild(button);

    const option = document.createElement("option");
    option.value = status.id;
    option.textContent = `${status.label} ${count}`;
    els.mobileStatusSelect.appendChild(option);
  }
  els.mobileStatusSelect.value = state.statusFilter;
}

function renderTagTabs() {
  els.tagTabs.replaceChildren();
  const tagMap = new Map();
  for (const item of currentStatusItems()) {
    for (const tag of item.tags || []) {
      const key = normalize(tag);
      if (!key) continue;
      const current = tagMap.get(key) || { label: tag, count: 0 };
      current.count += 1;
      tagMap.set(key, current);
    }
  }

  const tags = Array.from(tagMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  if (!tags.length) {
    const empty = document.createElement("span");
    empty.className = "tag-tab";
    empty.textContent = "No tags";
    els.tagTabs.appendChild(empty);
  }

  for (const tag of tags) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tag-tab${tagMatches(tag.label, state.tagFilter) ? " active" : ""}`;
    button.innerHTML = `${escapeHtml(tag.label)} <span class="tag-count">${tag.count}</span>`;
    button.addEventListener("click", () => {
      toggleTagFilter(tag.label);
    });
    els.tagTabs.appendChild(button);
  }

  els.clearTagButton.classList.add("hidden");
  requestAnimationFrame(updateTagScrollButtons);
}

function renderSummary() {
  const profile = activeProfile();
  const def = activeListTypeDef();
  const items = currentProfileItems();
  const total = sumPrices(items);
  const active = items.filter((item) => ["ordered", "playing", "watching", "planned"].includes(item.status)).length;
  const missing = items.filter((item) => item.priceAmount === null || item.priceAmount === undefined).length;

  els.profileSummary.replaceChildren();

  const title = document.createElement("div");
  title.className = "summary-title";
  const avatar = document.createElement("span");
  avatar.className = "profile-avatar";
  avatar.style.setProperty("--profile-accent", profile?.accent || "#b89d6b");
  avatar.textContent = initials(profile?.name || "Me");
  const heading = document.createElement("h1");
  heading.textContent = profile ? `${profile.name}'s ${def.label.toLowerCase()}` : def.label;
  const pill = document.createElement("span");
  pill.className = "summary-pill";
  pill.textContent = activeStatusLabel();
  title.append(avatar, heading, pill);

  const stats = document.createElement("div");
  stats.className = "summary-stats";
  const statTexts = [
    `${items.length} ${items.length === 1 ? def.noun : def.plural}`,
    `${formatPrice(total, state.settings.defaultCurrency)} total`,
    `${missing} missing ${def.priceLabel.toLowerCase()}`
  ];
  if (state.activeListType === "shopping") {
    statTexts.splice(2, 0, `${active} active order${active === 1 ? "" : "s"}`);
  } else if (active) {
    statTexts.splice(2, 0, `${active} active`);
  }
  for (const text of statTexts) {
    const chip = document.createElement("span");
    chip.className = "stat-chip";
    chip.textContent = text;
    stats.appendChild(chip);
  }

  els.profileSummary.append(title, stats);
}

function renderGrid() {
  els.productGrid.replaceChildren();
  const items = filteredItems();

  if (!items.length) {
    const empty = els.emptyStateTemplate.content.cloneNode(true);
    const def = activeListTypeDef();
    empty.querySelector("h2").textContent = def.emptyTitle;
    empty.querySelector("p").textContent = def.emptyCopy;
    empty.querySelector("[data-add-empty]").textContent = `Add ${def.noun}`;
    empty.querySelector("[data-add-empty]").addEventListener("click", openLinkModal);
    els.productGrid.appendChild(empty);
    requestAnimationFrame(updateProductScrollIndicator);
    return;
  }

  for (const item of items) {
    els.productGrid.appendChild(createProductCard(item));
  }
  requestAnimationFrame(updateProductScrollIndicator);
}

function createProductCard(item) {
  const type = listTypeDef(item.listType);
  const status = statusDefsFor(item.listType).find((entry) => entry.id === item.status) || statusDefsFor(item.listType)[0];
  const card = document.createElement("article");
  card.className = "product-card";
  card.style.setProperty("--status", status.color);

  const imageButton = document.createElement("button");
  imageButton.type = "button";
  imageButton.className = "product-image-button";
  imageButton.addEventListener("click", () => openEditor(item));
  setProductImage(imageButton, item);

  const copy = document.createElement("div");
  copy.className = "product-copy";

  const titleRow = document.createElement("div");
  titleRow.className = "product-title-row";
  const title = document.createElement("button");
  title.type = "button";
  title.className = "product-title";
  title.textContent = item.title;
  title.addEventListener("click", () => openEditor(item));
  const dot = document.createElement("span");
  dot.className = "status-dot";
  dot.title = status.label;
  titleRow.append(title, dot);

  const price = document.createElement("div");
  price.className = "product-price";
  price.textContent = item.priceAmount === null || item.priceAmount === undefined ? type.priceMissing : formatPrice(item.priceAmount, item.currency);

  const domainText = item.sourceDomain || domainFromUrl(item.url) || `Manual ${type.noun}`;
  const domain = item.url ? document.createElement("a") : document.createElement("div");
  domain.className = `product-domain${item.url ? " product-domain-link" : ""}`;
  domain.textContent = domainText;
  domain.title = item.url || domainText;
  if (item.url) {
    domain.href = item.url;
    domain.target = "_blank";
    domain.rel = "noreferrer";
    domain.setAttribute("aria-label", `Open ${domainText}`);
  }

  const tags = document.createElement("div");
  tags.className = "product-tags";
  if ((item.tags || []).length) {
    for (const tag of item.tags) {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "mini-tag";
      pill.textContent = tag;
      pill.addEventListener("click", () => {
        toggleTagFilter(tag);
      });
      tags.appendChild(pill);
    }
  }

  copy.append(titleRow, price, domain);
  if (item.listType === "shopping" && item.status === "ordered") {
    copy.appendChild(createOrderStrip(item));
  }
  copy.appendChild(tags);

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "outline-button";
  edit.textContent = "Edit";
  edit.addEventListener("click", () => openEditor(item));
  actions.appendChild(edit);

  if (item.url) {
    const open = document.createElement("a");
    open.className = "link-button";
    open.href = item.url;
    open.target = "_blank";
    open.rel = "noreferrer";
    open.textContent = "Open";
    if (item.listType === "locations") {
      open.textContent = "Map";
    }
    actions.appendChild(open);
  } else {
    const empty = document.createElement("button");
    empty.type = "button";
    empty.className = "secondary-button";
    empty.disabled = true;
    empty.textContent = "No link";
    actions.appendChild(empty);
  }

  copy.appendChild(actions);
  card.append(imageButton, copy);
  return card;
}

function createOrderStrip(item) {
  const strip = document.createElement("div");
  strip.className = "order-strip";
  const status = document.createElement("strong");
  status.textContent = orderLabels[item.orderStatus] || "Order";
  const details = document.createElement("span");
  const parts = [];
  if (item.carrier) parts.push(item.carrier);
  if (item.estimatedDelivery) parts.push(`ETA ${formatDate(item.estimatedDelivery)}`);
  if (item.trackingNumber) parts.push(item.trackingNumber);
  details.textContent = parts.join(" | ") || "Tracking details not set";
  strip.append(status, details);
  return strip;
}

function setProductImage(container, item) {
  container.replaceChildren();
  if (item.imageUrl) {
    const image = document.createElement("img");
    image.className = "product-image";
    image.src = item.imageUrl;
    image.alt = item.title;
    image.loading = "lazy";
    image.addEventListener("error", () => setImagePlaceholder(container, item.title));
    container.appendChild(image);
    return;
  }
  setImagePlaceholder(container, item.title);
}

function setImagePlaceholder(container, title) {
  const placeholder = document.createElement("div");
  placeholder.className = "image-placeholder";
  placeholder.textContent = initials(title || "Item");
  container.replaceChildren(placeholder);
}

function currentProfileItems() {
  return state.items.filter((item) => item.profileId === state.activeProfileId && (item.listType || "shopping") === state.activeListType);
}

function currentStatusItems() {
  return currentProfileItems().filter((item) => state.statusFilter === "all" || item.status === state.statusFilter);
}

function filteredItems() {
  let items = currentStatusItems();

  if (state.tagFilter) {
    items = items.filter((item) => (item.tags || []).some((tag) => tagMatches(tag, state.tagFilter)));
  }

  if (state.search.trim()) {
    items = items.filter((item) => itemMatchesSearch(item, state.search));
  }

  if (state.quickFilter === "priced") {
    items = items.filter((item) => item.priceAmount !== null && item.priceAmount !== undefined);
  } else if (state.quickFilter === "missing-price") {
    items = items.filter((item) => item.priceAmount === null || item.priceAmount === undefined);
  } else if (state.quickFilter === "with-notes") {
    items = items.filter((item) => item.notes || item.orderNotes);
  } else if (state.quickFilter === "ordered-active") {
    items = items.filter(
      (item) =>
        item.listType === "shopping" &&
        item.status === "ordered" &&
        !["delivered", "cancelled"].includes(String(item.orderStatus || "").toLowerCase())
    );
  } else if (state.quickFilter === "in-progress") {
    items = items.filter((item) => ["ordered", "playing", "watching", "planned"].includes(item.status));
  }

  return [...items].sort(compareItems);
}

function compareItems(a, b) {
  if (state.sort === "price-low") {
    return nullablePrice(a) - nullablePrice(b);
  }
  if (state.sort === "price-high") {
    return nullablePrice(b) - nullablePrice(a);
  }
  if (state.sort === "name") {
    return a.title.localeCompare(b.title);
  }
  if (state.sort === "site") {
    return (a.sourceDomain || "").localeCompare(b.sourceDomain || "");
  }
  if (state.sort === "eta") {
    return (a.estimatedDelivery || "9999-99-99").localeCompare(b.estimatedDelivery || "9999-99-99");
  }
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
}

function nullablePrice(item) {
  return item.priceAmount === null || item.priceAmount === undefined ? Number.POSITIVE_INFINITY : Number(item.priceAmount);
}

function itemMatchesSearch(item, query) {
  const haystack = [
    item.title,
    listTypeDef(item.listType).label,
    item.description,
    item.sourceDomain,
    item.url,
    item.tags?.join(" "),
    item.notes,
    item.carrier,
    item.trackingNumber
  ].join(" ");
  return looseMatches(haystack, query);
}

function tagMatches(tag, query) {
  if (!tag || !query) {
    return false;
  }
  const a = normalize(tag);
  const b = normalize(query);
  return a === b || a.includes(b) || b.includes(a) || levenshtein(a, b) <= Math.max(1, Math.floor(Math.min(a.length, b.length) / 4));
}

function toggleTagFilter(tag) {
  state.tagFilter = normalize(tag) === normalize(state.tagFilter) ? "" : tag;
  render();
}

function looseMatches(text, query) {
  const source = normalize(text);
  const terms = normalize(query).split(" ").filter(Boolean);
  return terms.every((term) => {
    if (source.includes(term)) return true;
    return source.split(" ").some((word) => word.length > 3 && levenshtein(word, term) <= 1);
  });
}

function openLinkModal() {
  closeMobileNav();
  els.productUrlInput.value = "";
  hideDuplicateNotice();
  els.linkMessage.textContent = "";
  els.linkMessage.classList.remove("error");
  els.linkModal.classList.remove("hidden");
  setTimeout(() => els.productUrlInput.focus(), 0);
}

async function addItemFromLink(event, options = {}) {
  event?.preventDefault();
  const url = els.productUrlInput.value.trim();
  if (!url) {
    setFormMessage(els.linkMessage, "Paste a link first.", true);
    return;
  }

  hideDuplicateNotice();
  setFormMessage(els.linkMessage, options.skipDuplicateCheck ? "Adding duplicate..." : "Checking...");
  setBusy(els.linkForm, true);

  try {
    if (!options.skipDuplicateCheck) {
      const existing = await firstDuplicateFor({ url });
      if (existing) {
        showDuplicateNotice(existing, { url });
        return;
      }
    }

    let scraped = options.scraped || null;
    if (!scraped) {
      setFormMessage(els.linkMessage, "Reading link...");
      scraped = await api("/api/scrape", {
        method: "POST",
        body: { url }
      });
    }

    if (!options.skipDuplicateCheck) {
      const existing = await firstDuplicateFor({ url: scraped.url || url, title: scraped.title });
      if (existing) {
        showDuplicateNotice(existing, { url, scraped });
        return;
      }
    }

    setFormMessage(els.linkMessage, "Adding...");
    const item = await api("/api/items", {
      method: "POST",
      body: itemPayloadFromScrape(url, scraped)
    });
    await finishCreatedLinkedItem(item, scraped);
  } catch (error) {
    try {
      if (!options.skipDuplicateCheck) {
        const existing = await firstDuplicateFor({ url });
        if (existing) {
          showDuplicateNotice(existing, { url });
          return;
        }
      }

      const fallback = await api("/api/items", {
        method: "POST",
        body: {
          profileId: state.activeProfileId,
          listType: state.activeListType,
          url,
          sourceDomain: domainFromUrl(url),
          title: domainFromUrl(url) || activeListTypeDef().manualTitle,
          status: defaultStatusForType(),
          currency: state.settings.defaultCurrency,
          tags: []
        }
      });
      await finishCreatedLinkedItem(fallback, null, "Added manually after the site could not be read.");
    } catch {
      setFormMessage(els.linkMessage, error.message || "Could not add that link.", true);
    }
  } finally {
    setBusy(els.linkForm, false);
  }
}

function itemPayloadFromScrape(url, scraped = {}) {
  return {
    profileId: state.activeProfileId,
    listType: state.activeListType,
    url: scraped.url || url,
    sourceDomain: scraped.sourceDomain || domainFromUrl(scraped.url || url),
    title: scraped.title || activeListTypeDef().manualTitle,
    description: scraped.description || "",
    imageUrl: scraped.imageUrl || "",
    priceAmount: scraped.priceAmount,
    currency: scraped.currency || state.settings.defaultCurrency,
    status: defaultStatusForType(),
    tags: scraped.tags || []
  };
}

async function firstDuplicateFor(payload) {
  try {
    const result = await api("/api/items/duplicates", {
      method: "POST",
      body: {
        profileId: state.activeProfileId,
        listType: state.activeListType,
        ...payload
      }
    });
    return result.items?.[0] || null;
  } catch {
    return null;
  }
}

async function finishCreatedLinkedItem(item, scrape, toastText) {
  pushItemCreateHistory(item);
  await loadState();
  closeModals();
  const savedItem = state.items.find((entry) => entry.id === item.id) || item;
  openEditor(savedItem);
  if (toastText) {
    showToast(toastText);
  } else if (scrape?.missing?.length) {
    showToast(`Added with ${scrape.missing.length} field${scrape.missing.length === 1 ? "" : "s"} to check.`);
  } else {
    showToast("Added from link.");
  }
}

function showDuplicateNotice(duplicate, pending) {
  state.pendingDuplicateLink = { ...pending, duplicate };
  els.duplicateNoticeTitle.textContent = duplicate.title || "Existing item";
  const meta = [
    duplicate.duplicateReason || "Possible duplicate",
    duplicateStatusLabel(duplicate),
    duplicate.priceAmount === null || duplicate.priceAmount === undefined ? "" : formatPrice(duplicate.priceAmount, duplicate.currency),
    duplicate.sourceDomain || domainFromUrl(duplicate.url)
  ].filter(Boolean);
  els.duplicateNoticeMeta.textContent = meta.join(" | ");
  els.duplicateNotice.classList.remove("hidden");
  setFormMessage(els.linkMessage, "This looks like something already saved.");
}

function hideDuplicateNotice() {
  state.pendingDuplicateLink = null;
  els.duplicateNotice?.classList.add("hidden");
}

async function openDuplicateFromNotice() {
  const duplicate = state.pendingDuplicateLink?.duplicate;
  if (!duplicate) return;
  await loadState();
  closeModals();
  openEditor(state.items.find((item) => item.id === duplicate.id) || duplicate);
  showToast("Opened the existing item.");
}

function addDuplicateAnyway() {
  const pending = state.pendingDuplicateLink;
  addItemFromLink(null, { skipDuplicateCheck: true, scraped: pending?.scraped || null });
}

function duplicateStatusLabel(item) {
  const status = listTypeDef(item.listType).statuses.find((entry) => entry.id === item.status);
  return status?.label || item.status || "";
}

async function createManualItem() {
  setFormMessage(els.linkMessage, "Creating...");
  setBusy(els.linkForm, true);
  try {
    const item = await api("/api/items", {
      method: "POST",
      body: {
        profileId: state.activeProfileId,
        listType: state.activeListType,
        title: activeListTypeDef().manualTitle,
        status: defaultStatusForType(),
        currency: state.settings.defaultCurrency,
        tags: []
      }
    });
    pushItemCreateHistory(item);
    await loadState();
    closeModals();
    openEditor(state.items.find((entry) => entry.id === item.id) || item);
  } catch (error) {
    setFormMessage(els.linkMessage, error.message || "Could not create an item.", true);
  } finally {
    setBusy(els.linkForm, false);
  }
}

function openProfileModal(mode, profileId = state.activeProfileId) {
  closeMobileNav();
  const profile = state.profiles.find((entry) => entry.id === profileId) || activeProfile();
  const railLight = mode === "new" ? "#3f4e57" : profile?.railLight || "#3f4e57";
  const railDark = mode === "new" ? "#20282d" : profile?.railDark || "#20282d";
  state.editingProfileId = mode === "new" ? null : profile?.id;
  els.profileModalTitle.textContent = mode === "new" ? "Add profile" : "Edit profile";
  els.profileNameInput.value = mode === "new" ? "" : profile?.name || "";
  els.profileAvatarInput.value = mode === "new" ? "" : profile?.avatarUrl || "";
  els.profileAccentInput.value = mode === "new" ? "#b89d6b" : profile?.accent || "#b89d6b";
  els.profileRailLightInput.value = railLight;
  els.profileRailDarkInput.value = railDark;
  setProfileCustomTheme(railLight, railDark);
  state.profileThemeCustomActive = !findProfileThemePreset(railLight, railDark);
  renderProfileThemeOptions(railLight, railDark);
  els.deleteProfileInModalButton.classList.toggle("hidden", mode === "new");
  els.profileModal.classList.remove("hidden");
  setTimeout(() => els.profileNameInput.focus(), 0);
}

async function saveProfile(event) {
  event.preventDefault();
  const previousActiveProfileId = state.activeProfileId;
  const previousProfile = state.editingProfileId
    ? cloneData(state.profiles.find((entry) => entry.id === state.editingProfileId))
    : null;
  const payload = {
    name: els.profileNameInput.value.trim(),
    avatarUrl: els.profileAvatarInput.value.trim(),
    accent: els.profileAccentInput.value,
    railLight: els.profileRailLightInput.value,
    railDark: els.profileRailDarkInput.value
  };
  const method = state.editingProfileId ? "PUT" : "POST";
  const path = state.editingProfileId ? `/api/profiles/${state.editingProfileId}` : "/api/profiles";

  setBusy(els.profileForm, true);
  try {
    const profile = await api(path, { method, body: payload });
    if (previousProfile) {
      pushProfileUpdateHistory(previousProfile, profile);
    } else {
      pushProfileCreateHistory(profile, previousActiveProfileId);
    }
    state.activeProfileId = profile.id;
    localStorage.setItem("shopping-list-active-profile", String(profile.id));
    closeModals();
    await loadState();
  } catch (error) {
    showToast(error.message || "Could not save profile.", true);
  } finally {
    setBusy(els.profileForm, false);
  }
}

async function deleteEditingProfile() {
  const profile =
    state.profiles.find((entry) => entry.id === state.editingProfileId) ||
    activeProfile();
  if (!profile) return;
  if (!confirm(`Remove ${profile.name}'s profile and all of its items?`)) {
    return;
  }
  try {
    const postDeleteActiveProfileId = state.profiles.find((entry) => entry.id !== profile.id)?.id || null;
    await api(`/api/profiles/${profile.id}`, { method: "DELETE" });
    state.activeProfileId = null;
    state.editingProfileId = null;
    localStorage.removeItem("shopping-list-active-profile");
    closeModals();
    await loadState();
    pushProfileDeleteHistory(profile, state.activeProfileId || postDeleteActiveProfileId);
    showToast("Profile removed.");
  } catch (error) {
    showToast(error.message || "Could not remove profile.", true);
  }
}

function renderProfileThemeOptions(selectedLight, selectedDark) {
  els.profileThemeOptions.replaceChildren();
  const light = normalizeHex(selectedLight) || "#3f4e57";
  const dark = normalizeHex(selectedDark) || "#20282d";
  const customLight = normalizeHex(state.profileThemeCustomLight) || light;
  const customDark = normalizeHex(state.profileThemeCustomDark) || dark;
  const selectedPreset = findProfileThemePreset(light, dark);
  const customSelected = state.profileThemeCustomActive || !selectedPreset;

  for (const preset of profileThemePresets) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "profile-theme-option";
    button.style.setProperty("--theme-light", preset.light);
    button.style.setProperty("--theme-dark", preset.dark);
    button.dataset.light = preset.light;
    button.dataset.dark = preset.dark;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-label", preset.label);
    button.setAttribute("aria-checked", String(!customSelected && preset.id === selectedPreset?.id));
    button.title = preset.label;
    els.profileThemeOptions.appendChild(button);
  }

  const customButton = document.createElement("button");
  customButton.type = "button";
  customButton.className = "profile-theme-option profile-theme-custom-option";
  customButton.style.setProperty("--theme-light", customLight);
  customButton.style.setProperty("--theme-dark", customDark);
  customButton.dataset.themeId = customProfileThemeId;
  customButton.setAttribute("role", "radio");
  customButton.setAttribute("aria-label", "Custom app colour");
  customButton.setAttribute("aria-checked", String(customSelected));
  customButton.title = "Custom";
  customButton.textContent = "+";
  els.profileThemeOptions.appendChild(customButton);

  els.profileRailLightCustomInput.value = customLight;
  els.profileRailDarkCustomInput.value = customDark;
  els.customThemeFields.classList.toggle("hidden", !customSelected);
  els.appColourPanel.classList.toggle("custom-active", customSelected);
}

function selectProfileThemePreset(event) {
  const button = event.target.closest(".profile-theme-option");
  if (!button) return;
  if (button.dataset.themeId === customProfileThemeId) {
    state.profileThemeCustomActive = true;
    els.profileRailLightInput.value = normalizeHex(state.profileThemeCustomLight) || "#3f4e57";
    els.profileRailDarkInput.value = normalizeHex(state.profileThemeCustomDark) || "#20282d";
    renderProfileThemeOptions(els.profileRailLightInput.value, els.profileRailDarkInput.value);
    return;
  }

  state.profileThemeCustomActive = false;
  els.profileRailLightInput.value = button.dataset.light || "#3f4e57";
  els.profileRailDarkInput.value = button.dataset.dark || "#20282d";
  renderProfileThemeOptions(els.profileRailLightInput.value, els.profileRailDarkInput.value);
}

function updateCustomProfileTheme() {
  state.profileThemeCustomActive = true;
  setProfileCustomTheme(els.profileRailLightCustomInput.value, els.profileRailDarkCustomInput.value);
  els.profileRailLightInput.value = state.profileThemeCustomLight;
  els.profileRailDarkInput.value = state.profileThemeCustomDark;
  renderProfileThemeOptions(els.profileRailLightInput.value, els.profileRailDarkInput.value);
}

function setProfileCustomTheme(light, dark) {
  state.profileThemeCustomLight = normalizeHex(light) || "#3f4e57";
  state.profileThemeCustomDark = normalizeHex(dark) || "#20282d";
}

function findProfileThemePreset(light, dark) {
  const selectedKey = profileThemeKey(light, dark);
  return profileThemePresets.find((preset) => profileThemeKey(preset.light, preset.dark) === selectedKey);
}

function profileThemeKey(light, dark) {
  return `${normalizeHex(light)}|${normalizeHex(dark)}`;
}

function openEditor(item) {
  state.editingItem = structuredClone(item);
  const type = item.listType || state.activeListType || "shopping";
  els.editorTitle.textContent = item.title || "Make it yours";
  els.editorMessage.textContent = "";
  els.editorMessage.classList.remove("error");

  renderItemProfileOptions(item.profileId || state.activeProfileId);
  els.itemListTypeInput.value = type;
  renderEditorStatusOptions(type, item.status);
  updateEditorLabels(type);
  els.itemPriorityInput.value = String(item.priority || 0);
  els.itemTitleInput.value = item.title || "";
  els.itemUrlInput.value = item.url || "";
  els.itemImageInput.value = item.imageUrl || "";
  els.itemPriceInput.value = item.priceAmount === null || item.priceAmount === undefined ? "" : String(item.priceAmount);
  els.itemCurrencyInput.value = item.currency || state.settings.defaultCurrency;
  els.itemTagsInput.value = (item.tags || []).join(", ");
  els.itemDescriptionInput.value = item.description || "";
  els.itemNotesInput.value = item.notes || "";
  els.orderStatusInput.value = item.orderStatus || "placed";
  els.carrierInput.value = item.carrier || "";
  els.trackingNumberInput.value = item.trackingNumber || "";
  els.trackingUrlInput.value = item.trackingUrl || "";
  els.orderedAtInput.value = item.orderedAt || "";
  els.estimatedDeliveryInput.value = item.estimatedDelivery || "";
  els.orderNotesInput.value = item.orderNotes || "";

  updateEditorPreview();
  els.editorModal.classList.remove("hidden");
  const editorBody = els.editorForm.querySelector(".editor-body");
  if (editorBody) {
    editorBody.scrollTop = 0;
  }
  setTimeout(() => {
    if (editorBody) {
      editorBody.scrollTop = 0;
    }
    if (!window.matchMedia("(max-width: 760px)").matches) {
      els.itemTitleInput.focus();
    }
  }, 0);
}

function renderEditorStatusOptions(type, selectedStatus) {
  const def = listTypeDef(type);
  els.itemStatusInput.replaceChildren();
  for (const status of def.statuses.filter((entry) => entry.id !== "all")) {
    const option = document.createElement("option");
    option.value = status.id;
    option.textContent = status.label;
    els.itemStatusInput.appendChild(option);
  }
  els.itemStatusInput.value = statusIsValidForType(selectedStatus, type) ? selectedStatus : def.defaultStatus;
}

function updateEditorLabels(type = currentEditorListType()) {
  const def = listTypeDef(type);
  if (els.itemUrlLabel) {
    els.itemUrlLabel.textContent = def.linkLabel;
  }
  if (els.itemUrlInput) {
    els.itemUrlInput.placeholder = "Optional";
  }
  if (els.itemPriceLabel) {
    els.itemPriceLabel.textContent = def.priceLabel;
  }
}

function currentEditorListType() {
  return listTypeDefs[els.itemListTypeInput?.value] ? els.itemListTypeInput.value : state.activeListType;
}

function renderItemProfileOptions(selectedProfileId) {
  els.itemProfileInput.replaceChildren();
  for (const profile of state.profiles) {
    const option = document.createElement("option");
    option.value = String(profile.id);
    option.textContent = profile.name || "Profile";
    els.itemProfileInput.appendChild(option);
  }
  const fallback = state.profiles[0]?.id || state.activeProfileId;
  els.itemProfileInput.value = String(selectedProfileId || fallback || "");
  if (!els.itemProfileInput.value && fallback) {
    els.itemProfileInput.value = String(fallback);
  }
}

async function saveEditorItem(event) {
  event.preventDefault();
  if (!state.editingItem) return;
  const previousItem = cloneData(state.editingItem);
  setFormMessage(els.editorMessage, "Saving...");
  setBusy(els.editorForm, true);

  try {
    const item = await api(`/api/items/${state.editingItem.id}`, {
      method: "PUT",
      body: editorPayload()
    });
    pushItemUpdateHistory(previousItem, item);
    if (item.listType && item.listType !== state.activeListType) {
      setActiveListType(item.listType);
      state.sectionChosen = true;
    }
    await loadState();
    state.editingItem = item;
    closeModals();
    showToast("Item saved.");
  } catch (error) {
    setFormMessage(els.editorMessage, error.message || "Could not save item.", true);
  } finally {
    setBusy(els.editorForm, false);
  }
}

function openDeleteItemModal() {
  if (!state.editingItem) return;
  const item = state.editingItem;
  const profile = state.profiles.find((entry) => entry.id === item.profileId) || activeProfile();
  const title = item.title || listTypeDef(item.listType).manualTitle;
  els.deleteItemTitle.textContent = "Move item to Bin?";
  els.deleteItemName.textContent = title;
  const detailParts = [
    profile?.name ? `${profile.name}'s list` : "",
    item.priceAmount === null || item.priceAmount === undefined ? "" : formatPrice(item.priceAmount, item.currency),
    item.sourceDomain || domainFromUrl(item.url)
  ].filter(Boolean);
  els.deleteItemMeta.textContent = detailParts.join(" | ") || `Saved ${listTypeDef(item.listType).noun}`;
  els.deleteItemImagePreview.replaceChildren();
  if (item.imageUrl) {
    const image = document.createElement("img");
    image.src = item.imageUrl;
    image.alt = "";
    image.addEventListener("error", () => {
      els.deleteItemImagePreview.replaceChildren();
      setImagePlaceholder(els.deleteItemImagePreview, title);
    });
    els.deleteItemImagePreview.appendChild(image);
  } else {
    setImagePlaceholder(els.deleteItemImagePreview, title);
  }
  els.deleteItemModal.classList.remove("hidden");
  setTimeout(() => els.confirmDeleteItemButton.focus(), 0);
}

function closeDeleteItemModal() {
  els.deleteItemModal.classList.add("hidden");
}

async function deleteEditorItem() {
  if (!state.editingItem) return;
  try {
    const item = cloneData(state.editingItem);
    setBusy(els.confirmDeleteItemButton, true);
    await api(`/api/items/${state.editingItem.id}`, { method: "DELETE" });
    state.editingItem = null;
    closeModals();
    await loadState();
    pushItemDeleteHistory(item);
    showToast("Item moved to Bin.");
  } catch (error) {
    setFormMessage(els.editorMessage, error.message || "Could not delete item.", true);
  } finally {
    setBusy(els.confirmDeleteItemButton, false);
  }
}

async function refreshEditorFromLink() {
  const url = els.itemUrlInput.value.trim();
  if (!url) {
    setFormMessage(els.editorMessage, `Add a ${listTypeDef(currentEditorListType()).noun} link first.`, true);
    return;
  }

  setFormMessage(els.editorMessage, "Refreshing...");
  setBusy(els.refreshScrapeButton, true);
  try {
    const scraped = await api("/api/scrape", {
      method: "POST",
      body: { url }
    });
    if (scraped.title) els.itemTitleInput.value = scraped.title;
    if (scraped.description) els.itemDescriptionInput.value = scraped.description;
    if (scraped.imageUrl) els.itemImageInput.value = scraped.imageUrl;
    if (scraped.priceAmount !== null && scraped.priceAmount !== undefined) {
      els.itemPriceInput.value = String(scraped.priceAmount);
    }
    if (scraped.currency) els.itemCurrencyInput.value = scraped.currency;
    els.itemTagsInput.value = mergeTags(els.itemTagsInput.value, scraped.tags || []).join(", ");
    updateEditorPreview();
    setFormMessage(els.editorMessage, scraped.missing?.length ? "Refreshed with fields to check." : "Refreshed.");
  } catch (error) {
    setFormMessage(els.editorMessage, error.message || "Could not refresh from link.", true);
  } finally {
    setBusy(els.refreshScrapeButton, false);
  }
}

function updateEditorPreview() {
  const payload = editorPayload({ allowMissingTitle: true });
  const def = listTypeDef(payload.listType);
  els.orderPanel.classList.toggle("hidden", payload.listType !== "shopping" || payload.status !== "ordered");
  els.previewSite.textContent = payload.sourceDomain || `Manual ${def.noun}`;
  els.previewTitle.textContent = payload.title || def.manualTitle;
  els.previewDescription.textContent = payload.description || "No description yet.";
  els.previewPrice.textContent =
    payload.priceAmount === null || payload.priceAmount === undefined
      ? def.priceMissing
      : formatPrice(payload.priceAmount, payload.currency);
  els.previewTags.replaceChildren();
  for (const tag of payload.tags) {
    const pill = document.createElement("span");
    pill.className = "mini-tag";
    pill.textContent = tag;
    els.previewTags.appendChild(pill);
  }

  els.previewImageWrap.replaceChildren();
  if (payload.imageUrl) {
    const image = document.createElement("img");
    image.src = payload.imageUrl;
    image.alt = "";
    image.addEventListener("error", () => {
      els.previewImageWrap.replaceChildren();
      setImagePlaceholder(els.previewImageWrap, payload.title || "Item");
    });
    els.previewImageWrap.appendChild(image);
  } else {
    setImagePlaceholder(els.previewImageWrap, payload.title || "Item");
  }
}

function editorPayload(options = {}) {
  const title = els.itemTitleInput.value.trim();
  const listType = currentEditorListType();
  return {
    profileId: Number(els.itemProfileInput.value || state.activeProfileId),
    listType,
    status: els.itemStatusInput.value,
    priority: Number(els.itemPriorityInput.value || 0),
    title: options.allowMissingTitle ? title : title || listTypeDef(listType).manualTitle,
    url: els.itemUrlInput.value.trim(),
    sourceDomain: domainFromUrl(els.itemUrlInput.value.trim()) || state.editingItem?.sourceDomain || "",
    imageUrl: els.itemImageInput.value.trim(),
    priceAmount: els.itemPriceInput.value === "" ? null : Number(els.itemPriceInput.value),
    currency: normalizeCurrency(els.itemCurrencyInput.value || state.settings.defaultCurrency),
    tags: splitTags(els.itemTagsInput.value),
    description: els.itemDescriptionInput.value.trim(),
    notes: els.itemNotesInput.value.trim(),
    orderStatus: els.orderStatusInput.value,
    carrier: els.carrierInput.value.trim(),
    trackingNumber: els.trackingNumberInput.value.trim(),
    trackingUrl: els.trackingUrlInput.value.trim(),
    orderedAt: els.orderedAtInput.value,
    estimatedDelivery: els.estimatedDeliveryInput.value,
    orderNotes: els.orderNotesInput.value.trim()
  };
}

function editorInputs() {
  return [
    els.itemStatusInput,
    els.itemProfileInput,
    els.itemListTypeInput,
    els.itemPriorityInput,
    els.itemTitleInput,
    els.itemUrlInput,
    els.itemImageInput,
    els.itemPriceInput,
    els.itemCurrencyInput,
    els.itemTagsInput,
    els.itemDescriptionInput,
    els.itemNotesInput,
    els.orderStatusInput,
    els.carrierInput,
    els.trackingNumberInput,
    els.trackingUrlInput,
    els.orderedAtInput,
    els.estimatedDeliveryInput,
    els.orderNotesInput
  ];
}

function closeModals() {
  for (const modal of [
    els.linkModal,
    els.profileModal,
    els.settingsModal,
    els.binModal,
    els.syncHistoryModal,
    els.faqModal,
    els.deleteItemModal,
    els.editorModal
  ]) {
    modal.classList.add("hidden");
  }
  hideDuplicateNotice();
  state.editingItem = null;
  state.editingProfileId = null;
}

async function api(path, options = {}) {
  if (isStaticApiMode() && String(path || "").startsWith("/api/")) {
    return staticApi(path, options);
  }

  const init = {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" }
  };
  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }
  const response = await fetch(apiUrl(path), init);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

function isStaticApiMode() {
  return window.LISTY_STATIC_MODE === true || window.LISTY_STATIC_MODE === "true";
}

async function staticApi(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const pathname = new URL(path, window.location.origin).pathname;
  const segments = pathname.split("/").filter(Boolean);
  const body = options.body || {};
  const db = staticReadDb();

  if (method === "GET" && pathname === "/api/state") {
    return {
      profiles: staticListProfiles(db),
      items: staticListItems(db),
      device: staticDeviceInfo(db)
    };
  }

  if (method === "GET" && pathname === "/api/bin") {
    return { items: staticListDeletedItems(db) };
  }

  if (method === "GET" && pathname === "/api/sync/history") {
    return { changes: staticListSyncHistory(db) };
  }

  if (method === "GET" && pathname === "/api/storage") {
    return staticStorageInfo(db);
  }

  if (method === "GET" && pathname === "/api/device-info") {
    return {
      port: null,
      lanUrls: [],
      device: staticDeviceInfo(db),
      staticMode: true
    };
  }

  if (method === "GET" && pathname === "/api/sync/bundle") {
    return staticExportSyncBundle(db);
  }

  if (method === "POST" && pathname === "/api/sync/import") {
    return staticImportSyncBundle(db, body.bundle || body);
  }

  if (method === "POST" && pathname === "/api/profiles") {
    return staticCreateProfile(db, body);
  }

  if (segments[1] === "profiles" && segments[2]) {
    const id = staticToId(segments[2]);
    if (segments[3] === "restore" && method === "POST") {
      return staticRestoreProfile(db, id);
    }
    if (method === "PUT") {
      return staticUpdateProfile(db, id, body);
    }
    if (method === "DELETE") {
      staticDeleteProfile(db, id);
      return { ok: true };
    }
  }

  if (method === "POST" && pathname === "/api/items") {
    return staticCreateItem(db, body);
  }

  if (method === "POST" && pathname === "/api/items/duplicates") {
    return { items: staticFindDuplicateItems(db, body) };
  }

  if ((method === "POST" && pathname === "/api/scrape") || (method === "POST" && pathname === "/api/items/from-url")) {
    const scraped = staticScrape(body);
    if (pathname === "/api/items/from-url") {
      const item = staticCreateItem(db, {
        profileId: body.profileId,
        listType: body.listType,
        status: defaultStatusForType(body.listType),
        ...scraped
      });
      return { item, scrape: { found: scraped.found, missing: scraped.missing, sourceDomain: scraped.sourceDomain } };
    }
    return scraped;
  }

  if (segments[1] === "items" && segments[2]) {
    const id = staticToId(segments[2]);
    if (segments[3] === "restore" && method === "POST") {
      return staticRestoreItem(db, id);
    }
    if (segments[3] === "purge" && method === "DELETE") {
      staticPurgeDeletedItem(db, id);
      return { ok: true };
    }
    if (method === "PUT") {
      return staticUpdateItem(db, id, body);
    }
    if (method === "DELETE") {
      staticDeleteItem(db, id);
      return { ok: true };
    }
  }

  if (method === "POST" && pathname === "/api/bin/cleanup") {
    return staticCleanupDeletedItems(db, body);
  }

  if (method === "POST" && pathname === "/api/maintenance/compact") {
    staticSaveDb(db);
    return { ok: true, storage: staticStorageInfo(db) };
  }

  throw new Error("That action is not available in the hosted version.");
}

function staticReadDb() {
  let db = null;
  try {
    db = JSON.parse(localStorage.getItem(staticStorageKey) || "null");
  } catch {
    db = null;
  }

  if (!db || !Array.isArray(db.profiles) || !Array.isArray(db.items)) {
    db = staticSeedDb();
    staticSaveDb(db);
    return db;
  }

  db.profiles = db.profiles || [];
  db.items = db.items || [];
  db.changes = Array.isArray(db.changes) ? db.changes : [];
  db.nextProfileId = Math.max(Number(db.nextProfileId || 1), ...db.profiles.map((profile) => Number(profile.id || 0) + 1), 1);
  db.nextItemId = Math.max(Number(db.nextItemId || 1), ...db.items.map((item) => Number(item.id || 0) + 1), 1);
  db.device = db.device || { id: staticUuid(), name: "Hosted Listy", platform: "web", createdAt: staticNow() };

  if (!staticListProfiles(db).length) {
    const now = staticNow();
    db.profiles.push({
      id: db.nextProfileId++,
      uuid: staticUuid(),
      name: "Me",
      accent: "#b89d6b",
      avatarUrl: "",
      railLight: "#3f4e57",
      railDark: "#20282d",
      sortOrder: 0,
      version: 1,
      deletedAt: "",
      deletedByDeviceId: "",
      createdAt: now,
      updatedAt: now
    });
    staticSaveDb(db);
  }

  return db;
}

function staticSeedDb() {
  const now = staticNow();
  const profile = {
    id: 1,
    uuid: staticUuid(),
    name: "Me",
    accent: "#b89d6b",
    avatarUrl: "",
    railLight: "#3f4e57",
    railDark: "#20282d",
    sortOrder: 0,
    version: 1,
    deletedAt: "",
    deletedByDeviceId: "",
    createdAt: now,
    updatedAt: now
  };
  return {
    format: "listy.static.v1",
    nextProfileId: 2,
    nextItemId: 1,
    device: {
      id: staticUuid(),
      name: "Hosted Listy",
      platform: "web",
      createdAt: now,
      lastSeenAt: now
    },
    profiles: [profile],
    items: [],
    changes: []
  };
}

function staticSaveDb(db) {
  db.device = { ...(db.device || {}), lastSeenAt: staticNow() };
  localStorage.setItem(staticStorageKey, JSON.stringify(db));
}

function staticDeviceInfo(db) {
  return {
    id: db.device?.id || "",
    name: db.device?.name || "Hosted Listy",
    platform: db.device?.platform || "web",
    lastSeenAt: db.device?.lastSeenAt || ""
  };
}

function staticListProfiles(db) {
  return db.profiles
    .filter((profile) => !profile.deletedAt)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || Date.parse(a.createdAt || "") - Date.parse(b.createdAt || "") || a.id - b.id)
    .map((profile) => cloneData(profile));
}

function staticListItems(db) {
  return db.items
    .filter((item) => !item.deletedAt)
    .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "") || b.id - a.id)
    .map((item) => cloneData(staticItemWithProfile(db, item)));
}

function staticListDeletedItems(db) {
  return db.items
    .filter((item) => item.deletedAt && !item.purgedAt)
    .sort((a, b) => Date.parse(b.deletedAt || "") - Date.parse(a.deletedAt || "") || b.id - a.id)
    .map((item) => cloneData(staticItemWithProfile(db, item)));
}

function staticListSyncHistory(db, limit = 100) {
  return [...db.changes]
    .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""))
    .slice(0, limit)
    .map((change) => cloneData(change));
}

function staticCreateProfile(db, body = {}) {
  const now = staticNow();
  const profile = {
    id: db.nextProfileId++,
    uuid: staticUuid(),
    name: staticCleanText(body.name, 64) || "New profile",
    accent: normalizeHex(body.accent) || "#b89d6b",
    avatarUrl: staticCleanUrl(body.avatarUrl),
    railLight: normalizeHex(body.railLight) || "#3f4e57",
    railDark: normalizeHex(body.railDark) || "#20282d",
    sortOrder: staticNextProfileOrder(db),
    version: 1,
    deletedAt: "",
    deletedByDeviceId: "",
    createdAt: now,
    updatedAt: now
  };
  db.profiles.push(profile);
  staticRecordChange(db, "profile", profile.uuid, "create", profile, `Created profile ${profile.name}`);
  staticSaveDb(db);
  return cloneData(profile);
}

function staticUpdateProfile(db, id, body = {}) {
  const profile = staticRequireProfile(db, id);
  profile.name = staticCleanText(body.name, 64) || "New profile";
  profile.accent = normalizeHex(body.accent) || "#b89d6b";
  profile.avatarUrl = staticCleanUrl(body.avatarUrl);
  profile.railLight = normalizeHex(body.railLight) || "#3f4e57";
  profile.railDark = normalizeHex(body.railDark) || "#20282d";
  profile.version = Number(profile.version || 1) + 1;
  profile.updatedAt = staticNow();
  staticRecordChange(db, "profile", profile.uuid, "update", profile, `Updated profile ${profile.name}`);
  staticSaveDb(db);
  return cloneData(profile);
}

function staticDeleteProfile(db, id) {
  const profile = staticRequireProfile(db, id);
  if (staticListProfiles(db).length <= 1) {
    throw new Error("You need at least one profile.");
  }
  const deletedAt = staticNow();
  profile.deletedAt = deletedAt;
  profile.deletedByDeviceId = db.device?.id || "";
  profile.version = Number(profile.version || 1) + 1;
  profile.updatedAt = deletedAt;
  for (const item of db.items.filter((entry) => entry.profileId === id && !entry.deletedAt)) {
    item.deletedAt = deletedAt;
    item.deletedByDeviceId = db.device?.id || "";
    item.version = Number(item.version || 1) + 1;
    item.updatedAt = deletedAt;
  }
  staticRecordChange(db, "profile", profile.uuid, "delete", profile, `Deleted profile ${profile.name}`);
  staticSaveDb(db);
}

function staticRestoreProfile(db, id) {
  const profile = db.profiles.find((entry) => entry.id === id && entry.deletedAt);
  if (!profile) throw new Error("Deleted profile not found.");
  const deletedAt = profile.deletedAt;
  profile.deletedAt = "";
  profile.deletedByDeviceId = "";
  profile.version = Number(profile.version || 1) + 1;
  profile.updatedAt = staticNow();
  for (const item of db.items.filter((entry) => entry.profileId === id && entry.deletedAt === deletedAt && !entry.purgedAt)) {
    item.deletedAt = "";
    item.deletedByDeviceId = "";
    item.updatedAt = profile.updatedAt;
    item.version = Number(item.version || 1) + 1;
  }
  staticRecordChange(db, "profile", profile.uuid, "restore", profile, `Restored profile ${profile.name}`);
  staticSaveDb(db);
  return cloneData(profile);
}

function staticCreateItem(db, body = {}) {
  const profile = staticRequireProfile(db, Number(body.profileId));
  const data = staticSanitizeItem(body);
  const now = staticNow();
  const item = {
    id: db.nextItemId++,
    uuid: staticUuid(),
    profileId: profile.id,
    profileUuid: profile.uuid,
    ...data,
    version: 1,
    deletedAt: "",
    deletedByDeviceId: "",
    purgedAt: "",
    createdAt: now,
    updatedAt: now
  };
  db.items.push(item);
  staticRecordChange(db, "item", item.uuid, "create", item, `Added ${item.title}`);
  staticSaveDb(db);
  return cloneData(staticItemWithProfile(db, item));
}

function staticUpdateItem(db, id, body = {}) {
  const item = staticRequireItem(db, id);
  const profile = staticRequireProfile(db, Number(body.profileId));
  const data = staticSanitizeItem(body);
  Object.assign(item, data, {
    profileId: profile.id,
    profileUuid: profile.uuid,
    version: Number(item.version || 1) + 1,
    updatedAt: staticNow()
  });
  staticRecordChange(db, "item", item.uuid, "update", item, `Updated ${item.title}`);
  staticSaveDb(db);
  return cloneData(staticItemWithProfile(db, item));
}

function staticDeleteItem(db, id) {
  const item = staticRequireItem(db, id);
  const deletedAt = staticNow();
  item.deletedAt = deletedAt;
  item.deletedByDeviceId = db.device?.id || "";
  item.version = Number(item.version || 1) + 1;
  item.updatedAt = deletedAt;
  staticRecordChange(db, "item", item.uuid, "delete", item, `Moved ${item.title} to Bin`);
  staticSaveDb(db);
}

function staticRestoreItem(db, id) {
  const item = db.items.find((entry) => entry.id === id && entry.deletedAt && !entry.purgedAt);
  if (!item) throw new Error("Bin item not found.");
  item.deletedAt = "";
  item.deletedByDeviceId = "";
  item.purgedAt = "";
  item.version = Number(item.version || 1) + 1;
  item.updatedAt = staticNow();
  staticRecordChange(db, "item", item.uuid, "restore", item, `Restored ${item.title}`);
  staticSaveDb(db);
  return cloneData(staticItemWithProfile(db, item));
}

function staticPurgeDeletedItem(db, id) {
  const item = db.items.find((entry) => entry.id === id && entry.deletedAt && !entry.purgedAt);
  if (!item) throw new Error("Bin item not found.");
  const purgedAt = staticNow();
  Object.assign(item, {
    url: "",
    sourceDomain: "",
    description: "",
    imageUrl: "",
    priceAmount: null,
    tags: [],
    notes: "",
    orderStatus: "",
    carrier: "",
    trackingNumber: "",
    trackingUrl: "",
    orderedAt: "",
    estimatedDelivery: "",
    orderNotes: "",
    purgedAt,
    version: Number(item.version || 1) + 1,
    updatedAt: purgedAt
  });
  staticRecordChange(db, "item", item.uuid, "purge", { id: item.id, uuid: item.uuid }, `Permanently cleared ${item.title}`);
  staticSaveDb(db);
}

function staticCleanupDeletedItems(db, body = {}) {
  const retentionDays = Math.min(365, Math.max(1, Number.parseInt(body.retentionDays || 30, 10) || 30));
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let purgedItems = 0;
  for (const item of db.items.filter((entry) => entry.deletedAt && !entry.purgedAt && Date.parse(entry.deletedAt) < cutoff)) {
    staticPurgeDeletedItem(db, item.id);
    purgedItems += 1;
  }
  staticSaveDb(db);
  return { ok: true, purgedItems, retentionDays, storage: staticStorageInfo(db) };
}

function staticFindDuplicateItems(db, body = {}) {
  const profileId = Number(body.profileId);
  const listType = staticCleanListType(body.listType);
  const excludeId = Number.parseInt(body.excludeId || 0, 10) || 0;
  const targetUrl = staticComparableUrl(body.url);
  const targetTitle = staticComparableTitle(body.title);
  if (!targetUrl && !targetTitle) return [];

  return db.items
    .filter((item) => !item.deletedAt && item.profileId === profileId && item.listType === listType && item.id !== excludeId)
    .map((item) => {
      const match = staticDuplicateMatch(item, targetUrl, targetTitle);
      return match ? { ...staticItemWithProfile(db, item), duplicateReason: match.reason, duplicateScore: match.score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.duplicateScore - a.duplicateScore || b.id - a.id)
    .slice(0, 5);
}

function staticScrape(body = {}) {
  const url = staticCleanUrl(body.url);
  if (!url) {
    throw new Error("Paste a valid link first.");
  }
  const sourceDomain = domainFromUrl(url);
  const title = sourceDomain || listTypeDef(body.listType).manualTitle;
  return {
    url,
    sourceDomain,
    title,
    description: "",
    imageUrl: "",
    priceAmount: null,
    currency: state.settings.defaultCurrency,
    tags: staticGuessTags(url),
    found: ["url", "title"],
    missing: ["imageUrl", "priceAmount", "description"],
    hostedMode: true
  };
}

function staticExportSyncBundle(db) {
  const profilesById = new Map(db.profiles.map((profile) => [profile.id, profile]));
  return {
    format: staticSyncFormat,
    bundleId: staticUuid(),
    exportedAt: staticNow(),
    device: staticDeviceInfo(db),
    profiles: db.profiles.map((profile) => cloneData(profile)),
    items: db.items.map((item) => cloneData({
      ...item,
      profileUuid: item.profileUuid || profilesById.get(item.profileId)?.uuid || ""
    })),
    changes: staticListSyncHistory(db, 250)
  };
}

function staticImportSyncBundle(db, input) {
  const bundle = typeof input === "string" ? JSON.parse(input) : input;
  if (!bundle || bundle.format !== staticSyncFormat) {
    throw new Error("Unsupported sync bundle.");
  }

  const remoteDevice = {
    id: staticCleanText(bundle.device?.id, 80),
    name: staticCleanText(bundle.device?.name, 120) || "Linked device",
    platform: staticCleanText(bundle.device?.platform, 40) || "unknown"
  };
  const result = {
    ok: true,
    remoteDevice,
    profilesAdded: 0,
    profilesUpdated: 0,
    itemsAdded: 0,
    itemsUpdated: 0,
    skipped: 0
  };

  const profileIds = new Map();
  for (const incoming of Array.isArray(bundle.profiles) ? bundle.profiles : []) {
    const uuid = staticCleanText(incoming?.uuid, 80);
    if (!uuid) {
      result.skipped += 1;
      continue;
    }
    const incomingName = staticCleanText(incoming.name, 64) || "New profile";
    let local = db.profiles.find((profile) => profile.uuid === uuid);
    if (!local && !incoming.deletedAt) {
      local = db.profiles.find((profile) => !profile.deletedAt && normalize(profile.name) === normalize(incomingName));
      if (local) {
        local.uuid = uuid;
      }
    }
    if (!local) {
      local = {
        id: db.nextProfileId++,
        uuid,
        name: incomingName,
        accent: normalizeHex(incoming.accent) || "#b89d6b",
        avatarUrl: staticCleanUrl(incoming.avatarUrl),
        railLight: normalizeHex(incoming.railLight) || "#3f4e57",
        railDark: normalizeHex(incoming.railDark) || "#20282d",
        sortOrder: Number.parseInt(incoming.sortOrder || staticNextProfileOrder(db), 10) || 0,
        version: Math.max(1, Number.parseInt(incoming.version || 1, 10)),
        deletedAt: staticCleanTimestamp(incoming.deletedAt),
        deletedByDeviceId: staticCleanText(incoming.deletedByDeviceId, 80),
        createdAt: staticCleanTimestamp(incoming.createdAt) || staticNow(),
        updatedAt: staticCleanTimestamp(incoming.updatedAt) || staticNow()
      };
      db.profiles.push(local);
      result.profilesAdded += 1;
    } else if (staticIncomingWins(incoming.updatedAt, incoming.version, local.updatedAt, local.version)) {
      Object.assign(local, {
        name: incomingName,
        accent: normalizeHex(incoming.accent) || local.accent || "#b89d6b",
        avatarUrl: staticCleanUrl(incoming.avatarUrl),
        railLight: normalizeHex(incoming.railLight) || local.railLight || "#3f4e57",
        railDark: normalizeHex(incoming.railDark) || local.railDark || "#20282d",
        sortOrder: Number.parseInt(incoming.sortOrder || local.sortOrder || 0, 10) || 0,
        version: Math.max(Number(local.version || 1), Number.parseInt(incoming.version || 1, 10)),
        deletedAt: staticCleanTimestamp(incoming.deletedAt),
        deletedByDeviceId: staticCleanText(incoming.deletedByDeviceId, 80),
        createdAt: staticCleanTimestamp(incoming.createdAt) || local.createdAt,
        updatedAt: staticCleanTimestamp(incoming.updatedAt) || staticNow()
      });
      result.profilesUpdated += 1;
    }
    profileIds.set(uuid, local.id);
  }

  for (const incoming of Array.isArray(bundle.items) ? bundle.items : []) {
    const uuid = staticCleanText(incoming?.uuid, 80);
    const profileId = profileIds.get(staticCleanText(incoming?.profileUuid, 80));
    if (!uuid || !profileId) {
      result.skipped += 1;
      continue;
    }
    const profile = db.profiles.find((entry) => entry.id === profileId);
    let local = db.items.find((item) => item.uuid === uuid);
    const data = staticSanitizeItem({ ...incoming, profileId });
    const next = {
      ...data,
      profileId,
      profileUuid: profile?.uuid || "",
      version: Math.max(1, Number.parseInt(incoming.version || 1, 10)),
      deletedAt: staticCleanTimestamp(incoming.deletedAt),
      deletedByDeviceId: staticCleanText(incoming.deletedByDeviceId, 80),
      purgedAt: staticCleanTimestamp(incoming.purgedAt),
      createdAt: staticCleanTimestamp(incoming.createdAt) || staticNow(),
      updatedAt: staticCleanTimestamp(incoming.updatedAt) || staticNow()
    };
    if (!local) {
      db.items.push({ id: db.nextItemId++, uuid, ...next });
      result.itemsAdded += 1;
    } else if (staticIncomingWins(next.updatedAt, next.version, local.updatedAt, local.version)) {
      Object.assign(local, next, { uuid });
      result.itemsUpdated += 1;
    }
  }

  const changedCount = result.profilesAdded + result.profilesUpdated + result.itemsAdded + result.itemsUpdated;
  staticRecordChange(db, "sync", bundle.bundleId || staticUuid(), "import", result, `Imported ${changedCount} sync changes from ${remoteDevice.name}`);
  staticSaveDb(db);
  return { ...result, changedCount };
}

function staticSanitizeItem(body = {}) {
  const listType = staticCleanListType(body.listType);
  const status = statusIsValidForType(body.status, listType) ? body.status : defaultStatusForType(listType);
  const orderStatus = Object.prototype.hasOwnProperty.call(orderLabels, body.orderStatus) ? body.orderStatus : "";
  const price = body.priceAmount === null || body.priceAmount === undefined || body.priceAmount === ""
    ? null
    : Number(body.priceAmount);

  return {
    listType,
    url: staticCleanUrl(body.url),
    sourceDomain: staticCleanText(body.sourceDomain, 128) || domainFromUrl(body.url),
    title: staticCleanText(body.title, 180) || listTypeDef(listType).manualTitle,
    description: staticCleanText(body.description, 2000),
    imageUrl: staticCleanUrl(body.imageUrl),
    priceAmount: Number.isFinite(price) ? price : null,
    currency: normalizeCurrency(body.currency || state.settings.defaultCurrency),
    status,
    tags: Array.isArray(body.tags) ? splitTags(body.tags.join(",")) : splitTags(body.tags),
    notes: staticCleanText(body.notes, 2000),
    priority: Math.min(5, Math.max(0, Number.parseInt(body.priority || 0, 10) || 0)),
    orderStatus: listType === "shopping" && status === "ordered" ? orderStatus || "placed" : orderStatus,
    carrier: staticCleanText(body.carrier, 120),
    trackingNumber: staticCleanText(body.trackingNumber, 160),
    trackingUrl: staticCleanUrl(body.trackingUrl),
    orderedAt: staticCleanDate(body.orderedAt),
    estimatedDelivery: staticCleanDate(body.estimatedDelivery),
    orderNotes: staticCleanText(body.orderNotes, 2000)
  };
}

function staticRequireProfile(db, id) {
  const profile = db.profiles.find((entry) => entry.id === id && !entry.deletedAt);
  if (!profile) throw new Error("Profile not found.");
  return profile;
}

function staticRequireItem(db, id) {
  const item = db.items.find((entry) => entry.id === id && !entry.deletedAt);
  if (!item) throw new Error("Item not found.");
  return item;
}

function staticItemWithProfile(db, item) {
  const profile = db.profiles.find((entry) => entry.id === item.profileId);
  return {
    ...item,
    profileUuid: item.profileUuid || profile?.uuid || "",
    profileName: profile?.name || ""
  };
}

function staticStorageInfo(db) {
  const databaseBytes = new Blob([JSON.stringify(db)]).size;
  return {
    databaseBytes,
    binCount: db.items.filter((item) => item.deletedAt && !item.purgedAt).length,
    tombstoneCount: db.items.filter((item) => item.deletedAt && item.purgedAt).length,
    syncChangeCount: db.changes.length,
    binRetentionDays: 30,
    syncLogRetentionDays: 90
  };
}

function staticRecordChange(db, entityType, entityUuid, operation, payload, summary) {
  db.changes.unshift({
    id: staticUuid(),
    deviceId: db.device?.id || "",
    deviceName: db.device?.name || "Hosted Listy",
    entityType,
    entityUuid,
    operation,
    payload: cloneData(payload || {}),
    summary: staticCleanText(summary, 240) || `${operation} ${entityType}`,
    createdAt: staticNow()
  });
  db.changes = db.changes.slice(0, 250);
}

function staticDuplicateMatch(item, targetUrl, targetTitle) {
  const itemUrl = staticComparableUrl(item.url);
  if (targetUrl && itemUrl && targetUrl === itemUrl) {
    return { score: 100, reason: "Same link" };
  }
  const itemTitle = staticComparableTitle(item.title);
  if (!targetTitle || !itemTitle) return null;
  if (targetTitle === itemTitle) return { score: 90, reason: "Same title" };
  const score = staticTitleOverlapScore(targetTitle, itemTitle);
  return score >= 0.82 ? { score: Math.round(score * 80), reason: "Similar title" } : null;
}

function staticTitleOverlapScore(left, right) {
  const leftTokens = new Set(left.split(" ").filter((token) => token.length > 2));
  const rightTokens = new Set(right.split(" ").filter((token) => token.length > 2));
  if (!leftTokens.size || !rightTokens.size) return 0;
  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }
  return overlap / Math.min(leftTokens.size, rightTokens.size);
}

function staticComparableTitle(value) {
  return normalize(staticCleanText(value, 180));
}

function staticComparableUrl(value) {
  const raw = staticCleanUrl(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/+$/, "");
    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (lower.startsWith("utm_") || ["fbclid", "gclid", "igshid", "mc_cid", "mc_eid", "ref", "tag"].includes(lower)) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    return `${url.hostname}${url.pathname}${url.search}`;
  } catch {
    return normalize(raw);
  }
}

function staticGuessTags(value) {
  return String(value || "")
    .split(/[^a-z0-9]+/i)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 2 && !["www", "com", "net", "org", "html", "https", "http"].includes(part))
    .slice(0, 3);
}

function staticIncomingWins(incomingUpdatedAt, incomingVersion, localUpdatedAt, localVersion) {
  const incomingTime = Date.parse(incomingUpdatedAt || "");
  const localTime = Date.parse(localUpdatedAt || "");
  if (Number.isFinite(incomingTime) && Number.isFinite(localTime) && incomingTime !== localTime) {
    return incomingTime > localTime;
  }
  return Number(incomingVersion || 1) > Number(localVersion || 1);
}

function staticNextProfileOrder(db) {
  return db.profiles.reduce((max, profile) => Math.max(max, Number(profile.sortOrder || 0)), -1) + 1;
}

function staticCleanListType(value) {
  return listTypeDefs[value] ? value : "shopping";
}

function staticCleanUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function staticCleanText(value, maxLength = 2000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function staticCleanDate(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function staticCleanTimestamp(value) {
  const text = String(value || "").trim();
  return Number.isFinite(Date.parse(text)) ? text : "";
}

function staticToId(value) {
  const id = Number.parseInt(value, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid id.");
  }
  return id;
}

function staticUuid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    const digit = character === "x" ? value : (value & 0x3) | 0x8;
    return digit.toString(16);
  });
}

function staticNow() {
  return new Date().toISOString();
}

function activeProfile() {
  return state.profiles.find((profile) => profile.id === state.activeProfileId) || null;
}

function activeListTypeDef() {
  return listTypeDefs[state.activeListType] || listTypeDefs.shopping;
}

function listTypeDef(value) {
  return listTypeDefs[value] || listTypeDefs.shopping;
}

function statusDefsFor(type = state.activeListType) {
  return listTypeDef(type).statuses;
}

function defaultStatusForType(type = state.activeListType) {
  return listTypeDef(type).defaultStatus;
}

function statusIsValidForType(status, type = state.activeListType) {
  return statusDefsFor(type).some((entry) => entry.id === status && entry.id !== "all");
}

function activeStatusLabel() {
  const found = statusDefsFor().find((status) => status.id === state.statusFilter);
  return found ? found.label : "All";
}

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem("shopping-list-settings") || "{}");
    state.settings = {
      ...defaultSettings,
      defaultCurrency: normalizeDefaultCurrency(parsed.defaultCurrency),
      theme: parsed.theme === "dark" || parsed.darkMode === true ? "dark" : "light",
      viewMode: parsed.viewMode === "images" ? "images" : "details",
      serverUrl: normalizeServerUrl(parsed.serverUrl)
    };
  } catch {
    state.settings = { ...defaultSettings };
  }
  if (state.isDesktopApp && state.settings.serverUrl) {
    state.settings.serverUrl = "";
    persistSettings();
  }
  applySettings();
}

function openSettingsModal() {
  closeMobileNav();
  els.defaultCurrencyInput.value = state.settings.defaultCurrency;
  els.serverUrlInput.value = state.settings.serverUrl;
  els.syncInfoText.textContent = "Checking this device's sync URL...";
  els.storageInfoText.textContent = "Checking storage...";
  els.settingsModal.classList.remove("hidden");
  loadDeviceInfo();
  loadStorageInfo();
  setTimeout(() => els.defaultCurrencyInput.focus(), 0);
}

function openMobileNav() {
  document.body.classList.add("mobile-nav-open");
  els.mobileNavScrim.classList.remove("hidden");
}

function setupDesktopShell() {
  const params = new URLSearchParams(window.location.search);
  state.isDesktopApp = Boolean(window.shoppingListDesktop?.isDesktop || params.get("desktop") === "1");
  document.body.classList.toggle("desktop-app", state.isDesktopApp);
  els.desktopTitlebar.classList.toggle("hidden", !state.isDesktopApp);
}

function desktopWindowCommand(command) {
  const bridge = window.shoppingListDesktop;
  if (!bridge || typeof bridge[command] !== "function") return;
  bridge[command]();
}

async function undoHistory() {
  await runHistoryStep("undo");
}

async function redoHistory() {
  await runHistoryStep("redo");
}

async function runHistoryStep(direction) {
  if (state.historyBusy) return;
  const source = direction === "undo" ? state.undoStack : state.redoStack;
  const target = direction === "undo" ? state.redoStack : state.undoStack;
  const action = source.pop();
  if (!action) {
    showToast(direction === "undo" ? "Nothing to undo." : "Nothing to redo.", true);
    updateHistoryButtons();
    return;
  }

  state.historyBusy = true;
  updateHistoryButtons();
  try {
    const step = direction === "undo" ? action.undo : action.redo;
    const preferredProfileId = await applyHistoryAction(step);
    if (preferredProfileId) {
      state.activeProfileId = preferredProfileId;
      localStorage.setItem("shopping-list-active-profile", String(preferredProfileId));
    }
    closeModals();
    await loadState();
    target.push(action);
    showToast(`${direction === "undo" ? "Undid" : "Redid"} ${action.label}.`);
  } catch (error) {
    source.push(action);
    showToast(error.message || `Could not ${direction}.`, true);
  } finally {
    state.historyBusy = false;
    updateHistoryButtons();
  }
}

async function applyHistoryAction(step) {
  if (!step) return null;

  if (step.type === "delete-item") {
    await api(`/api/items/${step.item.id}`, { method: "DELETE" });
    return step.activeProfileId || null;
  }

  if (step.type === "restore-item") {
    await api(`/api/items/${step.item.id}/restore`, { method: "POST" });
    await api(`/api/items/${step.item.id}`, {
      method: "PUT",
      body: itemPayloadFromItem(step.item)
    });
    return step.activeProfileId || step.item.profileId || null;
  }

  if (step.type === "update-item") {
    await api(`/api/items/${step.item.id}`, {
      method: "PUT",
      body: itemPayloadFromItem(step.item)
    });
    return step.activeProfileId || step.item.profileId || null;
  }

  if (step.type === "delete-profile") {
    await api(`/api/profiles/${step.profile.id}`, { method: "DELETE" });
    return step.activeProfileId || null;
  }

  if (step.type === "restore-profile") {
    await api(`/api/profiles/${step.profile.id}/restore`, { method: "POST" });
    await api(`/api/profiles/${step.profile.id}`, {
      method: "PUT",
      body: profilePayloadFromProfile(step.profile)
    });
    return step.activeProfileId || step.profile.id || null;
  }

  if (step.type === "update-profile") {
    await api(`/api/profiles/${step.profile.id}`, {
      method: "PUT",
      body: profilePayloadFromProfile(step.profile)
    });
    return step.activeProfileId || step.profile.id || null;
  }

  return null;
}

function pushItemCreateHistory(item) {
  if (!item) return;
  const saved = cloneData(item);
  pushHistory({
    label: `adding ${saved.title || "item"}`,
    undo: { type: "delete-item", item: saved, activeProfileId: saved.profileId },
    redo: { type: "restore-item", item: saved, activeProfileId: saved.profileId }
  });
}

function pushItemUpdateHistory(before, after) {
  if (!before || !after || samePayload(itemPayloadFromItem(before), itemPayloadFromItem(after))) return;
  const previous = cloneData(before);
  const next = cloneData(after);
  pushHistory({
    label: `editing ${next.title || previous.title || "item"}`,
    undo: { type: "update-item", item: previous, activeProfileId: previous.profileId },
    redo: { type: "update-item", item: next, activeProfileId: next.profileId }
  });
}

function pushItemDeleteHistory(item) {
  if (!item) return;
  const saved = cloneData(item);
  pushHistory({
    label: `deleting ${saved.title || "item"}`,
    undo: { type: "restore-item", item: saved, activeProfileId: saved.profileId },
    redo: { type: "delete-item", item: saved, activeProfileId: saved.profileId }
  });
}

function pushItemRestoreHistory(item) {
  if (!item) return;
  const saved = cloneData(item);
  pushHistory({
    label: `restoring ${saved.title || "item"}`,
    undo: { type: "delete-item", item: saved, activeProfileId: saved.profileId },
    redo: { type: "restore-item", item: saved, activeProfileId: saved.profileId }
  });
}

function pushProfileCreateHistory(profile, previousActiveProfileId) {
  if (!profile) return;
  const saved = cloneData(profile);
  pushHistory({
    label: `adding ${saved.name || "profile"}`,
    undo: { type: "delete-profile", profile: saved, activeProfileId: previousActiveProfileId },
    redo: { type: "restore-profile", profile: saved, activeProfileId: saved.id }
  });
}

function pushProfileUpdateHistory(before, after) {
  if (!before || !after || samePayload(profilePayloadFromProfile(before), profilePayloadFromProfile(after))) return;
  const previous = cloneData(before);
  const next = cloneData(after);
  pushHistory({
    label: `editing ${next.name || previous.name || "profile"}`,
    undo: { type: "update-profile", profile: previous, activeProfileId: previous.id },
    redo: { type: "update-profile", profile: next, activeProfileId: next.id }
  });
}

function pushProfileDeleteHistory(profile, nextActiveProfileId) {
  if (!profile) return;
  const saved = cloneData(profile);
  pushHistory({
    label: `removing ${saved.name || "profile"}`,
    undo: { type: "restore-profile", profile: saved, activeProfileId: saved.id },
    redo: { type: "delete-profile", profile: saved, activeProfileId: nextActiveProfileId }
  });
}

function pushHistory(action) {
  if (state.historyBusy || !action) return;
  state.undoStack.push(action);
  if (state.undoStack.length > historyLimit) {
    state.undoStack.shift();
  }
  state.redoStack = [];
  updateHistoryButtons();
}

function updateHistoryButtons() {
  if (!els.desktopBackButton || !els.desktopForwardButton) return;
  const canUndo = state.undoStack.length > 0 && !state.historyBusy;
  const canRedo = state.redoStack.length > 0 && !state.historyBusy;
  els.desktopBackButton.disabled = !canUndo;
  els.desktopForwardButton.disabled = !canRedo;
  const undoLabel = state.undoStack.at(-1)?.label;
  const redoLabel = state.redoStack.at(-1)?.label;
  els.desktopBackButton.title = undoLabel ? `Undo ${undoLabel}` : "Undo";
  els.desktopForwardButton.title = redoLabel ? `Redo ${redoLabel}` : "Redo";
  els.desktopBackButton.setAttribute("aria-label", els.desktopBackButton.title);
  els.desktopForwardButton.setAttribute("aria-label", els.desktopForwardButton.title);
}

function itemPayloadFromItem(item) {
  return {
    profileId: item.profileId,
    listType: item.listType || "shopping",
    status: item.status || defaultStatusForType(item.listType || "shopping"),
    priority: Number(item.priority || 0),
    title: item.title || listTypeDef(item.listType).manualTitle,
    url: item.url || "",
    sourceDomain: item.sourceDomain || domainFromUrl(item.url) || "",
    imageUrl: item.imageUrl || "",
    priceAmount: item.priceAmount === undefined ? null : item.priceAmount,
    currency: normalizeCurrency(item.currency || state.settings.defaultCurrency),
    tags: item.tags || [],
    description: item.description || "",
    notes: item.notes || "",
    orderStatus: item.orderStatus || "",
    carrier: item.carrier || "",
    trackingNumber: item.trackingNumber || "",
    trackingUrl: item.trackingUrl || "",
    orderedAt: item.orderedAt || "",
    estimatedDelivery: item.estimatedDelivery || "",
    orderNotes: item.orderNotes || ""
  };
}

function profilePayloadFromProfile(profile) {
  return {
    name: profile.name || "New profile",
    avatarUrl: profile.avatarUrl || "",
    accent: profile.accent || "#b89d6b",
    railLight: profile.railLight || "#3f4e57",
    railDark: profile.railDark || "#20282d"
  };
}

function samePayload(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function cloneData(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function updateDesktopTitlebar() {
  if (!state.isDesktopApp) return;
  const profile = activeProfile();
  els.desktopTitleText.textContent = profile ? profile.name : "Listy";
}

function scrollTags(direction) {
  const amount = Math.max(240, Math.floor(els.tagTabs.clientWidth * 0.9));
  els.tagTabs.scrollBy({ left: direction * amount, behavior: "smooth" });
}

function handleTagWheel(event) {
  if (els.tagTabs.scrollWidth <= els.tagTabs.clientWidth) return;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta) return;
  event.preventDefault();
  els.tagTabs.scrollLeft += delta * 4;
}

function updateTagScrollButtons() {
  if (!els.tagTabs || !els.tagScrollLeftButton || !els.tagScrollRightButton) return;
  const hasOverflow = els.tagTabs.scrollWidth > els.tagTabs.clientWidth + 2;
  els.tagTabs.closest(".tag-strip")?.classList.toggle("tags-overflow", hasOverflow);
  els.tagScrollLeftButton.classList.toggle("hidden", !hasOverflow);
  els.tagScrollRightButton.classList.toggle("hidden", !hasOverflow);
}

function updateProductScrollIndicator() {
  if (!els.productScrollIndicator || !els.productGrid) return;

  const documentElement = document.documentElement;
  const documentHeight = Math.max(documentElement.scrollHeight, document.body.scrollHeight);
  const maxScroll = documentHeight - window.innerHeight;
  const hasItems = Boolean(els.productGrid.querySelector(".product-card"));
  if (maxScroll <= 4 || !hasItems) {
    els.productScrollIndicator.classList.add("hidden");
    els.productScrollIndicator.classList.remove("visible");
    return;
  }

  const gridRect = els.productGrid.getBoundingClientRect();
  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  const titlebarOffset = state.isDesktopApp ? Number.parseFloat(getComputedStyle(documentElement).getPropertyValue("--desktop-titlebar-height")) || 0 : 0;
  const trackTop = Math.max(gridRect.top + 10, titlebarOffset + 14);
  const trackBottom = Math.min(gridRect.bottom - 10, window.innerHeight - (isMobile ? 84 : 18));
  const trackHeight = trackBottom - trackTop;

  if (trackHeight < 72 || gridRect.bottom <= titlebarOffset || gridRect.top >= window.innerHeight) {
    els.productScrollIndicator.classList.add("hidden");
    els.productScrollIndicator.classList.remove("visible");
    return;
  }

  const thumbHeight = Math.min(26, Math.max(18, trackHeight * (window.innerHeight / documentHeight)));
  const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
  const top = trackTop + (trackHeight - thumbHeight) * progress;
  const left = Math.max(gridRect.left + 8, Math.min(gridRect.right - 11, window.innerWidth - 12));

  els.productScrollIndicator.style.left = `${left}px`;
  els.productScrollIndicator.style.top = `${top}px`;
  els.productScrollIndicator.style.height = `${thumbHeight}px`;
  els.productScrollIndicator.classList.remove("hidden");
  els.productScrollIndicator.classList.add("visible");
}

function openFaqModal() {
  closeMobileNav();
  els.faqModal.classList.remove("hidden");
}

function exportCurrentCart() {
  const profile = activeProfile();
  const def = activeListTypeDef();
  const items = currentProfileItems();
  if (!profile || !items.length) {
    showToast(`There is nothing to export from ${def.label}.`, true);
    return;
  }

  const headers = [
    "Title",
    "List",
    "Status",
    def.priceLabel,
    "Currency",
    "Tags",
    "Site",
    "URL",
    "Description",
    "Notes",
    "Order status",
    "Carrier",
    "Tracking number",
    "Estimated delivery"
  ];
  const rows = items.map((item) => [
    item.title,
    listTypeDef(item.listType).label,
    item.status,
    item.priceAmount ?? "",
    item.currency || state.settings.defaultCurrency,
    (item.tags || []).join(", "),
    item.sourceDomain || domainFromUrl(item.url) || "",
    item.url || "",
    item.description || "",
    item.notes || "",
    item.orderStatus || "",
    item.carrier || "",
    item.trackingNumber || "",
    item.estimatedDelivery || ""
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const name = `${slug(profile.name || "tracklist")}-${slug(def.label)}-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadTextFile(name, csv, "text/csv;charset=utf-8");
  showToast(`Exported ${items.length} item${items.length === 1 ? "" : "s"}.`);
}

async function exportSyncBundle() {
  setBusy(els.exportSyncBundleButton, true);
  try {
    const bundle = await api("/api/sync/bundle");
    const deviceName = slug(bundle.device?.name || "pc");
    const date = new Date().toISOString().slice(0, 10);
    downloadTextFile(
      `tracklist-sync-${deviceName}-${date}.json`,
      JSON.stringify(bundle, null, 2),
      "application/json;charset=utf-8"
    );
    showToast("Sync bundle exported.");
  } catch (error) {
    showToast(error.message || "Could not export sync bundle.", true);
  } finally {
    setBusy(els.exportSyncBundleButton, false);
  }
}

async function importSyncBundleFile(event) {
  const [file] = Array.from(event.target.files || []);
  if (!file) return;
  setBusy(els.importSyncBundleButton, true);
  try {
    const text = await file.text();
    const bundle = JSON.parse(text);
    const result = await api("/api/sync/import", { method: "POST", body: bundle });
    await loadState();
    await loadStorageInfo();
    showToast(`Imported ${result.changedCount || 0} sync change${result.changedCount === 1 ? "" : "s"} from ${result.remoteDevice?.name || "another device"}.`);
  } catch (error) {
    showToast(error.message || "Could not import that sync bundle.", true);
  } finally {
    setBusy(els.importSyncBundleButton, false);
  }
}

async function syncWithBluetooth() {
  if (window.shoppingListDesktop?.nativeBluetoothSync) {
    await syncWithNativeBluetooth();
    return;
  }
  await syncWithWebBluetooth();
}

async function syncWithNativeBluetooth() {
  if (state.bluetoothBusy) return;
  const runId = state.bluetoothRunId + 1;
  state.bluetoothRunId = runId;
  state.bluetoothBusy = true;
  state.bluetoothCancelRequested = false;
  state.bluetoothDevice = null;
  state.bluetoothCandidates = [];
  hideBluetoothDeviceChooser();
  updateBluetoothControls();
  setBusy(els.bluetoothSyncButton, true);
  setBluetoothStatus("Start Bluetooth sync on Android, wait for Ready, then keep the phone nearby.");

  const unsubscribe = window.shoppingListDesktop.onNativeBluetoothStatus?.((payload = {}) => {
    if (isBluetoothRunActive(runId)) {
      setBluetoothStatus(payload.message || "");
    }
  });

  try {
    const pcBundle = await api("/api/sync/bundle");
    const result = await withTimeout(
      window.shoppingListDesktop.nativeBluetoothSync(JSON.stringify(pcBundle)),
      bluetoothSync.timeoutMs + bluetoothSync.connectTimeoutMs + bluetoothSync.setupTimeoutMs,
      "Native Bluetooth sync timed out."
    );
    if (!isBluetoothRunActive(runId)) return;
    const phoneBundleText = result?.phoneBundle || "";
    if (!phoneBundleText) {
      throw new Error("Bluetooth finished but did not return Android changes.");
    }
    const phoneBundle = JSON.parse(phoneBundleText);
    setBluetoothStatus(`Importing Android changes from ${phoneBundle.device?.name || "Android phone"}...`);
    const importResult = await api("/api/sync/import", { method: "POST", body: phoneBundle });
    if (!isBluetoothRunActive(runId)) return;
    await loadState();
    await loadStorageInfo();
    setBluetoothStatus("Bluetooth sync finished.");
    showToast(`Bluetooth synced ${importResult.changedCount || 0} Android change(s).`);
  } catch (error) {
    if (!isBluetoothRunActive(runId)) return;
    const message = state.bluetoothCancelRequested ? "Bluetooth phone disconnected." : friendlyBluetoothError(error);
    setBluetoothStatus(message);
    if (!state.bluetoothCancelRequested) {
      showToast(message, true);
    }
  } finally {
    if (typeof unsubscribe === "function") {
      unsubscribe();
    }
    if (isBluetoothRunActive(runId)) {
      resetBluetoothUi();
    }
  }
}

async function syncWithWebBluetooth() {
  if (state.bluetoothBusy) return;
  const runId = state.bluetoothRunId + 1;
  state.bluetoothRunId = runId;
  state.bluetoothBusy = true;
  state.bluetoothCancelRequested = false;
  state.bluetoothDevice = null;
  state.bluetoothCandidates = [];
  hideBluetoothDeviceChooser();
  updateBluetoothControls();
  setBusy(els.bluetoothSyncButton, true);
  setBluetoothStatus("Start Bluetooth sync mode on Android, wait for Ready, then choose the Listy device here.");

  let device;
  let completed = false;
  try {
    if (!navigator.bluetooth) {
      throw new Error("Bluetooth is not available in this desktop app build.");
    }
    if (typeof navigator.bluetooth.getAvailability === "function") {
      const available = await navigator.bluetooth.getAvailability();
      if (!available) {
        throw new Error("Bluetooth is turned off or unavailable on this PC.");
      }
    }

    setBluetoothStatus("Searching for the Android Listy sync service...");
    device = await withTimeout(
      navigator.bluetooth.requestDevice({
        filters: [{ services: [bluetoothSync.serviceUuid] }],
        optionalServices: [bluetoothSync.serviceUuid]
      }),
      bluetoothSync.connectTimeoutMs,
      "Could not see the Android Listy sync service. On Android, open Settings > Bluetooth sync and wait until it says Ready."
    );
    if (!isBluetoothRunActive(runId)) {
      disconnectBluetoothDevice(device);
      return;
    }
    state.bluetoothDevice = device;
    updateBluetoothControls();

    const deviceName = device.name || "Android phone";
    setBluetoothStatus(`${deviceName} selected. Connecting...`);
    device.addEventListener("gattserverdisconnected", () => {
      if (state.bluetoothBusy && !completed) {
        setBluetoothStatus("Bluetooth disconnected before sync finished.");
        updateBluetoothControls();
      }
    }, { once: true });
    let server = await connectBluetoothGatt(device, runId, deviceName);
    if (!isBluetoothRunActive(runId)) {
      disconnectBluetoothDevice(device);
      return;
    }
    setBluetoothStatus("Connected. Finding the Listy sync service...");
    const channel = await getListyBluetoothService(device, server, deviceName, runId);
    server = channel.server;
    const service = channel.service;
    if (!isBluetoothRunActive(runId)) {
      disconnectBluetoothDevice(device);
      return;
    }
    setBluetoothStatus("Sync service found. Opening send and receive channels...");
    const rx = await withTimeout(
      service.getCharacteristic(bluetoothSync.rxUuid),
      bluetoothSync.setupTimeoutMs,
      "Bluetooth connected, but the phone did not expose the send channel."
    );
    const tx = await withTimeout(
      service.getCharacteristic(bluetoothSync.txUuid),
      bluetoothSync.setupTimeoutMs,
      "Bluetooth connected, but the phone did not expose the receive channel."
    );
    const link = await withTimeout(
      createBluetoothBundleLink(rx, tx),
      bluetoothSync.setupTimeoutMs,
      "Bluetooth connected, but notification setup did not finish."
    );
    if (!isBluetoothRunActive(runId)) {
      disconnectBluetoothDevice(device);
      return;
    }

    setBluetoothStatus("Pulling Android changes...");
    const phoneBundleText = await link.pullBundle((received) => {
      setBluetoothStatus(`Receiving Android bundle (${formatBytes(received)})...`);
    });
    if (!isBluetoothRunActive(runId)) {
      disconnectBluetoothDevice(device);
      return;
    }
    const phoneBundle = JSON.parse(phoneBundleText);
    const importResult = await api("/api/sync/import", { method: "POST", body: phoneBundle });
    if (!isBluetoothRunActive(runId)) {
      disconnectBluetoothDevice(device);
      return;
    }

    setBluetoothStatus(`Imported ${importResult.changedCount || 0} Android change(s). Sending this PC's bundle...`);
    const pcBundle = await api("/api/sync/bundle");
    await link.pushBundle(JSON.stringify(pcBundle), (sent, total) => {
      setBluetoothStatus(`Sending PC bundle (${formatBytes(sent)} / ${formatBytes(total)})...`);
    });
    if (!isBluetoothRunActive(runId)) {
      disconnectBluetoothDevice(device);
      return;
    }

    if (device.gatt.connected) {
      completed = true;
      device.gatt.disconnect();
    }
    await loadState();
    await loadStorageInfo();
    setBluetoothStatus("Bluetooth sync finished.");
    showToast(`Bluetooth synced with ${phoneBundle.device?.name || deviceName}.`);
  } catch (error) {
    if (!isBluetoothRunActive(runId)) {
      disconnectBluetoothDevice(device);
      return;
    }
    const message = state.bluetoothCancelRequested ? "Bluetooth phone disconnected." : friendlyBluetoothError(error);
    if (!state.bluetoothCancelRequested && /service was not found|did not expose/i.test(message)) {
      await forgetBluetoothDevice(device);
    }
    setBluetoothStatus(message);
    if (!state.bluetoothCancelRequested) {
      showToast(message, true);
    }
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }
  } finally {
    if (isBluetoothRunActive(runId)) {
      resetBluetoothUi();
    }
  }
}

function isBluetoothRunActive(runId) {
  return state.bluetoothRunId === runId;
}

function withTimeout(promise, ms, message) {
  let timeout;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error(message)), ms);
    })
  ]).finally(() => clearTimeout(timeout));
}

async function getListyBluetoothService(device, initialServer, deviceName, runId) {
  const startedAt = Date.now();
  const deadline = startedAt + bluetoothSync.setupTimeoutMs;
  let lastError = null;
  let server = initialServer;
  let refreshedConnection = false;

  while (Date.now() < deadline) {
    if (!isBluetoothRunActive(runId)) {
      throw new Error("Bluetooth sync was cancelled.");
    }
    try {
      const service = await server.getPrimaryService(bluetoothSync.serviceUuid);
      return { server, service };
    } catch (error) {
      if (!isBluetoothRunActive(runId)) {
        throw new Error("Bluetooth sync was cancelled.");
      }
      const listed = await findListedBluetoothService(server).catch(() => null);
      if (listed) {
        return { server, service: listed };
      }
      lastError = error;
      const raw = `${error?.name || ""} ${error?.message || ""}`;
      if (!/notfound|not found|service|gatt|networkerror/i.test(raw)) {
        throw error;
      }
      if (server.connected === false) {
        throw new Error("Bluetooth disconnected before the Listy sync service could be checked.");
      }
      if (!refreshedConnection && device?.gatt?.connected) {
        refreshedConnection = true;
        setBluetoothStatus("Connected, but the sync service was hidden. Refreshing Bluetooth connection...");
        disconnectBluetoothDevice(device);
        await delay(1800);
        if (!isBluetoothRunActive(runId)) {
          throw new Error("Bluetooth sync was cancelled.");
        }
        server = await withTimeout(
          device.gatt.connect(),
          bluetoothSync.connectTimeoutMs,
          "Bluetooth reconnected slowly. Stop Android sync, start it again, then retry from the PC."
        );
        await delay(900);
        continue;
      }
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      setBluetoothStatus(`Connected. Waiting for the Listy sync service (${elapsed}s)...`);
      await delay(bluetoothSync.serviceRetryMs);
    }
  }

  const name = deviceName || "the phone";
  const detail = lastError?.message ? ` Last Bluetooth message: ${lastError.message}` : "";
  throw new Error(
    `Bluetooth connected to ${name}, but the Listy sync service was not found. ` +
      "On Android, open Settings > Bluetooth sync and wait until it says Ready. If it already says Ready, turn Bluetooth off and on once, then retry from both apps. " +
      "If the Android app is older than this PC app, install the newest APK." +
      detail
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectBluetoothGatt(device, runId, deviceName) {
  const name = deviceName || "Android phone";
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (!isBluetoothRunActive(runId)) {
      throw new Error("Bluetooth sync was cancelled.");
    }
    try {
      if (device?.gatt?.connected) {
        return device.gatt;
      }
      setBluetoothStatus(`${name} selected. Opening Bluetooth connection (${attempt}/3)...`);
      return await withTimeout(
        device.gatt.connect(),
        bluetoothSync.connectTimeoutMs,
        `Bluetooth found ${name}, but Windows got stuck opening the connection.`
      );
    } catch (error) {
      lastError = error;
      if (!isBluetoothRunActive(runId)) {
        throw new Error("Bluetooth sync was cancelled.");
      }
      disconnectBluetoothDevice(device);
      if (attempt < 3) {
        setBluetoothStatus(`Bluetooth saw ${name}, but the connection dropped. Retrying (${attempt + 1}/3)...`);
        await delay(900 * attempt);
      }
    }
  }
  const detail = lastError?.message ? ` Last Bluetooth message: ${lastError.message}` : "";
  throw new Error(
    `Bluetooth found ${name}, but Windows could not open the connection after 3 tries. ` +
      "Keep the Android Bluetooth sync window open on Ready, keep the phone unlocked, and turn Bluetooth off and on once on both devices if it repeats." +
      detail
  );
}

async function findListedBluetoothService(server) {
  if (typeof server.getPrimaryServices !== "function") {
    return null;
  }
  const services = await server.getPrimaryServices(bluetoothSync.serviceUuid);
  return services.find((service) => normalizeBluetoothUuid(service.uuid) === bluetoothSync.serviceUuid) || null;
}

function normalizeBluetoothUuid(uuid) {
  return String(uuid || "").trim().toLowerCase();
}

function renderBluetoothDeviceChooser(payload = {}) {
  if (!state.bluetoothBusy) {
    return;
  }
  const devices = Array.isArray(payload.devices) ? payload.devices : [];
  state.bluetoothCandidates = devices;
  els.bluetoothDeviceChooser.classList.remove("hidden");
  updateBluetoothControls();

  if (!devices.length) {
    els.bluetoothDeviceList.innerHTML = '<p class="muted">No Listy sync service found yet. Keep the Android sync window open until it says Ready.</p>';
    return;
  }

  els.bluetoothDeviceList.innerHTML = devices.map((device) => {
    const label = escapeHtml(device.name || "Unnamed Bluetooth device");
    const hint = "Listy sync device";
    return `
      <button class="bluetooth-device-option" type="button" data-bluetooth-device-id="${escapeHtml(device.id)}">
        <span>${label}</span>
        <small>${hint}</small>
      </button>
    `;
  }).join("");
}

function selectBluetoothCandidate(event) {
  const button = event.target.closest("[data-bluetooth-device-id]");
  if (!button) return;
  const deviceId = button.dataset.bluetoothDeviceId || "";
  const name = button.querySelector("span")?.textContent || "phone";
  hideBluetoothDeviceChooser();
  setBluetoothStatus(`${name} selected. Connecting...`);
  window.shoppingListDesktop?.selectBluetoothDevice?.(deviceId);
}

function cancelBluetoothSelection() {
  resetBluetoothUi("Bluetooth search cancelled.");
  hideBluetoothDeviceChooser();
  window.shoppingListDesktop?.cancelBluetoothSelection?.();
}

function disconnectBluetoothPhone() {
  const device = state.bluetoothDevice;
  resetBluetoothUi("Bluetooth disconnected. Press Bluetooth Sync to search again, or use PC link sync from Android.");
  window.shoppingListDesktop?.cancelBluetoothSelection?.();
  disconnectBluetoothDevice(device);
}

function disconnectBluetoothDevice(device) {
  if (!device?.gatt?.connected) {
    return;
  }
  try {
    device.gatt.disconnect();
  } catch {
    // The browser may already be closing the GATT link.
  }
}

async function forgetBluetoothDevice(device) {
  if (!device || typeof device.forget !== "function") {
    return;
  }
  try {
    await device.forget();
  } catch {
    // Some Electron/Chromium builds expose this API only behind flags.
  }
}

function hideBluetoothDeviceChooser() {
  els.bluetoothDeviceChooser.classList.add("hidden");
  els.bluetoothDeviceList.innerHTML = "";
}

function updateBluetoothControls() {
  const active = Boolean(state.bluetoothBusy || state.bluetoothDevice?.gatt?.connected || state.bluetoothCandidates.length);
  els.disconnectBluetoothButton.classList.toggle("hidden", !active);
  els.disconnectBluetoothButton.disabled = !active;
}

function resetBluetoothUi(message = "") {
  state.bluetoothRunId += 1;
  state.bluetoothBusy = false;
  state.bluetoothDevice = null;
  state.bluetoothCancelRequested = false;
  state.bluetoothCandidates = [];
  hideBluetoothDeviceChooser();
  setBusy(els.bluetoothSyncButton, false);
  if (message) {
    setBluetoothStatus(message);
  }
  updateBluetoothControls();
}

function friendlyBluetoothError(error) {
  const message = String(error?.message || error || "").trim();
  const name = String(error?.name || "");
  if (name === "NotFoundError" || /no device|user cancelled|user canceled|cancelled|canceled/i.test(message)) {
    return "Could not see the Android Listy sync service. Start Bluetooth sync on Android, wait until it says Ready, then try again.";
  }
  if (/bluetooth adapter|bluetooth is not available|turned off|unavailable/i.test(message)) {
    return "Bluetooth is turned off or unavailable on this PC.";
  }
  if (/got stuck connecting|did not expose|service was not found|notification setup|not requested Android changes|did not send its bundle|timed out/i.test(message)) {
    return `${message} If Bluetooth keeps failing, use PC link sync in the Android app settings with the Dev network URL shown here.`;
  }
  if (/after 3 tries|could not open the connection/i.test(message)) {
    return `${message} PC link sync is still available in the Android app settings while Windows Bluetooth is being unreliable.`;
  }
  if (/gatt|networkerror|connect|could not open/i.test(`${name} ${message}`)) {
    return `${message || "Bluetooth found the phone but could not connect."} Keep the Android sync window open on Ready, keep the phone unlocked, and retry after toggling Bluetooth off and on once. PC link sync is still available in the Android app settings.`;
  }
  return message || "Bluetooth sync failed.";
}

async function createBluetoothBundleLink(rx, tx) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let active = null;

  tx.addEventListener("characteristicvaluechanged", (event) => {
    if (!active) return;
    const frame = bytesFromDataView(event.target.value);
    const type = frame[0];
    const payload = frame.slice(1);

    if (type === bluetoothSync.error) {
      active.reject(new Error(decoder.decode(payload) || "The Android app reported a Bluetooth sync error."));
      active = null;
      return;
    }

    if (active.kind === "bundle") {
      if (type === bluetoothSync.bundleStart) {
        active.chunks = [];
        active.received = 0;
      } else if (type === bluetoothSync.bundleChunk) {
        active.chunks.push(payload);
        active.received += payload.length;
        active.onProgress(active.received);
      } else if (type === bluetoothSync.bundleDone) {
        const text = decoder.decode(joinBytes(active.chunks));
        active.resolve(text);
        active = null;
      }
      return;
    }

    if (active.kind === "ack" && type === bluetoothSync.ack) {
      active.resolve();
      active = null;
    }
  });

  await tx.startNotifications();

  return {
    pullBundle(onProgress) {
      return waitForBluetoothFrame("bundle", onProgress, () => writeBluetoothFrame(rx, bluetoothSync.pull));
    },
    async pushBundle(text, onProgress) {
      const bytes = encoder.encode(text);
      const ack = waitForBluetoothFrame("ack", () => {}, null);
      await writeBluetoothFrame(rx, bluetoothSync.pushStart);
      for (let offset = 0; offset < bytes.length; offset += bluetoothSync.chunkSize) {
        const chunk = bytes.slice(offset, offset + bluetoothSync.chunkSize);
        await writeBluetoothFrame(rx, bluetoothSync.pushChunk, chunk);
        onProgress(Math.min(offset + chunk.length, bytes.length), bytes.length);
      }
      await writeBluetoothFrame(rx, bluetoothSync.pushDone);
      return ack;
    }
  };

  function waitForBluetoothFrame(kind, onProgress, starter) {
    if (active) {
      return Promise.reject(new Error("Bluetooth sync is already waiting for data."));
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (active?.reject === reject) {
          active = null;
        }
        reject(new Error("Bluetooth sync timed out."));
      }, bluetoothSync.timeoutMs);
      active = {
        kind,
        chunks: [],
        received: 0,
        onProgress,
        resolve(value) {
          clearTimeout(timeout);
          resolve(value);
        },
        reject(error) {
          clearTimeout(timeout);
          reject(error);
        }
      };
      if (starter) {
        starter().catch((error) => {
          if (active?.reject) {
            active.reject(error);
            active = null;
          }
        });
      }
    });
  }
}

async function writeBluetoothFrame(characteristic, type, payload = new Uint8Array()) {
  const frame = new Uint8Array(1 + payload.length);
  frame[0] = type;
  frame.set(payload, 1);
  if (typeof characteristic.writeValueWithResponse === "function") {
    await characteristic.writeValueWithResponse(frame);
  } else {
    await characteristic.writeValue(frame);
  }
}

function bytesFromDataView(view) {
  return new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));
}

function joinBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function setBluetoothStatus(message) {
  if (els.bluetoothSyncStatus) {
    els.bluetoothSyncStatus.textContent = message || "";
  }
}

function downloadTextFile(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function slug(value) {
  const text = normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return text || "tracklist";
}

function closeMobileNav() {
  document.body.classList.remove("mobile-nav-open");
  els.mobileNavScrim.classList.add("hidden");
}

function bindMobileSwipeNav() {
  document.addEventListener("touchstart", handleMobileSwipeStart, { passive: true });
  document.addEventListener("touchmove", handleMobileSwipeMove, { passive: true });
  document.addEventListener("touchend", resetMobileSwipe, { passive: true });
  document.addEventListener("touchcancel", resetMobileSwipe, { passive: true });
}

function handleMobileSwipeStart(event) {
  const touch = event.touches?.[0];
  if (!touch || !canStartMobileSwipe()) {
    resetMobileSwipe();
    return;
  }

  mobileSwipe.startX = touch.clientX;
  mobileSwipe.startY = touch.clientY;
  mobileSwipe.tracking = true;
  mobileSwipe.opened = false;
}

function handleMobileSwipeMove(event) {
  if (!mobileSwipe.tracking || mobileSwipe.opened) return;

  const touch = event.touches?.[0];
  if (!touch) {
    resetMobileSwipe();
    return;
  }

  const deltaX = touch.clientX - mobileSwipe.startX;
  const deltaY = touch.clientY - mobileSwipe.startY;
  const mostlyHorizontal = Math.abs(deltaY) < 48 && deltaX > Math.abs(deltaY) * 1.35;
  if (deltaX > 72 && mostlyHorizontal) {
    openMobileNav();
    mobileSwipe.opened = true;
  }
}

function canStartMobileSwipe() {
  return (
    window.matchMedia("(max-width: 760px)").matches &&
    !document.body.classList.contains("mobile-nav-open") &&
    !document.querySelector(".modal-backdrop:not(.hidden)")
  );
}

function resetMobileSwipe() {
  mobileSwipe.tracking = false;
  mobileSwipe.opened = false;
}

async function loadDeviceInfo() {
  if (isStaticApiMode()) {
    state.pcLinkUrl = "";
    els.pcLinkUrlText.textContent = "Hosted browser storage";
    els.copyPcLinkUrlButton.disabled = true;
    els.syncInfoText.textContent = "This hosted version saves only in this browser. Use Export Sync Bundle and Import Sync Bundle to move data between devices.";
    return;
  }

  try {
    const info = await api("/api/device-info");
    const url = info.lanUrls?.[0];
    state.pcLinkUrl = url || "";
    els.pcLinkUrlText.textContent = state.pcLinkUrl || "No network URL found";
    els.copyPcLinkUrlButton.disabled = !state.pcLinkUrl;
    els.syncInfoText.textContent = url
      ? "Bluetooth Sync is primary. If Bluetooth fails, use Android Settings > PC link sync with this URL."
      : "Bluetooth Sync is primary. File bundle sync still works if no PC link URL is available.";
  } catch {
    state.pcLinkUrl = "";
    els.pcLinkUrlText.textContent = "No network URL found";
    els.copyPcLinkUrlButton.disabled = true;
    els.syncInfoText.textContent = "Bluetooth Sync is primary. Could not check the fallback PC link URL.";
  }
}

async function copyPcLinkUrl() {
  if (!state.pcLinkUrl) {
    showToast("No PC link URL is available yet.", true);
    return;
  }
  try {
    await navigator.clipboard.writeText(state.pcLinkUrl);
    showToast("PC link URL copied.");
  } catch {
    showToast(`PC link URL: ${state.pcLinkUrl}`);
  }
}

async function loadStorageInfo() {
  try {
    state.storageInfo = await api("/api/storage");
    els.storageInfoText.textContent = storageInfoLabel(state.storageInfo);
  } catch (error) {
    els.storageInfoText.textContent = error.message || "Could not check storage.";
  }
}

async function openBinModal() {
  closeMobileNav();
  await loadBin();
  els.binModal.classList.remove("hidden");
}

async function loadBin() {
  try {
    const data = await api("/api/bin");
    state.binItems = data.items || [];
    renderBin();
  } catch (error) {
    els.binList.replaceChildren(emptyManagementMessage(error.message || "Could not load Bin."));
  }
}

function renderBin() {
  els.binList.replaceChildren();
  if (!state.binItems.length) {
    els.binList.appendChild(emptyManagementMessage("The Bin is empty."));
    return;
  }

  for (const item of state.binItems) {
    const row = document.createElement("article");
    row.className = "management-row";

    const copy = document.createElement("div");
    copy.className = "management-copy";

    const title = document.createElement("strong");
    title.textContent = item.title || listTypeDef(item.listType).manualTitle;

    const meta = document.createElement("span");
    const profileName = item.profileName || state.profiles.find((profile) => profile.id === item.profileId)?.name || "Unknown profile";
    meta.textContent = `${profileName}'s profile | Deleted ${formatDateTime(item.deletedAt)}${item.sourceDomain ? ` from ${item.sourceDomain}` : ""}`;

    copy.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "management-row-actions";

    const restoreButton = document.createElement("button");
    restoreButton.className = "secondary-button";
    restoreButton.type = "button";
    restoreButton.textContent = "Restore";
    restoreButton.addEventListener("click", () => restoreBinItem(item.id));

    const purgeButton = document.createElement("button");
    purgeButton.className = "danger-button";
    purgeButton.type = "button";
    purgeButton.textContent = "Clear";
    purgeButton.addEventListener("click", () => purgeBinItem(item));

    actions.append(restoreButton, purgeButton);
    row.append(copy, actions);
    els.binList.appendChild(row);
  }
}

async function restoreBinItem(id) {
  const item = cloneData(state.binItems.find((entry) => entry.id === id));
  try {
    await api(`/api/items/${id}/restore`, { method: "POST" });
    await loadState();
    await loadBin();
    await loadStorageInfo();
    if (item) {
      pushItemRestoreHistory(item);
    }
    showToast("Item restored.");
  } catch (error) {
    showToast(error.message || "Could not restore item.", true);
  }
}

async function purgeBinItem(item) {
  if (!confirm(`Permanently clear details for ${item.title || "this item"}?`)) {
    return;
  }
  try {
    await api(`/api/items/${item.id}/purge`, { method: "DELETE" });
    await loadBin();
    await loadStorageInfo();
    showToast("Item details cleared.");
  } catch (error) {
    showToast(error.message || "Could not clear item.", true);
  }
}

async function openSyncHistoryModal() {
  closeMobileNav();
  await loadSyncHistory();
  els.syncHistoryModal.classList.remove("hidden");
}

async function loadSyncHistory() {
  try {
    const data = await api("/api/sync/history");
    state.syncHistory = data.changes || [];
    renderSyncHistory();
  } catch (error) {
    els.syncHistoryList.replaceChildren(emptyManagementMessage(error.message || "Could not load Sync History."));
  }
}

function renderSyncHistory() {
  els.syncHistoryList.replaceChildren();
  if (!state.syncHistory.length) {
    els.syncHistoryList.appendChild(emptyManagementMessage("No sync history yet."));
    return;
  }

  for (const change of state.syncHistory) {
    const row = document.createElement("article");
    row.className = "management-row";

    const copy = document.createElement("div");
    copy.className = "management-copy";

    const summary = document.createElement("strong");
    summary.textContent = change.summary;

    const meta = document.createElement("span");
    meta.textContent = `${change.deviceName} · ${change.operation} · ${formatDateTime(change.createdAt)}`;

    copy.append(summary, meta);
    row.appendChild(copy);
    els.syncHistoryList.appendChild(row);
  }
}

async function cleanupStorage() {
  setBusy(els.cleanupBinButton, true);
  try {
    const result = await api("/api/bin/cleanup", { method: "POST", body: {} });
    state.storageInfo = result.storage;
    els.storageInfoText.textContent = storageInfoLabel(result.storage);
    if (!els.binModal.classList.contains("hidden")) {
      await loadBin();
    }
    showToast(result.purgedItems ? `Cleaned ${result.purgedItems} old Bin item(s).` : "Nothing old enough to clean.");
  } catch (error) {
    showToast(error.message || "Could not clean storage.", true);
  } finally {
    setBusy(els.cleanupBinButton, false);
  }
}

async function compactDatabase() {
  setBusy(els.compactDatabaseButton, true);
  try {
    const result = await api("/api/maintenance/compact", { method: "POST" });
    state.storageInfo = result.storage;
    els.storageInfoText.textContent = storageInfoLabel(result.storage);
    showToast("Database compacted.");
  } catch (error) {
    showToast(error.message || "Could not compact database.", true);
  } finally {
    setBusy(els.compactDatabaseButton, false);
  }
}

function emptyManagementMessage(message) {
  const empty = document.createElement("p");
  empty.className = "muted management-empty";
  empty.textContent = message;
  return empty;
}

function saveSettings(event) {
  event.preventDefault();
  const previousServerUrl = state.settings.serverUrl;
  state.settings = {
    defaultCurrency: normalizeDefaultCurrency(els.defaultCurrencyInput.value),
    theme: state.settings.theme,
    viewMode: state.settings.viewMode,
    serverUrl: normalizeServerUrl(els.serverUrlInput.value)
  };
  persistSettings();
  closeModals();
  render();
  if (state.settings.serverUrl !== previousServerUrl) {
    loadState();
  }
  showToast("Settings saved.");
}

function applySettings() {
  document.title = "Listy";
  document.body.classList.toggle("dark-mode", state.settings.theme === "dark");
  syncThemeButton();
  syncViewButtons();
}

function toggleTheme() {
  state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
  persistSettings();
  render();
}

function setViewMode(mode) {
  state.settings.viewMode = mode === "images" ? "images" : "details";
  persistSettings();
  renderGrid();
  syncViewButtons();
}

function syncThemeButton() {
  if (!els.themeToggleButton) return;
  const isDark = state.settings.theme === "dark";
  els.themeToggleButton.textContent = isDark ? "\u2600" : "\u263e";
  els.themeToggleButton.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  els.themeToggleButton.title = isDark ? "Switch to light mode" : "Switch to dark mode";
}

function syncViewButtons() {
  if (!els.productGrid || !els.viewDetailsButton || !els.viewImagesButton) return;
  const imageMode = state.settings.viewMode === "images";
  els.productGrid.classList.toggle("image-view", imageMode);
  els.viewDetailsButton.classList.toggle("active", !imageMode);
  els.viewImagesButton.classList.toggle("active", imageMode);
  els.viewDetailsButton.setAttribute("aria-pressed", String(!imageMode));
  els.viewImagesButton.setAttribute("aria-pressed", String(imageMode));
}

function persistSettings() {
  localStorage.setItem("shopping-list-settings", JSON.stringify(state.settings));
}

function applyProfileTheme(profile) {
  const accent = profile?.accent || "#b89d6b";
  const rail = state.settings.theme === "dark"
    ? profile?.railDark || "#20282d"
    : profile?.railLight || "#3f4e57";
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent-dark", mixHex(accent, "#1f2829", 0.28));
  document.documentElement.style.setProperty("--accent-soft", rgbaFromHex(accent, 0.14));
  document.documentElement.style.setProperty("--accent-ring", rgbaFromHex(accent, 0.22));
  document.documentElement.style.setProperty("--accent-shadow", rgbaFromHex(accent, 0.28));
  document.body.style.setProperty("--rail", rail);
  document.body.style.setProperty("--rail-dark", mixHex(rail, "#070b0d", 0.2));
}

function splitTags(value) {
  const seen = new Set();
  const tags = [];
  for (const piece of String(value || "").split(",")) {
    const tag = piece.trim().replace(/\s+/g, " ");
    const key = normalize(tag);
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

function mergeTags(current, next) {
  return splitTags([current, ...(next || [])].join(","));
}

function sumPrices(items) {
  return Number(
    items
      .filter((item) => item.priceAmount !== null && item.priceAmount !== undefined)
      .reduce((sum, item) => sum + Number(item.priceAmount || 0), 0)
      .toFixed(2)
  );
}

function formatPrice(value, currency = "EUR") {
  try {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: normalizeCurrency(currency)
    }).format(Number(value || 0));
  } catch {
    return `${normalizeCurrency(currency)} ${Number(value || 0).toFixed(2)}`;
  }
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(date);
}

function formatDateTime(value) {
  if (!value) return "unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function storageInfoLabel(info) {
  if (!info) return "Storage unavailable.";
  return [
    `${formatBytes(info.databaseBytes)} database`,
    `${info.binCount || 0} in Bin`,
    `${info.tombstoneCount || 0} sync tombstone(s)`,
    `${info.syncChangeCount || 0} sync change(s)`,
    `${info.binRetentionDays || 30} day Bin cleanup`
  ].join(" · ");
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function initials(value) {
  const words = String(value || "Item")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (words[0]?.[0] || "I").toUpperCase() + (words[1]?.[0] || "").toUpperCase();
}

function normalizeCurrency(value) {
  const currency = String(value || defaultSettings.defaultCurrency).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : defaultSettings.defaultCurrency;
}

function normalizeDefaultCurrency(value) {
  const currency = normalizeCurrency(value);
  return currencyOptions.includes(currency) ? currency : defaultSettings.defaultCurrency;
}

function normalizeServerUrl(value) {
  const text = String(value || "").trim().replace(/\/+$/, "");
  if (!text) {
    return "";
  }
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.href.replace(/\/+$/, "") : "";
  } catch {
    return "";
  }
}

function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (state.isDesktopApp) {
    return path;
  }
  const base = String(window.SHOPPING_LIST_API_BASE || state.settings.serverUrl || "").trim().replace(/\/+$/, "");
  return base ? `${base}${path}` : path;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeHex(value) {
  const token = String(value || "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(token) ? token : "";
}

function mixHex(hex, targetHex, amount) {
  const source = hexToRgb(hex) || hexToRgb("#b89d6b") || { r: 184, g: 157, b: 107 };
  const target = hexToRgb(targetHex) || { r: 31, g: 40, b: 41 };
  return rgbToHex({
    r: Math.round(source.r + (target.r - source.r) * amount),
    g: Math.round(source.g + (target.g - source.g) * amount),
    b: Math.round(source.b + (target.b - source.b) * amount)
  });
}

function rgbaFromHex(hex, alpha) {
  const rgb = hexToRgb(hex) || { r: 184, g: 157, b: 107 };
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function hexToRgb(hex) {
  const match = String(hex || "").trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match) {
    return null;
  }
  const value = Number.parseInt(match[1], 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, previous + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = old;
    }
    row[0] = i;
  }
  return row[b.length];
}

function domainFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setFormMessage(element, text, isError = false) {
  element.textContent = text;
  element.classList.toggle("error", Boolean(isError));
}

function setBusy(element, isBusy) {
  if (element instanceof HTMLButtonElement) {
    element.disabled = isBusy;
    return;
  }
  for (const field of element.querySelectorAll("button, input, select, textarea")) {
    field.disabled = isBusy;
  }
}

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " toast-error" : ""}`;
  toast.setAttribute("role", isError ? "alert" : "status");

  const copy = document.createElement("span");
  copy.className = "toast-message";
  copy.textContent = message;
  toast.appendChild(copy);

  if (isError) {
    const close = document.createElement("button");
    close.className = "toast-close";
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss message");
    close.textContent = "x";
    close.addEventListener("click", () => toast.remove());
    toast.appendChild(close);
  }

  getToastStack().appendChild(toast);
  if (!isError) {
    setTimeout(() => toast.remove(), 3600);
  }
}

function getToastStack() {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  return stack;
}
