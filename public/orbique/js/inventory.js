// ============================================================
// INVENTORY - Inventory display & management
// ============================================================

function updateOrbDisplay() {
    const orbs = STATE.inventory.orbs;
    if (orbs.whiteI) document.getElementById('invOrbeB1').classList.add('collected');
    if (orbs.whiteII) document.getElementById('invOrbeB2').classList.add('collected');
    if (orbs.blackI) document.getElementById('invOrbeN1').classList.add('collected');
    if (orbs.blackII) document.getElementById('invOrbeN2').classList.add('collected');
}

function toggleInventoryDetail() {
    // Toggle detailed inventory view
}
