/**
 * Fabaceae Seed Tier Maker - Application Logic
 * Drag & Drop, State Management, Custom Tiers, Presets & Export
 */

(function () {
  'use strict';

  // Available Tier Colors Palette
  const TIER_COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#64748b', // Slate
    '#78350f'  // Brown
  ];

  // Preset Configurations
  const PRESETS = {
    classic: [
      { id: 'tier_s', name: 'S', color: '#ef4444' },
      { id: 'tier_a', name: 'A', color: '#f97316' },
      { id: 'tier_b', name: 'B', color: '#f59e0b' },
      { id: 'tier_c', name: 'C', color: '#10b981' },
      { id: 'tier_d', name: 'D', color: '#3b82f6' }
    ],
    color: [
      { id: 'tier_red', name: 'Red & Bicolor', color: '#ef4444' },
      { id: 'tier_black', name: 'Jet Black', color: '#334155' },
      { id: 'tier_brown', name: 'Chestnut & Brown', color: '#78350f' },
      { id: 'tier_yellow', name: 'Amber & Yellow', color: '#f59e0b' },
      { id: 'tier_grey', name: 'Porcelain Grey', color: '#64748b' },
      { id: 'tier_olive', name: 'Olive & Green', color: '#65a30d' }
    ],
    shape: [
      { id: 'tier_round', name: 'Spherical (Round)', color: '#3b82f6' },
      { id: 'tier_flat', name: 'Flat Discs / Wafers', color: '#ec4899' },
      { id: 'tier_elongated', name: 'Elongated Cylinders', color: '#f97316' },
      { id: 'tier_kidney', name: 'Kidney-shaped (Reniform)', color: '#8b5cf6' },
      { id: 'tier_plump', name: 'Plump Biconvex', color: '#10b981' }
    ],
    size: [
      { id: 'tier_macro', name: 'Very Large (>15mm)', color: '#ef4444' },
      { id: 'tier_large', name: 'Large (10-15mm)', color: '#f97316' },
      { id: 'tier_medium', name: 'Medium (6-10mm)', color: '#10b981' },
      { id: 'tier_small', name: 'Small (<6mm)', color: '#06b6d4' }
    ],
    custom: [
      { id: 'tier_1', name: 'Group 1', color: '#ef4444' },
      { id: 'tier_2', name: 'Group 2', color: '#f97316' },
      { id: 'tier_3', name: 'Group 3', color: '#f59e0b' }
    ]
  };

  // State
  let state = {
    tiers: [],
    // Map of tierId -> Array of seed IDs
    tierAssignments: {},
    activeFilter: 'all',
    searchQuery: '',
    cardSize: 'normal'
  };

  // Seed Map for instant O(1) lookup
  const seedMap = new Map();
  if (typeof SEED_DATA !== 'undefined' && Array.isArray(SEED_DATA)) {
    SEED_DATA.forEach(s => seedMap.set(s.id, s));
  }

  // DOM Elements
  const tierBoardEl = document.getElementById('tierBoard');
  const seedPoolEl = document.getElementById('seedPool');
  const poolCountBadge = document.getElementById('poolCountBadge');
  const seedSearchInput = document.getElementById('seedSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const filterChips = document.querySelectorAll('.chip');
  const templatePresetSelect = document.getElementById('templatePreset');
  const applyPresetBtn = document.getElementById('applyPresetBtn');
  const addTierTopBtn = document.getElementById('addTierTopBtn');
  const addTierBottomBtn = document.getElementById('addTierBottomBtn');
  const exportImageBtn = document.getElementById('exportImageBtn');
  const shareCodeBtn = document.getElementById('shareCodeBtn');
  const importCodeBtn = document.getElementById('importCodeBtn');
  const resetAllBtn = document.getElementById('resetAllBtn');
  const sizeBtns = document.querySelectorAll('.size-btn');
  const toastEl = document.getElementById('toastNotification');

  // Modal Elements - Detail
  const modalEl = document.getElementById('seedDetailModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalImg = document.getElementById('modalImg');
  const modalSeedNumber = document.getElementById('modalSeedNumber');
  const modalSeedName = document.getElementById('modalSeedName');
  const modalColorTag = document.getElementById('modalColorTag');
  const modalShapeTag = document.getElementById('modalShapeTag');
  const modalSizeTag = document.getElementById('modalSizeTag');
  const modalFlatTag = document.getElementById('modalFlatTag');
  const modalSeedTraits = document.getElementById('modalSeedTraits');
  const modalMoveSelect = document.getElementById('modalMoveSelect');
  const modalMoveConfirmBtn = document.getElementById('modalMoveConfirmBtn');

  // Modal Elements - Share & Import
  const shareModal = document.getElementById('shareModal');
  const closeShareModalBtn = document.getElementById('closeShareModalBtn');
  const shareCodeOutput = document.getElementById('shareCodeOutput');
  const copyCodeBtn = document.getElementById('copyCodeBtn');
  const shareSummaryBadges = document.getElementById('shareSummaryBadges');

  const importModal = document.getElementById('importModal');
  const closeImportModalBtn = document.getElementById('closeImportModalBtn');
  const importCodeInput = document.getElementById('importCodeInput');
  const applyImportBtn = document.getElementById('applyImportBtn');
  const importErrorMsg = document.getElementById('importErrorMsg');

  let activeModalSeedId = null;
  let draggedCard = null;
  let dragSourceTierId = null;

  // =========================================================================
  // Initialization & LocalStorage
  // =========================================================================
  function init() {
    loadSavedState();
    setupEventListeners();
    renderAll();
  }

  function loadSavedState() {
    const saved = localStorage.getItem('seed_tier_maker_state_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.tiers && Array.isArray(parsed.tiers) && parsed.tiers.length > 0) {
          state.tiers = parsed.tiers;
          state.tierAssignments = parsed.tierAssignments || {};
          state.cardSize = parsed.cardSize || 'normal';
          applyCardSize(state.cardSize);
          return;
        }
      } catch (e) {
        console.warn('Failed to parse saved state, using default', e);
      }
    }
    // Default preset
    loadPreset('color');
  }

  function saveState() {
    try {
      localStorage.setItem('seed_tier_maker_state_v1', JSON.stringify({
        tiers: state.tiers,
        tierAssignments: state.tierAssignments,
        cardSize: state.cardSize
      }));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }

  function loadPreset(presetKey) {
    const template = PRESETS[presetKey] || PRESETS.classic;
    state.tiers = template.map(t => ({ ...t }));
    state.tierAssignments = {};
    state.tiers.forEach(t => {
      state.tierAssignments[t.id] = [];
    });
    saveState();
  }

  // =========================================================================
  // Rendering
  // =========================================================================
  function renderAll() {
    renderTierBoard();
    renderPool();
    updatePoolCount();
  }

  function renderTierBoard() {
    tierBoardEl.innerHTML = '';

    state.tiers.forEach((tier, index) => {
      const row = document.createElement('div');
      row.className = 'tier-row';
      row.dataset.tierId = tier.id;

      // 1. Label Column
      const labelCol = document.createElement('div');
      labelCol.className = 'tier-label-col';
      labelCol.style.backgroundColor = tier.color;

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'tier-name-input';
      nameInput.value = tier.name;
      nameInput.title = 'Click to edit tier name';
      nameInput.addEventListener('change', (e) => {
        tier.name = e.target.value.trim() || 'Untitled';
        saveState();
      });
      nameInput.addEventListener('click', (e) => e.stopPropagation());

      const countBadge = document.createElement('span');
      countBadge.className = 'tier-item-count';
      const assignedCount = (state.tierAssignments[tier.id] || []).length;
      countBadge.textContent = `${assignedCount}`;

      // Hidden native color picker
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'tier-color-input';
      colorInput.value = tier.color;
      colorInput.addEventListener('input', (e) => {
        tier.color = e.target.value;
        labelCol.style.backgroundColor = tier.color;
        saveState();
      });

      labelCol.addEventListener('dblclick', () => {
        colorInput.click();
      });

      labelCol.appendChild(nameInput);
      labelCol.appendChild(countBadge);
      labelCol.appendChild(colorInput);

      // 2. Dropzone Column
      const dropzone = document.createElement('div');
      dropzone.className = 'tier-dropzone';
      dropzone.dataset.tierId = tier.id;
      setupDropzoneEvents(dropzone);

      // Populate assigned cards
      const assignedIds = state.tierAssignments[tier.id] || [];
      assignedIds.forEach(seedId => {
        const seed = seedMap.get(seedId);
        if (seed) {
          const card = createSeedCard(seed, true);
          dropzone.appendChild(card);
        }
      });

      // 3. Controls Column
      const controlsCol = document.createElement('div');
      controlsCol.className = 'tier-controls-col';

      // Move Up
      const upBtn = document.createElement('button');
      upBtn.className = 'tier-btn';
      upBtn.innerHTML = '▲';
      upBtn.title = 'Move tier up';
      upBtn.disabled = index === 0;
      upBtn.addEventListener('click', () => moveTier(index, -1));

      // Move Down
      const downBtn = document.createElement('button');
      downBtn.className = 'tier-btn';
      downBtn.innerHTML = '▼';
      downBtn.title = 'Move tier down';
      downBtn.disabled = index === state.tiers.length - 1;
      downBtn.addEventListener('click', () => moveTier(index, 1));

      // Color Cycle
      const colorBtn = document.createElement('button');
      colorBtn.className = 'tier-btn';
      colorBtn.innerHTML = '🎨';
      colorBtn.title = 'Change color (or double-click tier label)';
      colorBtn.addEventListener('click', () => {
        const nextColor = getNextColor(tier.color);
        tier.color = nextColor;
        labelCol.style.backgroundColor = nextColor;
        colorInput.value = nextColor;
        saveState();
      });

      // Clear Tier Items to Pool
      const clearBtn = document.createElement('button');
      clearBtn.className = 'tier-btn';
      clearBtn.innerHTML = '↺';
      clearBtn.title = 'Return all photos in this tier to pool';
      clearBtn.addEventListener('click', () => clearTier(tier.id));

      // Delete Tier
      const delBtn = document.createElement('button');
      delBtn.className = 'tier-btn btn-delete';
      delBtn.innerHTML = '✕';
      delBtn.title = 'Delete tier';
      delBtn.addEventListener('click', () => deleteTier(tier.id));

      controlsCol.appendChild(upBtn);
      controlsCol.appendChild(downBtn);
      controlsCol.appendChild(colorBtn);
      controlsCol.appendChild(clearBtn);
      controlsCol.appendChild(delBtn);

      row.appendChild(labelCol);
      row.appendChild(dropzone);
      row.appendChild(controlsCol);
      tierBoardEl.appendChild(row);
    });
  }

  function renderPool() {
    seedPoolEl.innerHTML = '';

    // Collect all assigned seed IDs
    const assignedSet = new Set();
    Object.values(state.tierAssignments).forEach(arr => {
      arr.forEach(id => assignedSet.add(id));
    });

    // Filter unassigned seeds
    const unassigned = [];
    seedMap.forEach((seed, id) => {
      if (!assignedSet.has(id)) {
        if (matchesSearchAndFilter(seed)) {
          unassigned.push(seed);
        }
      }
    });

    unassigned.forEach(seed => {
      const card = createSeedCard(seed, false);
      seedPoolEl.appendChild(card);
    });
  }

  function matchesSearchAndFilter(seed) {
    // Filter chip check
    if (state.activeFilter !== 'all') {
      const f = state.activeFilter.toLowerCase();
      const col = seed.color.toLowerCase();
      const shp = seed.shape.toLowerCase();
      const sz = seed.size.toLowerCase();

      if (f === 'red' && !col.includes('red') && !col.includes('scarlet')) return false;
      if (f === 'black' && !col.includes('black') && !col.includes('charcoal')) return false;
      if (f === 'brown' && !col.includes('brown') && !col.includes('chestnut') && !col.includes('tan')) return false;
      if (f === 'round' && !shp.includes('round') && !shp.includes('spherical') && !shp.includes('globose')) return false;
      if (f === 'flat' && !seed.flatness.toLowerCase().includes('flat') && !shp.includes('flat') && !shp.includes('disc')) return false;
      if (f === 'large' && !sz.includes('large') && !sz.includes('macro')) return false;
      if (f === 'small' && !sz.includes('small') && !sz.includes('micro')) return false;
    }

    // Search query check
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const name = seed.name.toLowerCase();
      const col = seed.color.toLowerCase();
      const shp = seed.shape.toLowerCase();
      const traits = seed.traits.toLowerCase();
      if (!name.includes(q) && !col.includes(q) && !shp.includes(q) && !traits.includes(q)) {
        return false;
      }
    }

    return true;
  }

  function updatePoolCount() {
    const assignedSet = new Set();
    Object.values(state.tierAssignments).forEach(arr => {
      arr.forEach(id => assignedSet.add(id));
    });

    const total = seedMap.size;
    const remaining = total - assignedSet.size;
    poolCountBadge.textContent = `${remaining} / ${total}`;

    // Update counts on tiers
    state.tiers.forEach(tier => {
      const count = (state.tierAssignments[tier.id] || []).length;
      const countEl = tierBoardEl.querySelector(`[data-tier-id="${tier.id}"] .tier-item-count`);
      if (countEl) countEl.textContent = `${count}`;
    });
  }

  // =========================================================================
  // Seed Card Element Creation
  // =========================================================================
  function createSeedCard(seed, isInTier) {
    const card = document.createElement('div');
    card.className = 'seed-card';
    card.draggable = true;
    card.dataset.seedId = seed.id;
    card.title = `${seed.name}\n${seed.color} • ${seed.shape}\nClick to view full preview`;

    // Image Wrap
    const imgWrap = document.createElement('div');
    imgWrap.className = 'seed-card-img-wrap';

    const img = document.createElement('img');
    img.src = seed.thumbnail;
    img.alt = seed.name;
    img.loading = 'lazy';
    imgWrap.appendChild(img);

    // Quick remove button (visible in tiers)
    if (isInTier) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'card-remove-btn';
      removeBtn.innerHTML = '✕';
      removeBtn.title = 'Return to unassigned pool';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeSeedFromTier(seed.id);
      });
      card.appendChild(removeBtn);
    }

    // Caption
    const caption = document.createElement('div');
    caption.className = 'seed-card-caption';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'seed-card-name';
    nameSpan.textContent = seed.name;
    caption.appendChild(nameSpan);

    card.appendChild(imgWrap);
    card.appendChild(caption);

    // Drag events
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    // Click to preview modal
    card.addEventListener('click', (e) => {
      if (!e.defaultPrevented) {
        openSeedModal(seed.id);
      }
    });

    return card;
  }

  // =========================================================================
  // Drag and Drop Engine (HTML5 DnD)
  // =========================================================================
  function handleDragStart(e) {
    draggedCard = this;
    dragSourceTierId = this.closest('.tier-dropzone')?.dataset.tierId || 'pool';
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.seedId);
  }

  function handleDragEnd() {
    if (draggedCard) {
      draggedCard.classList.remove('dragging');
    }
    document.querySelectorAll('.tier-dropzone, .seed-pool').forEach(el => {
      el.classList.remove('drag-over');
    });
    draggedCard = null;
    dragSourceTierId = null;
  }

  function setupDropzoneEvents(dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      dropzone.classList.add('drag-over');

      // Card reordering indicator
      const afterElement = getDragAfterElement(dropzone, e.clientX, e.clientY);
      if (draggedCard) {
        if (afterElement == null) {
          dropzone.appendChild(draggedCard);
        } else {
          dropzone.insertBefore(draggedCard, afterElement);
        }
      }
    });

    dropzone.addEventListener('dragleave', (e) => {
      // Only remove if leaving the container itself
      if (!dropzone.contains(e.relatedTarget)) {
        dropzone.classList.remove('drag-over');
      }
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const seedId = e.dataTransfer.getData('text/plain') || draggedCard?.dataset.seedId;
      const targetTierId = dropzone.dataset.tierId;

      if (!seedId) return;

      if (targetTierId === 'pool') {
        removeSeedFromTier(seedId);
      } else {
        // Find ordered cards inside this dropzone
        const currentCards = Array.from(dropzone.querySelectorAll('.seed-card'));
        const newOrder = currentCards.map(c => c.dataset.seedId);

        // Remove from old source
        if (dragSourceTierId && dragSourceTierId !== 'pool') {
          state.tierAssignments[dragSourceTierId] = (state.tierAssignments[dragSourceTierId] || []).filter(id => id !== seedId);
        }

        // Set in target
        state.tierAssignments[targetTierId] = newOrder;
        saveState();
        renderAll();
        showToast(`Moved to ${getTierName(targetTierId)}`);
      }
    });
  }

  function setupPoolDropzone() {
    setupDropzoneEvents(seedPoolEl);
  }

  // Find nearest sibling for fluid card reordering
  function getDragAfterElement(container, x, y) {
    const draggableElements = [...container.querySelectorAll('.seed-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      // Center of card
      const offsetX = x - (box.left + box.width / 2);
      const offsetY = y - (box.top + box.height / 2);
      const distance = Math.hypot(offsetX, offsetY);

      if (x < box.right && y < box.bottom && distance < closest.distance) {
        return { distance: distance, element: child };
      } else {
        return closest;
      }
    }, { distance: Number.POSITIVE_INFINITY }).element;
  }

  function removeSeedFromTier(seedId) {
    let changed = false;
    Object.keys(state.tierAssignments).forEach(tId => {
      const arr = state.tierAssignments[tId];
      const idx = arr.indexOf(seedId);
      if (idx !== -1) {
        arr.splice(idx, 1);
        changed = true;
      }
    });

    if (changed) {
      saveState();
      renderAll();
      const seed = seedMap.get(seedId);
      showToast(`Returned ${seed?.name || 'seed'} to pool`);
    }
  }

  function moveSeedToTier(seedId, targetTierId) {
    // Remove from all tiers first
    Object.keys(state.tierAssignments).forEach(tId => {
      state.tierAssignments[tId] = (state.tierAssignments[tId] || []).filter(id => id !== seedId);
    });

    if (targetTierId !== 'pool') {
      if (!state.tierAssignments[targetTierId]) {
        state.tierAssignments[targetTierId] = [];
      }
      state.tierAssignments[targetTierId].push(seedId);
    }

    saveState();
    renderAll();
    const seed = seedMap.get(seedId);
    showToast(targetTierId === 'pool' ? `Returned to pool` : `Moved ${seed?.name} to ${getTierName(targetTierId)}`);
  }

  // =========================================================================
  // Tier CRUD Operations
  // =========================================================================
  function addNewTier(position = 'bottom') {
    const newId = 'tier_' + Date.now();
    const nextColor = TIER_COLORS[state.tiers.length % TIER_COLORS.length];
    const newTier = {
      id: newId,
      name: `Tier ${state.tiers.length + 1}`,
      color: nextColor
    };

    if (position === 'top') {
      state.tiers.unshift(newTier);
    } else {
      state.tiers.push(newTier);
    }

    state.tierAssignments[newId] = [];
    saveState();
    renderAll();
    showToast(`Added ${newTier.name}`);
  }

  function deleteTier(tierId) {
    const tier = state.tiers.find(t => t.id === tierId);
    const assigned = state.tierAssignments[tierId] || [];

    if (assigned.length > 0) {
      const confirmed = confirm(`Delete "${tier?.name}"? Its ${assigned.length} seed photos will safely return to the pool.`);
      if (!confirmed) return;
    }

    // Delete tier and clear assignment
    state.tiers = state.tiers.filter(t => t.id !== tierId);
    delete state.tierAssignments[tierId];

    saveState();
    renderAll();
    showToast(`Deleted tier`);
  }

  function clearTier(tierId) {
    const assigned = state.tierAssignments[tierId] || [];
    if (assigned.length === 0) return;

    state.tierAssignments[tierId] = [];
    saveState();
    renderAll();
    showToast(`Returned all photos to pool`);
  }

  function moveTier(index, direction) {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= state.tiers.length) return;

    const temp = state.tiers[index];
    state.tiers[index] = state.tiers[targetIdx];
    state.tiers[targetIdx] = temp;

    saveState();
    renderTierBoard();
  }

  function resetAllTiers() {
    const confirmed = confirm('Reset all 76 seed photos back to the unassigned pool?');
    if (!confirmed) return;

    Object.keys(state.tierAssignments).forEach(tId => {
      state.tierAssignments[tId] = [];
    });

    saveState();
    renderAll();
    showToast('Reset all seeds to pool');
  }

  function getTierName(tierId) {
    if (tierId === 'pool') return 'Unassigned Pool';
    const tier = state.tiers.find(t => t.id === tierId);
    return tier ? tier.name : 'Tier';
  }

  function getNextColor(currentColor) {
    const idx = TIER_COLORS.indexOf(currentColor);
    if (idx === -1 || idx === TIER_COLORS.length - 1) {
      return TIER_COLORS[0];
    }
    return TIER_COLORS[idx + 1];
  }

  // =========================================================================
  // Seed Preview Modal
  // =========================================================================
  function openSeedModal(seedId) {
    const seed = seedMap.get(seedId);
    if (!seed) return;

    activeModalSeedId = seedId;

    modalImg.src = seed.full_image || seed.thumbnail;
    modalImg.alt = seed.name;
    modalSeedNumber.textContent = `#${String(seed.number).padStart(2, '0')}`;
    modalSeedName.textContent = seed.name;

    modalColorTag.textContent = seed.color;
    modalShapeTag.textContent = seed.shape;
    modalSizeTag.textContent = seed.size;
    modalFlatTag.textContent = seed.flatness;

    modalSeedTraits.textContent = seed.traits || 'No morphological traits recorded.';

    // Populate Move to Tier dropdown
    modalMoveSelect.innerHTML = '<option value="pool">Unassigned Pool</option>';
    state.tiers.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      // Pre-select current tier
      const currentTierId = Object.keys(state.tierAssignments).find(id => 
        (state.tierAssignments[id] || []).includes(seedId)
      );
      if (currentTierId === t.id) {
        opt.selected = true;
      }
      modalMoveSelect.appendChild(opt);
    });

    modalEl.style.display = 'flex';
  }

  function closeSeedModal() {
    modalEl.style.display = 'none';
    activeModalSeedId = null;
  }

  // =========================================================================
  // Export as Image (html2canvas with file:// safety)
  // =========================================================================
  function exportTierListAsImage() {
    if (typeof html2canvas === 'undefined') {
      alert('html2canvas library could not be loaded. Please ensure html2canvas.min.js is in the folder.');
      return;
    }

    showToast('📸 Generating high-res image...');

    const board = document.getElementById('tierBoard');

    html2canvas(board, {
      backgroundColor: '#0b0f19',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY
    }).then(canvas => {
      // 1. Try standard toDataURL
      try {
        const dataUrl = canvas.toDataURL('image/png');
        downloadImage(dataUrl);
        showToast('✅ Tier list saved as PNG image!');
        return;
      } catch (e1) {
        console.warn('toDataURL failed, attempting toBlob fallback...', e1);
      }

      // 2. Fallback to toBlob for strict browser security contexts
      canvas.toBlob(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          downloadImage(url);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          showToast('✅ Tier list saved as PNG image!');
        } else {
          showToast('❌ Browser security blocked canvas export');
          alert('Could not export canvas to image under current browser security settings.');
        }
      }, 'image/png');
    }).catch(err => {
      console.error('Export error:', err);
      showToast('❌ Failed to export image');
      alert('Export failed: ' + (err.message || err));
    });
  }

  function downloadImage(url) {
    const link = document.createElement('a');
    link.download = `seed-tier-list-${Date.now()}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // =========================================================================
  // Card Size Adjustment
  // =========================================================================
  function applyCardSize(size) {
    state.cardSize = size;
    document.body.classList.remove('size-compact', 'size-large');
    if (size === 'compact') document.body.classList.add('size-compact');
    if (size === 'large') document.body.classList.add('size-large');

    sizeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });
    saveState();
  }

  // =========================================================================
  // Share & Import String Code
  // =========================================================================
  function generateShareCode() {
    const payload = {
      v: 1,
      t: state.tiers.map(tier => {
        const assignedIds = state.tierAssignments[tier.id] || [];
        const seedNumbers = assignedIds.map(id => {
          const s = seedMap.get(id);
          return s ? s.number : null;
        }).filter(n => n !== null);

        return {
          n: tier.name,
          c: tier.color,
          s: seedNumbers
        };
      })
    };

    const jsonStr = JSON.stringify(payload);
    // Base64 encoding with Unicode support
    const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
    return 'BJI_' + b64;
  }

  function openShareModal() {
    const code = generateShareCode();
    shareCodeOutput.value = code;

    // Render summary badges
    shareSummaryBadges.innerHTML = '';
    state.tiers.forEach(tier => {
      const assignedCount = (state.tierAssignments[tier.id] || []).length;
      const pill = document.createElement('span');
      pill.className = 'share-tier-pill';
      pill.style.backgroundColor = tier.color;
      pill.innerHTML = `${tier.name} <span class="share-tier-count">${assignedCount}</span>`;
      shareSummaryBadges.appendChild(pill);
    });

    copyCodeBtn.textContent = '📋 Copy String Code';
    copyCodeBtn.classList.remove('btn-accent');
    copyCodeBtn.classList.add('btn-primary');

    shareModal.style.display = 'flex';
    shareCodeOutput.focus();
    shareCodeOutput.select();
  }

  function closeShareModal() {
    shareModal.style.display = 'none';
  }

  function copyShareCode() {
    const code = shareCodeOutput.value;
    if (!code) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        onCopySuccess();
      }).catch(() => {
        fallbackCopy();
      });
    } else {
      fallbackCopy();
    }

    function fallbackCopy() {
      shareCodeOutput.select();
      document.execCommand('copy');
      onCopySuccess();
    }

    function onCopySuccess() {
      copyCodeBtn.textContent = '✅ Copied to Clipboard!';
      copyCodeBtn.classList.remove('btn-primary');
      copyCodeBtn.classList.add('btn-accent');
      showToast('📋 Share code copied to clipboard!');
      setTimeout(() => {
        copyCodeBtn.textContent = '📋 Copy String Code';
        copyCodeBtn.classList.remove('btn-accent');
        copyCodeBtn.classList.add('btn-primary');
      }, 2500);
    }
  }

  function openImportModal() {
    importCodeInput.value = '';
    importErrorMsg.style.display = 'none';
    importErrorMsg.textContent = '';
    importModal.style.display = 'flex';
    importCodeInput.focus();
  }

  function closeImportModal() {
    importModal.style.display = 'none';
  }

  function applyImportCode(customCode = null) {
    const raw = (customCode || importCodeInput.value || '').trim();
    if (!raw) {
      showImportError('Please paste a share code first.');
      return;
    }

    try {
      let cleaned = raw;
      if (cleaned.startsWith('BJI_')) {
        cleaned = cleaned.substring(4);
      }

      const jsonStr = decodeURIComponent(escape(atob(cleaned)));
      const data = JSON.parse(jsonStr);

      if (!data || !Array.isArray(data.t) || data.t.length === 0) {
        throw new Error('Code format is invalid or contains no tiers.');
      }

      // Rebuild tiers
      const newTiers = [];
      const newAssignments = {};
      let totalAssigned = 0;

      // Seed lookup by number
      const numberToIdMap = new Map();
      seedMap.forEach(seed => {
        numberToIdMap.set(seed.number, seed.id);
      });

      data.t.forEach((tData, idx) => {
        const tierId = 'tier_' + Date.now() + '_' + idx;
        const tier = {
          id: tierId,
          name: tData.n || `Tier ${idx + 1}`,
          color: tData.c || TIER_COLORS[idx % TIER_COLORS.length]
        };
        newTiers.push(tier);

        // Map seed numbers to IDs
        const seedIds = [];
        if (Array.isArray(tData.s)) {
          tData.s.forEach(num => {
            const sid = numberToIdMap.get(num);
            if (sid && !seedIds.includes(sid)) {
              seedIds.push(sid);
              totalAssigned++;
            }
          });
        }
        newAssignments[tierId] = seedIds;
      });

      state.tiers = newTiers;
      state.tierAssignments = newAssignments;
      saveState();
      renderAll();

      closeImportModal();
      showToast(`🎉 Loaded tier list (${newTiers.length} tiers, ${totalAssigned} seeds placed)!`);
    } catch (err) {
      console.error('Import error:', err);
      showImportError('Invalid code: could not decode tier list. Please check that you copied the complete code.');
    }
  }

  function showImportError(msg) {
    importErrorMsg.textContent = msg;
    importErrorMsg.style.display = 'block';
  }

  // Check URL parameters for share code
  function checkUrlForShareCode() {
    try {
      const hash = window.location.hash;
      const search = window.location.search;
      let code = null;

      if (hash && hash.includes('tier=')) {
        code = hash.split('tier=')[1]?.split('&')[0];
      } else if (search && search.includes('tier=')) {
        const params = new URLSearchParams(search);
        code = params.get('tier');
      }

      if (code && code.startsWith('BJI_')) {
        setTimeout(() => {
          const confirmed = confirm('A shared tier list was detected in the URL. Would you like to load it?');
          if (confirmed) {
            applyImportCode(code);
          }
        }, 300);
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
  }

  // =========================================================================
  // Toast Notifications
  // =========================================================================
  let toastTimeout = null;
  function showToast(message) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastEl.textContent = message;
    toastEl.classList.add('show');
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2400);
  }

  // =========================================================================
  // Event Listeners
  // =========================================================================
  function setupEventListeners() {
    setupPoolDropzone();

    // Add Tier Buttons
    addTierTopBtn.addEventListener('click', () => addNewTier('top'));
    addTierBottomBtn.addEventListener('click', () => addNewTier('bottom'));

    // Share & Import Buttons
    shareCodeBtn.addEventListener('click', openShareModal);
    importCodeBtn.addEventListener('click', openImportModal);
    copyCodeBtn.addEventListener('click', copyShareCode);
    applyImportBtn.addEventListener('click', () => applyImportCode());

    closeShareModalBtn.addEventListener('click', closeShareModal);
    closeImportModalBtn.addEventListener('click', closeImportModal);

    shareModal.addEventListener('click', (e) => {
      if (e.target === shareModal) closeShareModal();
    });
    importModal.addEventListener('click', (e) => {
      if (e.target === importModal) closeImportModal();
    });

    // Reset All
    resetAllBtn.addEventListener('click', resetAllTiers);

    // Export Image
    exportImageBtn.addEventListener('click', exportTierListAsImage);

    // Preset Selector
    applyPresetBtn.addEventListener('click', () => {
      const presetKey = templatePresetSelect.value;
      const confirmed = confirm(`Apply "${presetKey.toUpperCase()}" template? Current tier labels will be updated.`);
      if (confirmed) {
        loadPreset(presetKey);
        renderAll();
        showToast(`Applied ${presetKey} template`);
      }
    });

    // Search Input
    seedSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
      renderPool();
    });

    clearSearchBtn.addEventListener('click', () => {
      seedSearchInput.value = '';
      state.searchQuery = '';
      clearSearchBtn.style.display = 'none';
      renderPool();
      seedSearchInput.focus();
    });

    // Filter Chips
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.activeFilter = chip.dataset.filter;
        renderPool();
      });
    });

    // Size Toggles
    sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        applyCardSize(btn.dataset.size);
      });
    });

    // Modal Events
    closeModalBtn.addEventListener('click', closeSeedModal);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeSeedModal();
    });

    modalMoveConfirmBtn.addEventListener('click', () => {
      if (activeModalSeedId) {
        const targetTierId = modalMoveSelect.value;
        moveSeedToTier(activeModalSeedId, targetTierId);
        closeSeedModal();
      }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (modalEl.style.display === 'flex') closeSeedModal();
        if (shareModal.style.display === 'flex') closeShareModal();
        if (importModal.style.display === 'flex') closeImportModal();
      }
    });

    checkUrlForShareCode();
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
