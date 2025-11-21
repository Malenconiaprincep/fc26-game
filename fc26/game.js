import { FORMATIONS } from './src/data/formations.js';
import { players } from './src/data/players.js';
import UIUtils from './src/utils/ui.js';

const systemInfo = tt.getSystemInfoSync();
const canvas = tt.createCanvas();
const ctx = canvas.getContext('2d');

// Screen Setup
canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Optimize canvas for better text rendering
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';
// Enable better text rendering if available
if (ctx.textRenderingQuality) {
    ctx.textRenderingQuality = 'high';
}

// State
const STATE = {
    scene: 'FORMATION_SELECT', // FORMATION_SELECT, DRAFT_SQUAD, DRAFT_MODAL, MATCH_RESULT
    selectedFormationIndex: -1,
    formationCards: [],

    // Draft State
    draft: {
        formation: null,
        squad: [], // Array of { positionData, player(opt) }
        activeSlotIndex: -1, // The slot user clicked on
        candidates: [], // Array of player objects
        candidateCards: [], // Hitboxes for candidates
        modalProgress: 0, // 0 to 1 for animation
    },

    // Match State
    match: {
        playerScore: 0,
        aiScore: 0,
        aiTeamName: "AI FC",
        aiRating: 0,
        playerRating: 0
    }
};

const ui = new UIUtils(ctx, WIDTH, HEIGHT);

// Initialization
function init() {
    calculateFormationCardPositions();
    bindEvents();
    loop();
}

function calculateFormationCardPositions() {
    const cols = 2;
    const padding = 20;
    const cardWidth = (WIDTH - (padding * (cols + 1))) / cols;
    const cardHeight = cardWidth * 1.4;
    const startY = 100;

    STATE.formationCards = FORMATIONS.map((fmt, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        return {
            x: padding + col * (cardWidth + padding),
            y: startY + row * (cardHeight + padding),
            w: cardWidth,
            h: cardHeight,
            index: index,
            data: fmt
        };
    });
}

// Draft Logic
function startDraft(formationData) {
    STATE.scene = 'DRAFT_SQUAD';
    STATE.draft.formation = formationData;

    // Initialize empty squad slots based on formation positions
    STATE.draft.squad = formationData.positions.map(pos => ({
        role: pos.role,
        x: pos.x,
        y: pos.y,
        player: null
    }));

    STATE.draft.activeSlotIndex = -1;
    STATE.match.playerRating = 0;
}

function getPlayersByPosition(position, count = 3) {
    const candidates = players.filter(p => {
        if (Array.isArray(p.position)) {
            return p.position.includes(position);
        }
        return p.position === position;
    });

    // Fallback logic
    if (candidates.length < count) {
        const fallbackCandidates = players.filter(p => {
            if (Array.isArray(p.position)) {
                if (position.includes('M') && p.position.some(pos => pos.includes('M'))) return true;
                if (position.includes('B') && p.position.some(pos => pos.includes('B'))) return true;
                if (position.includes('W') && p.position.some(pos => pos.includes('W'))) return true;
            }
            return false;
        });
        fallbackCandidates.forEach(p => {
            if (!candidates.includes(p)) candidates.push(p);
        });
    }

    // Ensure we get enough candidates by filling with randoms if needed
    let result = candidates.sort(() => 0.5 - Math.random()).slice(0, count);
    if (result.length < count) {
        const randoms = players.filter(p => !result.includes(p)).sort(() => 0.5 - Math.random()).slice(0, count - result.length);
        result = result.concat(randoms);
    }

    return result;
}

// Open selection modal for a specific slot
function openSlotSelection(index) {
    const slot = STATE.draft.squad[index];
    STATE.draft.activeSlotIndex = index;

    // Get 6 candidates for grid view
    const candidates = getPlayersByPosition(slot.role, 6);
    STATE.draft.candidates = candidates;
    STATE.draft.modalProgress = 0; // Reset animation

    // Grid Layout for 6 items (2 columns, 3 rows)
    const cols = 2;
    const padding = 15;
    const headerHeight = 100; // Top offset for header
    const bottomPadding = 20; // Bottom padding to avoid cutoff

    // Calculate available height
    const availableHeight = HEIGHT - headerHeight - bottomPadding;

    // Calculate item dimensions to fit in available space
    const itemW = (WIDTH - (padding * 3)) / 2;
    const maxItemH = (availableHeight - (padding * 2)) / 3; // 3 rows with padding between
    const itemH = Math.min(itemW * 1.6, maxItemH); // Use smaller of aspect ratio or max height
    const startY = headerHeight; // Top offset

    STATE.draft.candidateCards = candidates.map((player, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return {
            // Store base layout relative to sidebar (0,0 is top-left of sidebar content)
            // We will apply offset during draw/input
            relX: padding + col * (itemW + padding),
            relY: startY + row * (itemH + padding),
            w: itemW,
            h: itemH,
            player: player
        };
    });

    STATE.scene = 'DRAFT_MODAL';
}

