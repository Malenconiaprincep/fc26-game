/**
 * Utility to handle Canvas rendering context
 */
export default class UIUtils {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.imageCache = {}; // URL -> Image Object
    }

    // Helper to get better font family
    getFontFamily() {
        // Use modern sans-serif fonts, fallback to Arial
        return "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
    }

    // Helper to draw image from URL with cache
    drawNetImage(url, x, y, w, h) {
        if (!url) return;

        let img = this.imageCache[url];

        if (!img) {
            // Start load
            img = tt.createImage();
            img.src = url;
            img.loaded = false;
            img.onload = () => {
                img.loaded = true;
            };
            this.imageCache[url] = img;
        }

        if (img.loaded) {
            this.ctx.drawImage(img, x, y, w, h);
        }
    }

    // Helper to draw image maintaining aspect ratio
    drawNetImageAspect(url, x, y, maxW, maxH, align = 'center') {
        if (!url) return;

        let img = this.imageCache[url];

        if (!img) {
            // Start load
            img = tt.createImage();
            img.src = url;
            img.loaded = false;
            img.onload = () => {
                img.loaded = true;
                // Store natural dimensions if available
                if (img.naturalWidth && img.naturalHeight) {
                    img.width = img.naturalWidth;
                    img.height = img.naturalHeight;
                }
            };
            this.imageCache[url] = img;
        }

        if (img.loaded) {
            // Get image dimensions
            const imgW = img.width || img.naturalWidth || 1;
            const imgH = img.height || img.naturalHeight || 1;

            if (imgW && imgH) {
                const imgAspect = imgW / imgH;
                const targetAspect = maxW / maxH;

                let drawW, drawH, drawX, drawY;

                if (imgAspect > targetAspect) {
                    // Image is wider, fit to width
                    drawW = maxW;
                    drawH = maxW / imgAspect;
                } else {
                    // Image is taller, fit to height
                    drawH = maxH;
                    drawW = maxH * imgAspect;
                }

                // Align based on parameter
                if (align === 'center') {
                    drawX = x + (maxW - drawW) / 2;
                    drawY = y + (maxH - drawH) / 2;
                } else if (align === 'right') {
                    drawX = x + maxW - drawW;
                    drawY = y + (maxH - drawH) / 2;
                } else {
                    drawX = x;
                    drawY = y + (maxH - drawH) / 2;
                }

                this.ctx.drawImage(img, Math.round(drawX), Math.round(drawY), Math.round(drawW), Math.round(drawH));
            } else {
                // Fallback: draw without aspect ratio if dimensions not available
                this.ctx.drawImage(img, x, y, maxW, maxH);
            }
        }
    }

    // Polyfill for roundRect
    roundRectPath(x, y, w, h, r) {
        const ctx = this.ctx;
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // Draw a rounded rectangle card
    drawCard(x, y, w, h, radius, title, isSelected = false, formation = null) {
        const ctx = this.ctx;

        ctx.save();

        // Shadow/Glow for selected
        if (isSelected) {
            ctx.shadowColor = "#00ff00"; // Green glow
            ctx.shadowBlur = 20;
        } else {
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 5;
        }

        // Background Gradient (Dark Card)
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, "#2a2a2a");
        grad.addColorStop(1, "#0d0d0d");

        ctx.fillStyle = grad;
        this.roundRectPath(x, y, w, h, radius);
        ctx.fill();

        // Border
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.strokeStyle = isSelected ? "#00ff00" : "#444";
        ctx.stroke();

        // Title (Formation Name)
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px " + this.getFontFamily();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(title, x + w / 2, y + h - 25);

        // Draw Mini Field Visualization
        if (formation) {
            const fieldX = x + 15;
            const fieldY = y + 15;
            const fieldW = w - 30;
            const fieldH = h - 50;
            this.drawMiniFormation(formation, fieldX, fieldY, fieldW, fieldH);
        }

        ctx.restore();
    }

    drawMiniFormation(formation, x, y, w, h) {
        const ctx = this.ctx;

        // Field Background
        ctx.fillStyle = "rgba(30, 60, 30, 0.8)";
        this.roundRectPath(x, y, w, h, 5);
        ctx.fill();

        // Field Lines
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 1;
        ctx.stroke(); // Stroke the border

        // Draw Dots for positions
        ctx.fillStyle = "#ffffff";
        formation.positions.forEach(pos => {
            const px = x + pos.x * w;
            const py = y + pos.y * h;

            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();

            // Tiny shadow for dots
            ctx.shadowColor = "#000";
            ctx.shadowBlur = 2;
        });
        ctx.shadowBlur = 0;
    }

    // Draw the full pitch background
    drawPitch(x, y, w, h) {
        const ctx = this.ctx;

        // Grass Gradient
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, "#1a4a1a");
        grad.addColorStop(1, "#0e2b0e");

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);

        // Lines
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 2;

        // Border
        ctx.strokeRect(x + 10, y + 10, w - 20, h - 20);

        // Center Circle
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 40, 0, Math.PI * 2);
        ctx.stroke();

        // Halfway Line
        ctx.beginPath();
        ctx.moveTo(x + 10, y + h / 2);
        ctx.lineTo(x + w - 10, y + h / 2);
        ctx.stroke();

        // Boxes (Simplified)
        // Top Box
        ctx.strokeRect(x + w / 2 - 50, y + 10, 100, 60);
        // Bottom Box
        ctx.strokeRect(x + w / 2 - 50, y + h - 70, 100, 60);
    }

    // Draw a small player card on the pitch (or empty slot)
    drawPlayerOnPitch(x, y, player, role, isCurrentTarget) {
        const ctx = this.ctx;
        const w = 60;
        const h = 80;
        const dx = x - w / 2;
        const dy = y - h / 2;

        ctx.save();

        // Glow if current target
        if (isCurrentTarget) {
            ctx.shadowColor = "#ffff00";
            ctx.shadowBlur = 15;
        }

        // Card Base
        ctx.fillStyle = player ? "#222" : "rgba(0,0,0,0.5)";
        if (isCurrentTarget && !player) ctx.fillStyle = "rgba(50,50,50,0.8)";

        this.roundRectPath(dx, dy, w, h, 5);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset glow

        // Border
        ctx.strokeStyle = isCurrentTarget ? "#ffff00" : "#444";
        if (player) ctx.strokeStyle = "#d4af37"; // Gold border for filled
        ctx.stroke();

        if (player) {
            // Rating
            ctx.fillStyle = "#fff";
            ctx.font = "bold 16px " + this.getFontFamily();
            ctx.textAlign = "left";
            ctx.fillText(player.rating, dx + 5, dy + 20);

            // Position
            ctx.font = "10px " + this.getFontFamily();
            const posText = Array.isArray(player.position) ? player.position[0] : player.position;
            ctx.fillText(posText, dx + 5, dy + 32);

            // Name
            ctx.textAlign = "center";
            ctx.font = "bold 10px " + this.getFontFamily();
            ctx.fillText(player.name, x, dy + h - 10);
        } else {
            // Empty Slot Role
            ctx.fillStyle = "#aaa";
            ctx.font = "bold 14px " + this.getFontFamily();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(role, x, y);
        }

        ctx.restore();
    }

    // Draw a detailed option with card + stats rows (League/Club/Nation)
    drawDetailedOption(x, y, w, h, player) {
        const ctx = this.ctx;
        ctx.save();

        // 1. Container Background (Dark Rounded)
        ctx.fillStyle = "#1a222a"; // Dark blue-ish grey
        this.roundRectPath(x, y, w, h, 12);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#333";
        ctx.stroke();

        // 2. Draw Upper Card (Wrapper + Face)
        // Scale the card to fit, leaving room for info (no stats)
        const cardH = h * 0.62; // Slightly reduced to ensure info fits
        const cardW = cardH * 0.7; // Aspect ratio for FUT card approx
        const cardX = x + (w - cardW) / 2; // Center it
        const cardY = y + 8; // Reduced top padding

        this.drawCandidateCard(cardX, cardY, cardW, cardH, player, true); // true to hide stats

        // 3. Draw Info Rows (League, Club, Nation) - compressed layout
        const infoTopPadding = 5;
        const startY = cardY + cardH + infoTopPadding;
        const availableInfoHeight = h - (startY - y) - 5; // Leave 5px bottom padding
        const rowH = availableInfoHeight / 3;
        const iconSize = 14; // Smaller icons to save space
        const fontSize = 11; // Smaller font to save space
        const textX = x + 40;
        const iconX = x + 10;

        ctx.fillStyle = "#fff";
        ctx.font = "bold " + Math.round(fontSize) + "px " + this.getFontFamily();
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        // Row 1: League - Round coordinates for crisp rendering
        if (player.leagueImg) this.drawNetImage(player.leagueImg, Math.round(iconX), Math.round(startY + 3), Math.round(iconSize), Math.round(iconSize));
        ctx.fillText(player.league || "League", Math.round(textX), Math.round(startY + 12));

        // Row 2: Club - Round coordinates for crisp rendering
        if (player.clubImg) this.drawNetImage(player.clubImg, Math.round(iconX), Math.round(startY + rowH + 3), Math.round(iconSize), Math.round(iconSize));
        ctx.fillText(player.club || "Club", Math.round(textX), Math.round(startY + rowH + 12));

        // Row 3: Nation - Round coordinates for crisp rendering
        if (player.nationImg) this.drawNetImage(player.nationImg, Math.round(iconX), Math.round(startY + rowH * 2 + 3), Math.round(iconSize), Math.round(iconSize * 0.6));
        ctx.fillText(player.nation || "Nation", Math.round(textX), Math.round(startY + rowH * 2 + 12));

        ctx.restore();
    }

    // Draw a candidate card for selection
    drawCandidateCard(x, y, w, h, player, simplified = false) {
        const ctx = this.ctx;

        ctx.save();

        // 1. Background / Wrapper - Make it larger
        const wrapperScale = 1.25; // 15% larger
        const wrapperW = w * wrapperScale;
        const wrapperH = h * wrapperScale;
        const wrapperX = x - (wrapperW - w) / 2; // Center the larger wrapper
        const wrapperY = y - (wrapperH - h) / 2;

        if (player.wrapperImg) {
            // Check if image loaded, if not draw fallback
            const img = this.imageCache[player.wrapperImg];
            if (img && img.loaded) {
                this.drawNetImage(player.wrapperImg, wrapperX, wrapperY, wrapperW, wrapperH);
            } else {
                // Fallback Gold Gradient
                this.drawNetImage(player.wrapperImg, wrapperX, wrapperY, wrapperW, wrapperH); // Trigger load
                const grad = ctx.createLinearGradient(wrapperX, wrapperY, wrapperX + wrapperW, wrapperY + wrapperH);
                grad.addColorStop(0, "#f6d365");
                grad.addColorStop(1, "#fda085");
                ctx.fillStyle = grad;
                this.roundRectPath(wrapperX, wrapperY, wrapperW, wrapperH, 8);
                ctx.fill();
            }
        } else {
            // Default Gradient
            const grad = ctx.createLinearGradient(wrapperX, wrapperY, wrapperX + wrapperW, wrapperY + wrapperH);
            grad.addColorStop(0, "#f6d365");
            grad.addColorStop(1, "#fda085");
            ctx.fillStyle = grad;
            this.roundRectPath(wrapperX, wrapperY, wrapperW, wrapperH, 8);
            ctx.fill();
        }

        // Scale fonts based on width
        const scale = w / 120; // Base scale on original width 120

        // 2. Layout Constants - Moved slightly to top-left
        const leftColX = x + 20 * scale; // Reduced from 24 to move left

        // 3. Stats & Info (Text Color) - Adjust based on card type
        // Special cards use white text, icon cards have light backgrounds so use dark text
        // Other cards (gold) have dark backgrounds, so use light/dark brown text
        const isIcon = player.type === "icon";
        const isSpecial = player.isSpecial === true;
        ctx.fillStyle = isSpecial ? "#ffffff" : (isIcon ? "#1a1a1a" : "#3e3020"); // White for special, dark for icons, brown for gold cards
        ctx.textAlign = "center";

        // Rating - Round coordinates for crisp rendering, moved up and left
        ctx.font = `bold ${Math.round(22 * scale)}px ${this.getFontFamily()}`;
        ctx.fillText(player.rating, Math.round(leftColX), Math.round(y + 40 * scale)); // Moved up from 45 to 40

        // Position - Round coordinates for crisp rendering, moved up and left
        ctx.font = `bold ${Math.round(12 * scale)}px ${this.getFontFamily()}`;
        const posText = Array.isArray(player.position) ? player.position[0] : player.position;
        ctx.fillText(posText, Math.round(leftColX), Math.round(y + 57 * scale)); // Moved up from 62 to 57

        // Icons (Nation & Club) - removed to avoid clutter

        // Avatar (Right side / Center)
        // Different display rules for special vs normal avatars
        if (player.avatarImg) {
            const isSpecial = player.isSpecial === true;

            if (isSpecial) {
                // Special avatar: maintain aspect ratio to avoid distortion
                const avMaxSize = w * 1; // Max size for special cards
                const avX = x + w - avMaxSize - (5 * scale);
                const avY = y + 20 * scale; // Higher position for special cards
                this.drawNetImageAspect(player.avatarImg, avX, avY, avMaxSize, avMaxSize, 'right');
            } else {
                // Normal avatar: maintain aspect ratio, smaller size, moved to the left
                const avMaxSize = w * 0.6; // Max size for normal cards
                const avX = x + w - avMaxSize - (15 * scale); // Moved left by increasing offset from 5 to 15
                const avY = y + 40 * scale; // Lower position for normal cards
                this.drawNetImageAspect(player.avatarImg, avX, avY, avMaxSize, avMaxSize, 'right');
            }
        }

        // Name (Centered, lower half) - Round coordinates for crisp rendering
        ctx.fillStyle = isSpecial ? "#ffffff" : (isIcon ? "#1a1a1a" : "#3e3020"); // White for special, match text color based on card type
        ctx.font = `bold ${Math.round(12 * scale)}px ${this.getFontFamily()}`; // Smaller font size
        ctx.fillText(player.name.toUpperCase(), Math.round(x + w / 2), Math.round(y + h * 0.75)); // Moved down further

        if (!simplified) {
            // Stats Divider Lines (Horizontal)
            ctx.beginPath();
            ctx.moveTo(x + 10 * scale, y + h * 0.66);
            ctx.lineTo(x + w - 10 * scale, y + h * 0.66);
            ctx.strokeStyle = isIcon ? "rgba(26, 26, 26, 0.3)" : "rgba(62, 48, 32, 0.2)"; // Adjust for icon cards
            ctx.lineWidth = 1;
            ctx.stroke();

            // Stats Layout: All 6 stats in one row
            // Row 1: PAC SHO PAS DRI DEF PHY (labels)
            // Row 2: 90  91  91  96  40  77 (values)
            ctx.fillStyle = isSpecial ? "#ffffff" : (isIcon ? "#1a1a1a" : "#3e3020"); // White for special, match text color for stats
            ctx.textAlign = "center";

            const statsStartX = x + 10 * scale;
            const statsWidth = w - 20 * scale;
            const statsSpacing = statsWidth / 6; // 6 stats evenly spaced
            const labelY = y + h * 0.72;
            const valueY = y + h * 0.85;

            // Font sizes - Round for crisp rendering
            const labelFontSize = Math.round(9 * scale);
            const valueFontSize = Math.round(11 * scale);

            // Helper to safely get stat value
            const getStat = (name) => {
                const s = player.stats.find(st => st.value === name);
                return s ? s.number : "--";
            };

            // Stat order: PAC, SHO, PAS, DRI, DEF, PHY
            const statOrder = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'];

            statOrder.forEach((statName, index) => {
                const statX = Math.round(statsStartX + statsSpacing * (index + 0.5));
                const statValue = getStat(statName);

                // Draw label (category name) - Round coordinates
                ctx.font = `bold ${labelFontSize}px ${this.getFontFamily()}`;
                ctx.fillText(statName, statX, Math.round(labelY));

                // Draw value (number) - Round coordinates
                ctx.font = `bold ${valueFontSize}px ${this.getFontFamily()}`;
                ctx.fillText(statValue, statX, Math.round(valueY));
            });
        }

        ctx.restore();
    }
}
