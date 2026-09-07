// ═══ Carmon Oil — lightweight text formatting for product descriptions ═══
// Admins write plain text with a few markdown-style marks; this turns it into
// readable HTML for the site / Mini App and into Telegram-flavoured HTML for
// bot and channel posts. UMD: `require()` in Node, `window.TextFmt` in browsers.
//
//   blank line          → new paragraph
//   line break          → kept
//   - item / • item     → bulleted list
//   **bold**  *italic*  `code`
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TextFmt = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const esc = s => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Inline marks on an already-escaped line
  function inline(s) {
    return s
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>')
      .replace(/(^|[\s(])_([^_\s][^_]*?)_(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>')
      .replace(/`([^`]+?)`/g, '<code>$1</code>');
  }

  const isBullet = l => /^\s*([-•*]|\d+[.)])\s+/.test(l);
  const bulletText = l => l.replace(/^\s*([-•*]|\d+[.)])\s+/, '');

  // Split into blocks separated by blank lines
  function blocks(text) {
    return String(text ?? '').replace(/\r\n?/g, '\n').trim().split(/\n\s*\n/).filter(Boolean);
  }

  // Browser HTML: <p>, <br>, <ul><li>. Bullet runs become lists even when they
  // share a block with a heading line ("Benefits:\n- a\n- b").
  function toHtml(text) {
    if (!text) return '';
    return blocks(text).map(b => {
      let out = '', para = [], list = [];
      const flushP = () => { if (para.length) { out += '<p>' + para.map(l => inline(esc(l))).join('<br>') + '</p>'; para = []; } };
      const flushL = () => { if (list.length) { out += '<ul>' + list.map(l => `<li>${inline(esc(bulletText(l)))}</li>`).join('') + '</ul>'; list = []; } };
      for (const l of b.split('\n')) {
        if (isBullet(l)) { flushP(); list.push(l); }
        else { flushL(); para.push(l); }
      }
      flushP(); flushL();
      return out;
    }).join('');
  }

  // Telegram HTML (parse_mode: 'HTML' supports b/i/code but no p/ul/br)
  function toTelegram(text) {
    if (!text) return '';
    return blocks(text).map(b =>
      b.split('\n').map(l => isBullet(l) ? '• ' + inline(esc(bulletText(l))) : inline(esc(l))).join('\n')
    ).join('\n\n');
  }

  // Plain text with marks stripped (for previews / meta)
  function toPlain(text) {
    return String(text ?? '').replace(/\*\*|`|(^|\s)[*_](?=\S)|(?<=\S)[*_](?=\s|$)/g, '$1').replace(/\r\n?/g, '\n').trim();
  }

  return { toHtml, toTelegram, toPlain, esc };
});