function selectCandidate(player) {
    if (STATE.draft.activeSlotIndex !== -1) {
        STATE.draft.squad[STATE.draft.activeSlotIndex].player = player;
    }

    // Close modal
    STATE.scene = 'DRAFT_SQUAD';
    STATE.draft.activeSlotIndex = -1;
    STATE.draft.candidates = [];
    STATE.draft.modalProgress = 0;

    // Recalculate Team Rating
    updateTeamRating();
}

function updateTeamRating() {
    const filledSlots = STATE.draft.squad.filter(s => s.player);
    if (filledSlots.length === 0) {
        STATE.match.playerRating = 0;
        return;
    }
    const totalRating = filledSlots.reduce((sum, slot) => sum + slot.player.rating, 0);
    STATE.match.playerRating = Math.round(totalRating / 11);
}

// Match Logic
function playMatch() {
    STATE.scene = 'MATCH_RESULT';

    STATE.match.aiRating = 85 + Math.floor(Math.random() * 10);

    let pScore = 0;
    let aScore = 0;

    for (let i = 0; i < 5; i++) {
        if (Math.random() * 100 < STATE.match.playerRating - 30) pScore++;
        if (Math.random() * 100 < STATE.match.aiRating - 30) aScore++;
    }

    STATE.match.playerScore = pScore;
    STATE.match.aiScore = aScore;
}

function resetGame() {
    STATE.scene = 'FORMATION_SELECT';
    STATE.selectedFormationIndex = -1;
    STATE.draft.squad = [];
    STATE.draft.activeSlotIndex = -1;
    STATE.draft.candidates = [];
}

// Input Handling
function bindEvents() {
    tt.onTouchStart((res) => {
        const touch = res.touches[0];
        const tx = touch.clientX;
        const ty = touch.clientY;

        if (STATE.scene === 'FORMATION_SELECT') {
            handleFormationSelectInput(tx, ty);
        } else if (STATE.scene === 'DRAFT_SQUAD') {
            handleDraftSquadInput(tx, ty);
        } else if (STATE.scene === 'DRAFT_MODAL') {
            handleDraftModalInput(tx, ty);
        } else if (STATE.scene === 'MATCH_RESULT') {
            // Click anywhere to reset
            resetGame();
        }
    });
}

function handleFormationSelectInput(x, y) {
    for (let card of STATE.formationCards) {
        if (x > card.x && x < card.x + card.w &&
            y > card.y && y < card.y + card.h) {

            STATE.selectedFormationIndex = card.index;
            startDraft(card.data);
            return;
        }
    }
}

function handleDraftSquadInput(x, y) {
    // 1. Check Play Button (only if full)
    const isFullTeam = STATE.draft.squad.length > 0 && STATE.draft.squad.every(s => s.player);

    if (isFullTeam) {
        if (x > WIDTH / 2 - 60 && x < WIDTH / 2 + 60 &&
            y > HEIGHT - 80 && y < HEIGHT - 30) {
            playMatch();
            return;
        }
    }

    // 2. Check Slot Clicks
    // Reverse order to handle potential overlaps
    for (let i = 0; i < STATE.draft.squad.length; i++) {
        const slot = STATE.draft.squad[i];
        const px = slot.x * WIDTH;
        const py = 50 + slot.y * (HEIGHT - 50);

        const w = 60;
        const h = 80;

        if (x > px - w / 2 && x < px + w / 2 &&
            y > py - h / 2 && y < py + h / 2) {
            openSlotSelection(i);
            return;
        }
    }
}

function handleDraftModalInput(x, y) {
    // Animation check
    if (STATE.draft.modalProgress < 0.9) return; // Prevent click during animation

    const currentXOffset = 0; // Fully open means 0 offset from sidebar start
    // Sidebar is full width here

    if (STATE.draft.candidates.length > 0) {
        for (let card of STATE.draft.candidateCards) {
            const realX = card.relX; // No offset needed if we check against screen coords and sidebar is full screen
            if (x > realX && x < realX + card.w &&
                y > card.relY && y < card.relY + card.h) {
                selectCandidate(card.player);
                return;
            }
        }
    }

    // Close if clicked top header area?
    if (y < 80) {
        STATE.scene = 'DRAFT_SQUAD';
        STATE.draft.candidates = [];
    }
}

