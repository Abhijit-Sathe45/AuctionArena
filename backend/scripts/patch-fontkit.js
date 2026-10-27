const fs = require('fs');
const path = require('path');

function patchFontkit() {
  const fontkitPath = path.join(__dirname, '..', 'node_modules', 'fontkit', 'dist', 'main.cjs');
  if (!fs.existsSync(fontkitPath)) {
    return;
  }

  let code = fs.readFileSync(fontkitPath, 'utf8');

  // Check if already patched
  if (code.includes('if (!baseCoords || !markCoords) return;') && code.includes('if (!anchor) return null;')) {
    console.log('[patch-fontkit] fontkit is already patched.');
    return;
  }

  // 1. Patch applyAnchor to guard against null baseAnchor or markRecord
  const unpatchedApplyAnchor = `    applyAnchor(markRecord, baseAnchor, baseGlyphIndex) {
        let baseCoords = this.getAnchor(baseAnchor);
        let markCoords = this.getAnchor(markRecord.markAnchor);
        let basePos = this.positions[baseGlyphIndex];
        let markPos = this.positions[this.glyphIterator.index];
        markPos.xOffset = baseCoords.x - markCoords.x;
        markPos.yOffset = baseCoords.y - markCoords.y;
        this.glyphIterator.cur.markAttachment = baseGlyphIndex;
    }`;

  const patchedApplyAnchor = `    applyAnchor(markRecord, baseAnchor, baseGlyphIndex) {
        if (!markRecord || !baseAnchor || !markRecord.markAnchor) return;
        let baseCoords = this.getAnchor(baseAnchor);
        let markCoords = this.getAnchor(markRecord.markAnchor);
        if (!baseCoords || !markCoords) return;
        let basePos = this.positions[baseGlyphIndex];
        let markPos = this.positions[this.glyphIterator.index];
        markPos.xOffset = baseCoords.x - markCoords.x;
        markPos.yOffset = baseCoords.y - markCoords.y;
        this.glyphIterator.cur.markAttachment = baseGlyphIndex;
    }`;

  // 2. Patch getAnchor to safely return null when anchor is null
  const unpatchedGetAnchor = `    getAnchor(anchor) {
        // TODO: contour point, device tables
        let x = anchor.xCoordinate;
        let y = anchor.yCoordinate;`;

  const patchedGetAnchor = `    getAnchor(anchor) {
        if (!anchor) return null;
        // TODO: contour point, device tables
        let x = anchor.xCoordinate || 0;
        let y = anchor.yCoordinate || 0;`;

  let changed = false;
  if (code.includes(unpatchedApplyAnchor)) {
    code = code.replace(unpatchedApplyAnchor, patchedApplyAnchor);
    changed = true;
  }

  if (code.includes(unpatchedGetAnchor)) {
    code = code.replace(unpatchedGetAnchor, patchedGetAnchor);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(fontkitPath, code, 'utf8');
    console.log('[patch-fontkit] Successfully patched fontkit null anchor handling.');
  } else {
    // Fallback regex replacement if formatting slightly differs
    const regexAnchor = /getAnchor\(anchor\)\s*\{\s*\/\/\s*TODO:\s*contour point,\s*device tables\s*let x = anchor\.xCoordinate;\s*let y = anchor\.yCoordinate;/;
    if (regexAnchor.test(code)) {
      code = code.replace(
        regexAnchor,
        `getAnchor(anchor) {\n        if (!anchor) return null;\n        // TODO: contour point, device tables\n        let x = anchor.xCoordinate || 0;\n        let y = anchor.yCoordinate || 0;`
      );
      fs.writeFileSync(fontkitPath, code, 'utf8');
      console.log('[patch-fontkit] Regex patched fontkit getAnchor.');
    }
  }
}

patchFontkit();
module.exports = patchFontkit;
