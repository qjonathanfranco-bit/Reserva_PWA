/* ===== BUSCADOR DE IMÁGENES REALES (estilo Google Imágenes) =====
   - Fotos buscadas en vivo: Google (si hay clave en BUSCADOR_CONFIG) o Wikimedia Commons.
   - Miniaturas con lazy loading nativo (loading="lazy").
   - 1er clic: se agranda en un panel bajo su fila. 2º clic en la foto grande: abre Google Imágenes.
   - Enter con texto en la barra: búsqueda en vivo de ese texto. */
(function () {
    var CFG = window.BUSCADOR_CONFIG || {};
    var DATA = window.CAROUSEL_IMAGES || {};
    var CATS = {
        wally:  { label: 'Wally',    term: 'wallyball', q: 'wallyball',        google: 'wallyball' },
        voley:  { label: 'Voleibol', term: 'voleibol',  q: 'volleyball match', google: 'voleibol' },
        futsal: { label: 'Fútbol',   term: 'fútbol',    q: 'futsal match',     google: 'fútbol' }
    };
    var INFO = {
        wally: { title: '¿Qué es el wally?', text: 'El wally (wallyball) es una variante del voleibol que se juega en una cancha cerrada por paredes, como las de racquetball. La pelota puede rebotar en las paredes y seguir en juego, lo que hace los intercambios más largos y dinámicos. Se juega con red y por equipos, normalmente de 4 a 6 personas.' },
        voley: { title: '¿Qué es el voleibol?', text: 'El voleibol es un deporte de equipo donde dos conjuntos se enfrentan separados por una red e intentan hacer caer el balón en el campo contrario sin que toque el suelo en el propio. Fue creado en 1895 por William G. Morgan en Estados Unidos y hoy es deporte olímpico.' },
        futsal: { title: '¿Qué es el fútbol?', text: 'El fútbol es un deporte de equipo en el que dos conjuntos buscan meter el balón en la portería rival, principalmente con los pies. Sus reglas modernas se fijaron en Inglaterra en 1863. El futsal (fútbol sala) es su versión en cancha pequeña y cerrada, con equipos de 5 jugadores.' }
    };
    var SIZES = [{ v: '', t: 'Cualquier tamaño' }, { v: 'l', t: 'Grande' }, { v: 'm', t: 'Mediano' }, { v: 'i', t: 'Ícono' }];
    var N = CFG.porDeporte || 20;
    var USE_GOOGLE = !!(CFG.googleKey && CFG.googleCx);

    var $ = function (id) { return document.getElementById(id); };
    var grid = $('gs-grid'), input = $('gs-input'), form = $('gs-form'), tabs = $('gs-tabs');
    var know = $('gs-knowledge'), count = $('gs-count'), empty = $('gs-empty'), credit = $('gs-credit');
    if (!grid) return;

    var STORE = { wally: [], voley: [], futsal: [] };
    var LIVE = null;               // resultados de una búsqueda escrita
    var pending = 0, offline = false;
    var cat = 'all', open = null, panel = null, started = false;

    function norm(t) { return (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
    function googleUrl(q, size) {
        var u = 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q);
        return size ? u + '&tbs=isz:' + size : u;
    }

    /* ---------- Proveedores de fotos ---------- */
    function fromGoogle(q) {
        function page(start) {
            var u = 'https://www.googleapis.com/customsearch/v1?searchType=image&num=10&start=' + start +
                '&key=' + encodeURIComponent(CFG.googleKey) + '&cx=' + encodeURIComponent(CFG.googleCx) +
                '&q=' + encodeURIComponent(q);
            return fetch(u).then(function (r) { if (!r.ok) throw new Error('google ' + r.status); return r.json(); });
        }
        return Promise.all([page(1), page(11).catch(function () { return { items: [] }; })]).then(function (rs) {
            var out = [];
            rs.forEach(function (j) {
                (j.items || []).forEach(function (it) {
                    out.push({
                        alt: it.title || q, src: (it.image && it.image.thumbnailLink) || it.link,
                        full: it.link, page: it.image && it.image.contextLink, source: 'Google Imágenes'
                    });
                });
            });
            return out;
        });
    }

    function fromCommons(q) {
        var u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' +
            '&generator=search&gsrnamespace=6&gsrlimit=40' +
            '&gsrsearch=' + encodeURIComponent(q + ' filetype:bitmap') +
            '&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=480';
        return fetch(u).then(function (r) { if (!r.ok) throw new Error('commons ' + r.status); return r.json(); })
            .then(function (j) {
                var pages = Object.keys((j.query && j.query.pages) || {}).map(function (k) { return j.query.pages[k]; });
                pages.sort(function (a, b) { return (a.index || 0) - (b.index || 0); });
                var out = [];
                pages.forEach(function (p) {
                    var info = p.imageinfo && p.imageinfo[0];
                    if (!info || info.mime !== 'image/jpeg' || info.width < 800 || !info.thumburl) return;
                    var title = p.title.replace(/^File:/, '').replace(/\.[^.]+$/, '').replace(/_/g, ' ');
                    if (/logo|map|flag|diagram|poster|stamp|coin|screenshot/i.test(title)) return;
                    var full = info.width >= 1280 ? info.thumburl.replace(/\/\d+px-/, '/1280px-') : info.thumburl;
                    out.push({ alt: title, src: info.thumburl, full: full, page: info.descriptionurl, source: 'Wikimedia Commons' });
                });
                return out;
            });
    }
    function fetchPhotos(q) { return (USE_GOOGLE ? fromGoogle(q) : fromCommons(q)).then(function (a) { return a.slice(0, N); }); }

    function localFallback(c) {
        return (DATA[c === 'futsal' ? 'futsal' : c] || []).map(function (it) {
            return { alt: it.alt, src: it.local, full: it.local, local: true };
        });
    }

    function loadCat(c) {
        pending++;
        fetchPhotos(CATS[c].q).then(function (list) {
            STORE[c] = list.length ? list : localFallback(c);
            if (!list.length) offline = true;
        }).catch(function () {
            STORE[c] = localFallback(c); offline = true;
        }).then(function () { pending--; render(); });
    }

    /* ---------- Vista ---------- */
    function visibleItems() {
        var base = [];
        if (LIVE) {
            base = LIVE.map(function (it) { it.cat = it.cat || 'live'; return it; });
        } else if (cat !== 'all') {
            base = STORE[cat].map(function (it) { it.cat = cat; return it; });
        } else {
            var keys = Object.keys(CATS), i = 0, more = true;
            while (more) {                                     // intercala los 3 deportes
                more = false;
                keys.forEach(function (k) {
                    if (STORE[k][i]) { STORE[k][i].cat = k; base.push(STORE[k][i]); more = true; }
                });
                i++;
            }
        }
        var q = norm(input.value.trim());
        if (q && !LIVE) {
            base = base.filter(function (it) {
                var hay = norm(it.alt + ' ' + CATS[it.cat].label + ' ' + CATS[it.cat].term + (it.cat === 'futsal' ? ' futbol futsal' : ''));
                return q.split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
            });
        }
        return base;
    }

    function queryFor(it) {
        var typed = input.value.trim();
        if (LIVE && typed) return typed;
        return CATS[it.cat] ? CATS[it.cat].google : (typed || it.alt);
    }

    function closePanel() {
        if (panel) { panel.remove(); panel = null; }
        if (open) { open.classList.remove('is-open'); open = null; }
    }

    function render() {
        closePanel();
        var list = visibleItems();
        grid.textContent = '';
        list.forEach(function (it) {
            var b = document.createElement('button');
            b.type = 'button'; b.className = 'gs-thumb';
            b.setAttribute('aria-label', 'Ampliar: ' + it.alt);
            var im = document.createElement('img');
            im.loading = 'lazy'; im.decoding = 'async';
            im.width = 480; im.height = 480; im.alt = it.alt;
            im.referrerPolicy = 'no-referrer';
            im.onload = function () { b.classList.add('loaded'); };
            im.onerror = function () { b.remove(); };        // foto rota: se quita
            im.src = it.src;
            var cap = document.createElement('span');
            cap.className = 'gs-cap'; cap.textContent = it.alt;
            b.appendChild(im); b.appendChild(cap);
            b._item = it;
            grid.appendChild(b);
        });

        var loading = pending > 0;
        empty.hidden = loading || list.length > 0;
        count.textContent = loading ? '⏳ Buscando fotos reales…' :
            (list.length ? list.length + ' imágenes' + (offline ? ' · sin conexión, mostrando respaldo' : '') : '');
        credit.hidden = !list.length || offline;
        credit.textContent = 'Fotos: ' + (USE_GOOGLE ? 'Google Imágenes' : 'Wikimedia Commons (licencias libres)') + '. Toca una foto para ampliarla.';

        var q = norm(input.value.trim());
        var showCat = LIVE ? null : (cat !== 'all' ? cat : (function () {
            var hit = Object.keys(CATS).filter(function (k) {
                return q && (norm(CATS[k].label).indexOf(q) !== -1 || (k === 'futsal' && 'futbol'.indexOf(q) !== -1));
            });
            return hit.length === 1 ? hit[0] : null;
        })());
        if (showCat) {
            know.hidden = false; know.textContent = '';
            var h = document.createElement('h3'); h.textContent = INFO[showCat].title;
            var p = document.createElement('p'); p.textContent = INFO[showCat].text;
            know.appendChild(h); know.appendChild(p);
        } else { know.hidden = true; }
    }

    function openPanel(btn) {
        var it = btn._item, wasSame = open === btn;
        closePanel();
        if (wasSame) return;
        open = btn; btn.classList.add('is-open');

        var top = btn.offsetTop, last = btn, n = btn.nextElementSibling;
        while (n && n.classList.contains('gs-thumb') && n.offsetTop === top) { last = n; n = n.nextElementSibling; }

        var query = queryFor(it);
        panel = document.createElement('div'); panel.className = 'gs-panel';

        var big = document.createElement('a');
        big.className = 'gs-big'; big.target = '_blank'; big.rel = 'noopener'; big.title = 'Ver en Google Imágenes';
        var im = document.createElement('img');
        im.alt = it.alt; im.referrerPolicy = 'no-referrer';
        im.onerror = function () { im.onerror = null; im.src = it.src; };   // si la grande falla, usa la miniatura
        im.src = it.full || it.src;
        big.appendChild(im);

        var side = document.createElement('div'); side.className = 'gs-side';
        var h = document.createElement('h4'); h.textContent = it.alt;
        var tag = document.createElement('span'); tag.className = 'gs-tag';
        tag.textContent = CATS[it.cat] ? CATS[it.cat].label : 'Resultado';
        var lab = document.createElement('label'); lab.className = 'gs-size-lab'; lab.textContent = 'Resolución en Google:';
        var sel = document.createElement('select'); sel.className = 'gs-size';
        SIZES.forEach(function (s) { var o = document.createElement('option'); o.value = s.v; o.textContent = s.t; sel.appendChild(o); });
        var go = document.createElement('a');
        go.className = 'gs-visit'; go.target = '_blank'; go.rel = 'noopener'; go.textContent = 'Ver en Google Imágenes ↗';
        function upd() { go.href = googleUrl(query, sel.value); big.href = go.href; }
        sel.addEventListener('change', upd); upd();

        side.appendChild(h); side.appendChild(tag);
        if (it.page) {
            var src = document.createElement('a');
            src.className = 'gs-src'; src.href = it.page; src.target = '_blank'; src.rel = 'noopener';
            src.textContent = 'Fuente: ' + (it.source || 'original') + ' ↗';
            side.appendChild(src);
        }
        side.appendChild(lab); side.appendChild(sel); side.appendChild(go);

        var x = document.createElement('button');
        x.type = 'button'; x.className = 'gs-x'; x.setAttribute('aria-label', 'Cerrar'); x.textContent = '✕';
        x.addEventListener('click', closePanel);

        panel.appendChild(big); panel.appendChild(side); panel.appendChild(x);
        last.after(panel);
        panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    /* ---------- Eventos ---------- */
    grid.addEventListener('click', function (e) { var b = e.target.closest('.gs-thumb'); if (b) openPanel(b); });

    tabs.addEventListener('click', function (e) {
        var t = e.target.closest('.gs-tab'); if (!t) return;
        cat = t.dataset.cat; LIVE = null; input.value = '';
        tabs.querySelectorAll('.gs-tab').forEach(function (b) {
            b.classList.toggle('active', b === t);
            b.setAttribute('aria-pressed', b === t ? 'true' : 'false');
        });
        render();
    });

    input.addEventListener('input', function () { if (LIVE) { LIVE = null; } render(); });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = input.value.trim();
        if (!q) { LIVE = null; render(); return; }
        pending++; LIVE = []; render();
        fetchPhotos(q).then(function (l) { LIVE = l; offline = false; })
            .catch(function () { LIVE = []; offline = true; })
            .then(function () { pending--; render(); });
        input.blur();
    });

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
    window.addEventListener('resize', closePanel);

    /* Carga perezosa de la sección: busca las fotos al abrir la pestaña por primera vez */
    function start() {
        if (started) return; started = true;
        Object.keys(CATS).forEach(loadCat);
        render();
    }
    document.querySelectorAll('.nav-link[data-sport="buscador"]').forEach(function (a) { a.addEventListener('click', start); });
    render();
})();
