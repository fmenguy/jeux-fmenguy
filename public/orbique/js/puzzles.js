// ============================================================
// PUZZLES - Unlock mode & combo system
// ============================================================

function closeDoorRoom() {
    document.getElementById('doorRoomUI').style.display = 'none';
    renderer.domElement.requestPointerLock();
}

function openUnlockMode() {
    STATE.unlockMode = true;
    STATE.comboInput = '';
    document.getElementById('unlockMode').style.display = 'block';
    document.getElementById('comboDisplay').textContent = '_';
    document.getElementById('comboResult').textContent = '';
    document.exitPointerLock();
}

function closeUnlockMode() {
    STATE.unlockMode = false;
    document.getElementById('unlockMode').style.display = 'none';
    renderer.domElement.requestPointerLock();
}

function checkCombo() {
    const combo = STATE.comboInput;
    const action = COMBOS[combo];

    if (action) {
        switch(action) {
            case 'invert_h':
                STATE.controlsInverted.horizontal = !STATE.controlsInverted.horizontal;
                document.getElementById('comboResult').textContent = t('comboInvertH');
                notify(t('invertH'));
                break;
            case 'invert_v':
                STATE.controlsInverted.vertical = !STATE.controlsInverted.vertical;
                document.getElementById('comboResult').textContent = t('comboInvertV');
                notify(t('invertV'));
                break;
            case 'reset_controls':
                STATE.controlsInverted = { horizontal: false, vertical: false };
                document.getElementById('comboResult').textContent = t('comboReset');
                notify(t('resetControls'));
                break;
            default:
                if (STATE.currentChest && !STATE.currentChest.opened) {
                    STATE.currentChest.opened = true;
                    const roomId = STATE.currentChest.puzzleId;
                    STATE.roomsCompleted.push(roomId);
                    document.getElementById('comboResult').textContent = t('chestOpen');
                    notify(t('chestOpenHint'));
                    setTimeout(() => {
                        closeUnlockMode();
                        loadRoom(roomId);
                    }, 1500);
                    return;
                }
                break;
        }
    } else {
        document.getElementById('comboResult').textContent = t('comboInvalid');
    }

    setTimeout(() => {
        STATE.comboInput = '';
        document.getElementById('comboDisplay').textContent = '_';
        document.getElementById('comboResult').textContent = '';
    }, 1000);
}
