$(document).ready(function() {
    let estadoSistema = {
        wally: {
            subCanchas: {
                'A': { jugadores: [], timerConfirm: null, timerOcupado: null, ocupada: false, segundosRestantes: 0 },
                'B': { jugadores: [], timerConfirm: null, timerOcupado: null, ocupada: false, segundosRestantes: 0 },
                'C': { jugadores: [], timerConfirm: null, timerOcupado: null, ocupada: false, segundosRestantes: 0 }
            },
            canchaSeleccionada: 'A',
            precioBase: 40,
            hidratacion: { nombre: 'Sin pack', precio: 0 },
            modo: 'individual',
            max: 16
        },
        futsal: { 
            jugadores: [], 
            timerConfirm: null, 
            timerOcupado: null, 
            ocupada: false, 
            segundosRestantes: 0, 
            precioBase: 120,
            hidratacion: { nombre: 'Sin pack', precio: 0 },
            modo: 'individual', 
            max: 16 
        },
        voley: { 
            jugadores: [], 
            timerConfirm: null, 
            timerOcupado: null, 
            ocupada: false, 
            segundosRestantes: 0, 
            precioBase: 80,
            hidratacion: { nombre: 'Sin pack', precio: 0 },
            modo: 'individual', 
            max: 16 
        }
    };

    // 1. EFECTO DE GLOBOS AL HACER CLIC EN ICONOS / BOTONES
    const emojilist = ['🎈', '🎈', '🎉', '💥', '⭐', '🏐', '⚽', '🏆'];

    $(document).on('click', '.spawn-balloon, .cancha-chip, .btn-modo, .slot-btn, .nav-link', function(e) {
        let posX = e.clientX;
        let posY = e.clientY;

        // Crear 3 globos/burbujas por clic
        for (let i = 0; i < 3; i++) {
            let randomEmoji = emojilist[Math.floor(Math.random() * emojilist.length)];
            let $balloon = $('<div class="floating-balloon"></div>').text(randomEmoji);

            let offsetX = (Math.random() - 0.5) * 40;
            let offsetY = (Math.random() - 0.5) * 20;

            $balloon.css({
                left: (posX + offsetX) + 'px',
                top: (posY + offsetY) + 'px'
            });

            $('body').append($balloon);

            setTimeout(function() {
                $balloon.remove();
            }, 1200);
        }
    });

    // 2. TOGGLE MODO OSCURO Y CLARO (CORREGIDO)
    $('#theme-toggle').click(function() {
        $('body').toggleClass('light-theme');
        if ($('body').hasClass('light-theme')) {
            $(this).text('☀️ Modo Claro');
        } else {
            $(this).text('🌙 Modo Oscuro');
        }
    });

    // 3. NAVEGACIÓN ENTRE DEPORTES
    $('.nav-link').click(function(e) {
        e.preventDefault();
        $('.nav-link').removeClass('active');
        $(this).addClass('active');

        let sport = $(this).data('sport');
        $('body').removeClass('theme-wally theme-futsal theme-voley').addClass('theme-' + sport);

        $('.content-section').hide();
        $('#' + sport).fadeIn(200);
    });

    // 4. SELECCIÓN DE SLOTS DE HORARIO
    $('.slot-btn').click(function() {
        if ($(this).hasClass('ocupado')) return;

        let sport = $(this).closest('.slots-grid').data('sport');
        $(`.slots-grid[data-sport="${sport}"] .slot-btn`).removeClass('active');
        $(this).addClass('active');

        let horaSeleccionada = $(this).data('time');
        $('#hora-' + sport).val(horaSeleccionada);
    });

    // 5. ENFOQUE DE FOTO EN WALLYS
    $('.cancha-chip').click(function() {
        let letraCancha = $(this).data('cancha');
        let precioCancha = parseFloat($(this).data('precio')) || 40;

        estadoSistema.wally.canchaSeleccionada = letraCancha;
        estadoSistema.wally.precioBase = precioCancha;
        $('#lbl-cancha-wally').text(letraCancha);
        $('#input-precio-wally').val(precioCancha);

        $('.cancha-chip').addClass('hidden');
        $(this).removeClass('hidden').addClass('selected');
        $('#btn-ver-todas-wally').fadeIn();

        sincronizarVistaWally();
    });

    $('#btn-ver-todas-wally').click(function() {
        $('.cancha-chip').removeClass('hidden');
        $(this).fadeOut();
    });

    // 6. SELECTOR MODO INDIVIDUAL VS CONJUNTO
    $('.btn-modo').click(function() {
        let sport = $(this).data('sport');
        let modo = $(this).data('modo');

        $(`.btn-modo[data-sport="${sport}"]`).removeClass('active');
        $(this).addClass('active');

        estadoSistema[sport].modo = modo;

        if (modo === 'individual') {
            $(`#row-cuota-${sport}`).show();
            $(`#row-total-${sport}`).hide();
            $(`#panel-individual-${sport}`).fadeIn(150);
            $(`#panel-conjunto-${sport}`).hide();
        } else {
            $(`#row-cuota-${sport}`).hide();
            $(`#row-total-${sport}`).show();
            $(`#panel-individual-${sport}`).hide();
            $(`#panel-conjunto-${sport}`).fadeIn(150);
        }
        actualizarCalculos(sport);
    });

    // 7. SELECTOR DE PACK DE HIDRATACIÓN
    $('.btn-hidra').click(function() {
        let sport = $(this).data('sport');
        let precio = parseFloat($(this).data('precio')) || 0;
        let nombre = $(this).data('nombre');

        $(`.btn-hidra[data-sport="${sport}"]`).removeClass('active');
        $(this).addClass('active');

        estadoSistema[sport].hidratacion = {
            nombre: nombre,
            precio: precio
        };

        let hidraTexto = precio > 0 ? `${nombre} (+${precio.toFixed(2)} Bs)` : 'Sin pack (0 Bs)';
        $(`#lbl-hidra-${sport}`).text(hidraTexto);

        actualizarCalculos(sport);
    });

    $('#input-precio-wally').on('input', function() { actualizarCalculos('wally'); });
    $('#input-precio-futsal').on('input', function() { actualizarCalculos('futsal'); });
    $('#input-precio-voley').on('input', function() { actualizarCalculos('voley'); });

    function sincronizarVistaWally() {
        let canchaKey = estadoSistema.wally.canchaSeleccionada;
        let subData = estadoSistema.wally.subCanchas[canchaKey];

        renderizarLista('wally');
        actualizarCalculos('wally');

        let $pill = $('#status-cancha-wally');
        if (subData.ocupada) {
            $pill.removeClass('disponible').addClass('ocupado');
            $pill.find('#lbl-status-wally').html(`🔴 Ocupada`);
            $('#timer-ocupado-wally').show();
        } else {
            $pill.removeClass('ocupado').addClass('disponible');
            $pill.find('#lbl-status-wally').html(`🟢 Libre`);
            $('#timer-ocupado-wally').hide();
        }

        if (subData.timerConfirm) {
            $('#btn-iniciar-timer-wally').hide();
            $('#display-timer-confirm-wally').show();
        } else {
            $('#display-timer-confirm-wally').hide();
            $('#btn-iniciar-timer-wally').show();
        }
    }

    function actualizarCalculos(sport) {
        let jugadores = sport === 'wally' 
            ? estadoSistema.wally.subCanchas[estadoSistema.wally.canchaSeleccionada].jugadores 
            : estadoSistema[sport].jugadores;

        let inputVal = parseFloat($('#input-precio-' + sport).val());
        let precioCancha = !isNaN(inputVal) && inputVal > 0 ? inputVal : (estadoSistema[sport].precioBase || 0);
        let precioHidra = (estadoSistema[sport].hidratacion && estadoSistema[sport].hidratacion.precio) || 0;
        let precioTotal = precioCancha + precioHidra;

        let totalJugadores = jugadores.length;

        let montoTotal = precioTotal.toFixed(2);
        $('#monto-total-conjunto-' + sport).text(montoTotal);
        $('#total-jugadores-' + sport).text(totalJugadores);

        if (totalJugadores > 0 && precioTotal > 0) {
            let cuota = (precioTotal / totalJugadores).toFixed(2);
            $('#cuota-persona-' + sport).text(cuota);
        } else {
            $('#cuota-persona-' + sport).text('0.00');
        }

        if (estadoSistema[sport].modo === 'individual') {
            let cuotaActual = (totalJugadores > 0 && precioTotal > 0) ? (precioTotal / totalJugadores).toFixed(2) : '0.00';
            $('#monto-qr-' + sport).text(cuotaActual);
        } else {
            $('#monto-qr-' + sport).text(montoTotal);
        }
    }

    function agregarJugador(sport) {
        let subData = sport === 'wally' 
            ? estadoSistema.wally.subCanchas[estadoSistema.wally.canchaSeleccionada] 
            : estadoSistema[sport];

        if (subData.ocupada) { alert("❌ Cancha ocupada."); return; }

        let nombre = $('#nombre-jugador-' + sport).val().trim();
        if (!nombre) return;

        if (subData.jugadores.length >= 16) { alert("⚠️ Máximo 16 integrantes."); return; }

        subData.jugadores.push({ nombre: nombre, confirmado: false, pagado: false });
        renderizarLista(sport);
        $('#nombre-jugador-' + sport).val('');
        actualizarCalculos(sport);
    }

    function renderizarLista(sport) {
        let jugadores = sport === 'wally' 
            ? estadoSistema.wally.subCanchas[estadoSistema.wally.canchaSeleccionada].jugadores 
            : estadoSistema[sport].jugadores;

        let $lista = $('#lista-jugadores-' + sport).empty();

        jugadores.forEach((j, i) => {
            $lista.append(`
                <li>
                    <span>${j.nombre}</span>
                    <div>
                        <button class="btn-check-asistencia spawn-balloon ${j.confirmado?'confirmado':''}" data-sport="${sport}" data-index="${i}">${j.confirmado?'✔':'⏳'}</button>
                        <button class="btn-check-pago spawn-balloon ${j.pagado?'pagado':''}" data-sport="${sport}" data-index="${i}">${j.pagado?'🟢':'🔴'}</button>
                    </div>
                </li>
            `);
        });
    }

    $('#btn-anotar-wally').click(function() { agregarJugador('wally'); });
    $('#btn-anotar-futsal').click(function() { agregarJugador('futsal'); });
    $('#btn-anotar-voley').click(function() { agregarJugador('voley'); });

    $(document).on('click', '.btn-check-asistencia', function() {
        let sport = $(this).data('sport');
        let i = $(this).data('index');
        let subData = sport === 'wally' ? estadoSistema.wally.subCanchas[estadoSistema.wally.canchaSeleccionada] : estadoSistema[sport];
        subData.jugadores[i].confirmado = !subData.jugadores[i].confirmado;
        renderizarLista(sport);
    });

    $(document).on('click', '.btn-check-pago', function() {
        let sport = $(this).data('sport');
        let i = $(this).data('index');
        let subData = sport === 'wally' ? estadoSistema.wally.subCanchas[estadoSistema.wally.canchaSeleccionada] : estadoSistema[sport];
        subData.jugadores[i].pagado = !subData.jugadores[i].pagado;
        renderizarLista(sport);
    });

    $('.btn-timer-mini').click(function() {
        let sport = $(this).attr('id').replace('btn-iniciar-timer-', '');
        let subData = sport === 'wally' ? estadoSistema.wally.subCanchas[estadoSistema.wally.canchaSeleccionada] : estadoSistema[sport];
        let tiempo = 10 * 60;

        $('#btn-iniciar-timer-' + sport).hide();
        $('#display-timer-confirm-' + sport).show();

        if (subData.timerConfirm) clearInterval(subData.timerConfirm);

        subData.timerConfirm = setInterval(() => {
            let m = Math.floor(tiempo / 60), s = tiempo % 60;
            $('#time-left-' + sport).text(`${m<10?'0':''}${m}:${s<10?'0':''}${s}`);
            if (tiempo-- <= 0) {
                clearInterval(subData.timerConfirm);
                subData.timerConfirm = null;
                subData.jugadores = [];
                if (sport === 'wally') sincronizarVistaWally(); else renderizarLista(sport);
            }
        }, 1000);
    });

    $('.btn-finalizar-reserva-mini').click(function() {
        let sport = $(this).attr('id').replace('btn-finalizar-', '');
        let subData = sport === 'wally' ? estadoSistema.wally.subCanchas[estadoSistema.wally.canchaSeleccionada] : estadoSistema[sport];
        let fecha = $('#fecha-' + sport).val();
        let hora = $('#hora-' + sport).val();

        if (!fecha || !hora) { alert("❌ Selecciona Fecha y Slot de Hora."); return; }

        let modo = estadoSistema[sport].modo;

        if (modo === 'individual') {
            if (subData.jugadores.length === 0 || !subData.jugadores.every(j => j.confirmado && j.pagado)) {
                alert("⚠️ Todos deben estar CONFIRMADOS y PAGADOS.");
                return;
            }
        } else {
            let capitan = $(`#nombre-capitan-${sport}`).val().trim();
            if (!capitan) { alert("⚠️ Ingresa el nombre del Capitán."); return; }
        }

        if (subData.timerConfirm) clearInterval(subData.timerConfirm);

        subData.segundosRestantes = 3600;
        subData.ocupada = true;

        let $pill = $('#status-cancha-' + sport);
        $pill.removeClass('disponible').addClass('ocupado');
        $pill.find('span:first').html(`🔴 Ocupada`);
        $('#timer-ocupado-' + sport).show();

        if (subData.timerOcupado) clearInterval(subData.timerOcupado);

        subData.timerOcupado = setInterval(() => {
            let h = Math.floor(subData.segundosRestantes / 3600);
            let m = Math.floor((subData.segundosRestantes % 3600) / 60);
            let s = subData.segundosRestantes % 60;

            $('#timer-ocupado-' + sport).text(` | ⏳ ${h<10?'0':''}${h}:${m<10?'0':''}${m}:${s<10?'0':''}${s}`);

            if (subData.segundosRestantes-- <= 0) {
                clearInterval(subData.timerOcupado);
                subData.ocupada = false;
                subData.jugadores = [];
                $pill.removeClass('ocupado').addClass('disponible');
                $pill.find('span:first').html(`🟢 Libre`);
                $('#timer-ocupado-' + sport).hide();
            }
        }, 1000);

        let detalle = modo === 'conjunto' ? `\nResponsable: ${$(`#nombre-capitan-${sport}`).val()}` : '';
        let hidra = estadoSistema[sport].hidratacion;
        let detalleHidra = hidra && hidra.precio > 0 
            ? `\n🥤 Pack Hidratación: ${hidra.nombre} (+${hidra.precio.toFixed(2)} Bs)` 
            : '\n🥤 Pack Hidratación: Sin pack';
        let totalReserva = modo === 'conjunto' 
            ? `${$(`#monto-total-conjunto-${sport}`).text()} Bs` 
            : `${$(`#cuota-persona-${sport}`).text()} Bs / persona (${subData.jugadores.length} jugadores)`;
        alert(`🏆 ¡RESERVA EXITOSA! (${sport.toUpperCase()})${detalle}${detalleHidra}\nTotal: ${totalReserva}\nFecha: ${fecha} - Hora: ${hora}`);
    });

    $('.pay-btn-mini').click(function() {
        let sport = $(this).data('sport');
        let metodo = $(this).data('method');
        $(`.pay-btn-mini[data-sport="${sport}"]`).removeClass('active-pay');
        $(this).addClass('active-pay');
        if (metodo === 'qr') $(`#qr-container-${sport}`).slideDown(150);
        else $(`#qr-container-${sport}`).slideUp(150);
    });

    $('.confirm-btn-mini').click(function() {
        let sport = $(this).data('sport');
        alert("✔ Pago verificado correctamente.");
        $(`#qr-container-${sport}`).slideUp(150);
    });

    // Inicializar cálculos de todos los deportes al cargar
    actualizarCalculos('wally');
    actualizarCalculos('futsal');
    actualizarCalculos('voley');
});
/* ===== CARRUSEL (JS puro, 5 imágenes por sección) ===== */
(function () {
    document.querySelectorAll('.carousel').forEach(function (car) {
        var track = car.querySelector('.carousel-track');
        var imgs = (window.CAROUSEL_IMAGES || {})[car.dataset.carousel] || [];
        imgs.forEach(function (it) {
            var fig = document.createElement('figure');
            fig.className = 'carousel-slide';
            var im = document.createElement('img');
            im.loading = 'lazy'; im.width = 800; im.height = 440; im.alt = it.alt;
            im.referrerPolicy = 'no-referrer';
            im.onerror = function () { im.onerror = null; im.src = it.local; };  // respaldo local
            im.src = it.url || it.local;
            var cap = document.createElement('figcaption');
            cap.textContent = it.alt;
            fig.appendChild(im); fig.appendChild(cap);
            track.appendChild(fig);
        });
        var total = imgs.length;
        var dots = car.querySelector('.carousel-dots');
        var i = 0, timer = null, startX = null;

        for (var d = 0; d < total; d++) {
            dots.insertAdjacentHTML('beforeend', '<button data-i="' + d + '" aria-label="Imagen ' + (d + 1) + '"></button>');
        }

        function go(n) {
            i = (n + total) % total;
            track.style.transform = 'translateX(-' + (i * 100) + '%)';
            dots.querySelectorAll('button').forEach(function (b, k) { b.classList.toggle('active', k === i); });
        }
        function play() { stop(); timer = setInterval(function () { go(i + 1); }, 4000); }
        function stop() { if (timer) { clearInterval(timer); timer = null; } }

        // Delegación de eventos: un solo listener por carrusel
        car.addEventListener('click', function (e) {
            var b = e.target.closest('button');
            if (!b) return;
            if (b.classList.contains('prev')) go(i - 1);
            else if (b.classList.contains('next')) go(i + 1);
            else if (b.dataset.i !== undefined) go(+b.dataset.i);
            play();
        });
        car.addEventListener('mouseenter', stop);
        car.addEventListener('mouseleave', play);
        car.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; stop(); }, { passive: true });
        car.addEventListener('touchend', function (e) {
            if (startX === null) return;
            var dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
            startX = null; play();
        });

        go(0);
        play();
    });
})();
