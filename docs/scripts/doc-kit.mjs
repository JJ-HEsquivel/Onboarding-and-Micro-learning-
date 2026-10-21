// =============================================================================
// doc-kit.mjs
// Piezas comunes para generar los documentos PDF del proyecto a partir del
// código REAL: extraer fragmentos de archivos, pintarlos como un editor,
// bloques de terminal y los estilos base (página A4).
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';

const KEYWORDS = new Set(
  (
    'import export from const let var function return async await if else for of in new throw try catch finally ' +
    'type interface extends as default null undefined true false while switch case break continue typeof keyof satisfies class static public private readonly void'
  ).split(' '),
);

export const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Resaltado simple para TypeScript/TSX/CSS: palabras clave, textos, comentarios, números y funciones. */
export function highlightLine(line, state) {
  let html = '';
  let i = 0;
  while (i < line.length) {
    if (state.inComment) {
      const end = line.indexOf('*/', i);
      const stop = end < 0 ? line.length : end + 2;
      html += `<span class="c">${esc(line.slice(i, stop))}</span>`;
      if (end >= 0) state.inComment = false;
      i = stop;
      continue;
    }
    const rest = line.slice(i);
    let m;
    if (rest.startsWith('//')) {
      html += `<span class="c">${esc(rest)}</span>`;
      break;
    }
    if (rest.startsWith('/*')) {
      state.inComment = true;
      continue;
    }
    if ((m = rest.match(/^(['"`])(?:\\.|(?!\1).)*\1?/))) {
      html += `<span class="s">${esc(m[0])}</span>`;
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^\d[\d_]*/))) {
      html += `<span class="n">${m[0]}</span>`;
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^[A-Za-z_$][\w$]*/))) {
      const word = m[0];
      const next = rest.slice(word.length);
      if (KEYWORDS.has(word)) html += `<span class="k">${word}</span>`;
      else if (/^\s*\(/.test(next) || /^\s*=\s*(async\s*)?\(/.test(next)) html += `<span class="f">${word}</span>`;
      else if (/^[A-Z]/.test(word)) html += `<span class="t">${word}</span>`;
      else html += esc(word);
      i += word.length;
      continue;
    }
    html += esc(line[i]);
    i++;
  }
  return html;
}

/** Crea snippet() y code() para el proyecto ubicado en `root`. */
export function createKit(root) {
  const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n').split('\n');

  /**
   * Fragmento desde la primera línea que coincide con `from` hasta la primera posterior que coincide con `to`.
   * Sin `to`, toma el archivo completo desde `from`. `back` agrega líneas antes del inicio.
   */
  function snippet(rel, from, to, { skip = 0, back = 0 } = {}) {
    const lines = read(rel);
    let start = -1;
    let seen = 0;
    for (let i = 0; i < lines.length; i++) {
      if (from.test(lines[i])) {
        if (seen === skip) {
          start = i;
          break;
        }
        seen++;
      }
    }
    if (start < 0) throw new Error(`No se encontró el inicio ${from} en ${rel}`);
    let end = lines.length - 1;
    if (to) {
      end = lines.findIndex((l, i) => i > start && to.test(l));
      if (end < 0) throw new Error(`No se encontró el fin ${to} en ${rel}`);
    } else {
      while (end > start && !lines[end].trim()) end--;
    }
    start = Math.max(0, start - back);
    return { rel, first: start + 1, lines: lines.slice(start, end + 1) };
  }

  /** "Captura" de código: ventana de editor con nombre de archivo, números de línea y colores. */
  function code(snip, caption) {
    const state = { inComment: false };
    const indent = Math.min(...snip.lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    const rows = snip.lines
      .map((l, i) => `<tr><td class="ln">${snip.first + i}</td><td>${highlightLine(l.slice(indent), state) || ' '}</td></tr>`)
      .join('');
    return `<figure class="code">
    <div class="code__bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="code__file">${snip.rel} · líneas ${snip.first}–${snip.first + snip.lines.length - 1}</span></div>
    <table>${rows}</table>
    ${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}
  </figure>`;
  }

  return { snippet, code };
}

/** Bloque de terminal. Las líneas que empiezan con "#" son comentarios. */
export function terminal(commands, caption) {
  const rows = commands
    .split('\n')
    .map((l) => (l.startsWith('#') ? `<div class="c">${esc(l)}</div>` : `<div><span class="prompt">PS&gt;</span> ${esc(l)}</div>`))
    .join('');
  return `<figure class="code terminal">
    <div class="code__bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="code__file">Terminal · PowerShell</span></div>
    <div class="terminal__body">${rows}</div>
    ${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}
  </figure>`;
}

/** Estilos base de los documentos (página A4). */
export const BASE_CSS = `
  @page { size: A4; margin: 16mm 14mm 16mm 14mm; }
  :root { --ink:#0f172a; --muted:#475569; --line:#e2e8f0; --brand:#1d4ed8; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:'Segoe UI',system-ui,sans-serif; color:var(--ink); font-size:10.5pt; line-height:1.5; }
  h1 { font-size:24pt; margin:0 0 6px; line-height:1.15; }
  h2 { font-size:15pt; margin:26px 0 8px; padding-bottom:4px; border-bottom:2px solid var(--brand); break-after:avoid; }
  h3 { font-size:12pt; margin:18px 0 6px; color:var(--brand); break-after:avoid; }
  p { margin:6px 0; }
  ul, ol { margin:6px 0; padding-left:20px; }
  li { margin:2px 0; }
  code { font-family:Consolas,'Cascadia Mono',monospace; font-size:9pt; background:#f1f5f9; padding:0 3px; border-radius:3px; }
  .cover { height: 250mm; display:flex; flex-direction:column; justify-content:center; break-after:page; }
  .cover__tag { color:var(--brand); font-weight:700; letter-spacing:.08em; text-transform:uppercase; font-size:10pt; }
  .cover__sub { font-size:13pt; color:var(--muted); max-width:150mm; }
  .cover__meta { margin-top:30px; font-size:10pt; color:var(--muted); }
  .toc { margin-top:30px; padding:14px 18px; border:1px solid var(--line); border-radius:10px; font-size:10pt; }
  .toc ol { margin:4px 0 0; }
  .page { break-before: page; }
  .note { padding:8px 12px; border-left:4px solid var(--brand); background:#eef3ff; border-radius:6px; margin:10px 0; font-size:10pt; }
  .warn { border-left-color:#ca8a04; background:#fef6e0; }
  table.grid { width:100%; border-collapse:collapse; margin:8px 0; font-size:9.5pt; break-inside:auto; }
  table.grid th, table.grid td { border:1px solid var(--line); padding:5px 7px; text-align:left; vertical-align:top; }
  table.grid th { background:#f8fafc; font-weight:600; }
  table.grid tr { break-inside:avoid; }
  .diagram { width:100%; height:auto; margin:8px 0; break-inside:avoid; }
  .svgtext { font-size:10px; line-height:1.3; color:#334155; text-align:center; font-family:'Segoe UI',sans-serif; }
  .svgtext code { font-size:9px; background:none; padding:0; color:#0f172a; }
  .legend { display:flex; gap:16px; font-size:9pt; color:var(--muted); margin:-2px 0 8px; }
  .legend span::before { content:''; display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:5px; vertical-align:-1px; background:var(--c); }
  /* Capturas de código y terminal */
  .code { margin:10px 0 14px; border-radius:8px; overflow:hidden; background:#0f172a; break-inside:avoid; }
  .code__bar { display:flex; align-items:center; gap:6px; padding:6px 10px; background:#1e293b; }
  .code__bar .dot { width:9px; height:9px; border-radius:50%; background:#475569; }
  .code__bar .dot:nth-child(1){background:#ef4444}.code__bar .dot:nth-child(2){background:#eab308}.code__bar .dot:nth-child(3){background:#22c55e}
  .code__file { margin-left:8px; color:#cbd5e1; font-family:Consolas,monospace; font-size:8.5pt; }
  .code table { border-collapse:collapse; width:100%; font-family:Consolas,'Cascadia Mono',monospace; font-size:8.3pt; line-height:1.45; color:#e2e8f0; }
  .code td { padding:0 10px 0 0; white-space:pre-wrap; word-break:break-word; vertical-align:top; }
  .code td.ln { width:1%; padding:0 10px; color:#64748b; text-align:right; user-select:none; white-space:nowrap; }
  .code tr:first-child td { padding-top:8px; } .code tr:last-child td { padding-bottom:8px; }
  .code figcaption { padding:6px 12px; background:#f8fafc; color:var(--muted); font-size:9pt; font-family:'Segoe UI',sans-serif; border-top:1px solid #1e293b; }
  .terminal__body { padding:8px 12px; font-family:Consolas,monospace; font-size:8.6pt; color:#e2e8f0; line-height:1.6; white-space:pre-wrap; }
  .prompt { color:#22c55e; margin-right:4px; }
  .k{color:#c084fc}.s{color:#86efac}.c{color:#64748b;font-style:italic}.n{color:#fdba74}.f{color:#93c5fd}.t{color:#5eead4}
  .two { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .screen { border:1px solid var(--line); border-radius:10px; padding:10px 12px; break-inside:avoid; }
  .screen h4 { margin:0 0 4px; font-size:10.5pt; }
  .screen .who { font-size:8.5pt; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--brand); }
  .badge { display:inline-block; padding:0 7px; border-radius:999px; font-size:8.5pt; font-weight:600; }
  .b-warn{background:#fef6e0;color:#a16207}.b-info{background:#eaf0ff;color:#1d4ed8}.b-ok{background:#e7f6ec;color:#15803d}.b-neutral{background:#f1f5f9;color:#475569}.b-danger{background:#fdecec;color:#b91c1c}
`;
