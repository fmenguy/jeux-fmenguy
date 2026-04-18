// ============================================================
// SAVE / LOAD : 5 emplacements en localStorage
// Debloque uniquement si STATE.canSave === true
// ============================================================

const SAVE_KEY_PREFIX = 'orbique_save_';
const SAVE_SLOT_COUNT = 5;

function listSaveSlots() {
    const slots = [];
    for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
        const raw = localStorage.getItem(SAVE_KEY_PREFIX + i);
        if (raw) {
            try {
                const data = JSON.parse(raw);
                slots.push({ index: i, data });
            } catch (e) {
                slots.push({ index: i, data: null, corrupted: true });
            }
        } else {
            slots.push({ index: i, data: null });
        }
    }
    return slots;
}

function saveToSlot(slotIndex) {
    if (!STATE.canSave) {
        notify(t('saveNotUnlocked') || 'Sauvegarde non debloquee.');
        return;
    }
    const payload = {
        version: 1,
        timestamp: Date.now(),
        zone: currentRoom,
        camera: {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z
        },
        state: {
            difficulty: STATE.difficulty,
            inventory: STATE.inventory,
            doorsUnlocked: STATE.doorsUnlocked,
            roomsCompleted: STATE.roomsCompleted,
            currentZone: STATE.currentZone,
            tutorialCompleted: STATE.tutorialCompleted,
            backwardDiscovered: STATE.backwardDiscovered,
            visitedRooms: STATE.visitedRooms,
            canSave: STATE.canSave,
            saveKeyClaimed: STATE.saveKeyClaimed,
            fellInWell: STATE.fellInWell
        }
    };
    try {
        localStorage.setItem(SAVE_KEY_PREFIX + slotIndex, JSON.stringify(payload));
        notify((t('savedSlot') || 'Sauvegarde dans l\'emplacement') + ' ' + (slotIndex + 1));
        renderSaveSlots();
    } catch (e) {
        notify('Erreur de sauvegarde : ' + e.message);
    }
}

function loadFromSlot(slotIndex) {
    const raw = localStorage.getItem(SAVE_KEY_PREFIX + slotIndex);
    if (!raw) return;
    try {
        const data = JSON.parse(raw);
        // Restaurer STATE (champs autorises)
        Object.assign(STATE, data.state);
        // Recharger la room
        loadRoom(data.zone);
        // Repositionner la camera (apres loadRoom qui aurait reset spawn)
        if (data.camera) {
            camera.position.set(data.camera.x, data.camera.y, data.camera.z);
        }
        if (typeof updateHUD === 'function') updateHUD();
        if (typeof updateOrbDisplay === 'function') updateOrbDisplay();
        closeSaveMenu();
        notify((t('loadedSlot') || 'Charge depuis l\'emplacement') + ' ' + (slotIndex + 1));
    } catch (e) {
        notify('Erreur de chargement : ' + e.message);
    }
}

function deleteSlot(slotIndex) {
    localStorage.removeItem(SAVE_KEY_PREFIX + slotIndex);
    notify((t('deletedSlot') || 'Emplacement vide') + ' ' + (slotIndex + 1));
    renderSaveSlots();
}

function formatSlotInfo(slot) {
    if (!slot.data) return null;
    const d = new Date(slot.data.timestamp);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mn = String(d.getMinutes()).padStart(2, '0');
    return {
        date: dd + '/' + mm + ' ' + hh + ':' + mn,
        zone: slot.data.zone || '?',
        plans: (slot.data.state && slot.data.state.inventory)
            ? (slot.data.state.inventory.plans?.length || 0) : 0
    };
}

function renderSaveSlots() {
    const container = document.getElementById('saveSlots');
    if (!container) return;
    const slots = listSaveSlots();
    container.innerHTML = '';
    slots.forEach(slot => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 10px;background:#101822;border:1px solid #1a2a3a;border-radius:5px;';

        const info = formatSlotInfo(slot);
        const label = document.createElement('div');
        label.style.cssText = 'flex:1;font-family:monospace;font-size:0.78rem;color:#aaccdd;';
        if (info) {
            label.innerHTML = '<strong style="color:#88ccff;">#' + (slot.index + 1) + '</strong> · ' +
                info.date + ' · ' + info.zone + ' · ' + info.plans + ' plans';
        } else {
            label.innerHTML = '<strong style="color:#556677;">#' + (slot.index + 1) + '</strong> · <em>Vide</em>';
        }
        row.appendChild(label);

        // Save button
        const btnSave = document.createElement('button');
        btnSave.type = 'button';
        btnSave.textContent = info ? 'Écraser' : 'Sauver';
        btnSave.style.cssText = 'padding:4px 10px;background:rgba(68,136,204,0.15);border:1px solid #4488cc;color:#88ccff;border-radius:3px;cursor:pointer;font-size:0.7rem;letter-spacing:0.05em;';
        btnSave.onclick = () => saveToSlot(slot.index);
        row.appendChild(btnSave);

        // Load button
        const btnLoad = document.createElement('button');
        btnLoad.type = 'button';
        btnLoad.textContent = 'Charger';
        btnLoad.disabled = !info;
        btnLoad.style.cssText = 'padding:4px 10px;background:rgba(136,204,68,0.15);border:1px solid #88cc44;color:#aaff88;border-radius:3px;cursor:pointer;font-size:0.7rem;letter-spacing:0.05em;' +
            (!info ? 'opacity:0.3;cursor:not-allowed;' : '');
        btnLoad.onclick = () => info && loadFromSlot(slot.index);
        row.appendChild(btnLoad);

        // Delete button
        const btnDel = document.createElement('button');
        btnDel.type = 'button';
        btnDel.textContent = '×';
        btnDel.disabled = !info;
        btnDel.style.cssText = 'padding:4px 8px;background:rgba(204,68,68,0.15);border:1px solid #cc4444;color:#ff8888;border-radius:3px;cursor:pointer;font-size:0.85rem;line-height:1;' +
            (!info ? 'opacity:0.3;cursor:not-allowed;' : '');
        btnDel.onclick = () => info && deleteSlot(slot.index);
        row.appendChild(btnDel);

        container.appendChild(row);
    });
}

function openSaveMenu() {
    if (!STATE.canSave) return;
    renderSaveSlots();
    const menu = document.getElementById('saveMenu');
    menu.style.display = 'flex';
}

function closeSaveMenu() {
    const menu = document.getElementById('saveMenu');
    if (menu) menu.style.display = 'none';
}

window.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('saveMenuClose');
    if (closeBtn) closeBtn.addEventListener('click', closeSaveMenu);
});