// Rendering
function draw() {
    // Clear Screen
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (STATE.scene === 'FORMATION_SELECT') {
        drawFormationSelect();
    } else if (STATE.scene === 'DRAFT_SQUAD' || STATE.scene === 'DRAFT_MODAL') {
        drawDraftSquad();
        if (STATE.scene === 'DRAFT_MODAL') {
            // Update Animation
            STATE.draft.modalProgress = Math.min(1, STATE.draft.modalProgress + 0.15);
            drawDraftModal();
        }
    } else if (STATE.scene === 'MATCH_RESULT') {
        drawMatchResult();
    }
}

function drawFormationSelect() {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Choose Formation", WIDTH / 2, 60);

    STATE.formationCards.forEach(card => {
        const isSelected = STATE.selectedFormationIndex === card.index;
        ui.drawCard(card.x, card.y, card.w, card.h, 12, card.data.name, isSelected, card.data);
    });
}

function drawDraftSquad() {
    // 1. Draw Pitch
    ui.drawPitch(0, 50, WIDTH, HEIGHT - 50);

    // 2. Draw Players
    STATE.draft.squad.forEach((slot) => {
        const px = slot.x * WIDTH;
        const py = 50 + slot.y * (HEIGHT - 50);
        ui.drawPlayerOnPitch(px, py, slot.player, slot.role, false);
    });

    // 3. UI Info / Play Button
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, HEIGHT - 100, WIDTH, 100);

    // Team Rating
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Rating: ${STATE.match.playerRating}`, 30, HEIGHT - 45);

    const isFullTeam = STATE.draft.squad.length > 0 && STATE.draft.squad.every(s => s.player);
    if (isFullTeam) {
        ctx.fillStyle = "#00ff00";
        ctx.fillRect(WIDTH / 2 - 60, HEIGHT - 80, 120, 50);
        ctx.fillStyle = "#000";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("PLAY", WIDTH / 2, HEIGHT - 55);
    } else {
        ctx.fillStyle = "#666";
        ctx.font = "18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Tap slot to draft", WIDTH / 2, HEIGHT - 55);
    }
}

function drawDraftModal() {
    // Calculate Sidebar X based on progress
    // Slide in from Right
    const startX = WIDTH;
    const endX = 0;
    const currentX = startX + (endX - startX) * easeOutCubic(STATE.draft.modalProgress);

    ctx.save();
    ctx.translate(currentX, 0);

    // Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grad.addColorStop(0, "rgba(10, 20, 30, 0.98)");
    grad.addColorStop(1, "rgba(5, 10, 15, 0.98)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Header
    if (STATE.draft.activeSlotIndex !== -1) {
        const currentRole = STATE.draft.squad[STATE.draft.activeSlotIndex].role;
        ctx.fillStyle = "#fff";
        ctx.font = "bold 32px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Choose Player (${currentRole})`, WIDTH / 2, 60);
    }

    // Draw Cards Grid
    STATE.draft.candidateCards.forEach(card => {
        ui.drawDetailedOption(card.relX, card.relY, card.w, card.h, card.player);
    });

    ctx.restore();
}

// Easing function for smooth slide
function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
}

function drawMatchResult() {
    // ... same as before ...
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 40px Arial";
    const scoreStr = `${STATE.match.playerScore} - ${STATE.match.aiScore}`;
    ctx.fillText("FULL TIME", WIDTH / 2, 150);
    ctx.font = "bold 80px Arial";
    ctx.fillStyle = "#00ff00";
    ctx.fillText(scoreStr, WIDTH / 2, 250);
    ctx.font = "20px Arial";
    ctx.fillStyle = "#ccc";
    ctx.fillText("My Team", WIDTH / 2 - 100, 320);
    ctx.fillText(STATE.match.aiTeamName, WIDTH / 2 + 100, 320);
    ctx.font = "16px Arial";
    ctx.fillText(`OVR: ${STATE.match.playerRating}`, WIDTH / 2 - 100, 350);
    ctx.fillText(`OVR: ${STATE.match.aiRating}`, WIDTH / 2 + 100, 350);
    let resultText = "DRAW";
    let resultColor = "#fff";
    if (STATE.match.playerScore > STATE.match.aiScore) {
        resultText = "VICTORY!";
        resultColor = "#00ff00";
    } else if (STATE.match.playerScore < STATE.match.aiScore) {
        resultText = "DEFEAT";
        resultColor = "#ff0000";
    }
    ctx.fillStyle = resultColor;
    ctx.font = "bold 50px Arial";
    ctx.fillText(resultText, WIDTH / 2, 500);
    ctx.fillStyle = "#666";
    ctx.font = "20px Arial";
    ctx.fillText("Tap anywhere to restart", WIDTH / 2, HEIGHT - 100);
}

function loop() {
    draw();
    requestAnimationFrame(loop);
}

// Start
init();
