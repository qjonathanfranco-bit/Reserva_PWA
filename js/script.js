$(document).ready(function() {

    /* ===== URL de la API =====
       El backend Flask sirve la página y la API en el puerto 5000. Si abres el
       index.html desde otro sitio (p. ej. `python -m http.server 8123`, que es
       lo que decía el README) o directamente como archivo, las rutas relativas
       '/api/...' van al servidor equivocado y el login/registro fallan.
       Apuntamos siempre las peticiones al backend, respetando el host actual. */
    var BACKEND_ORIGIN = '';
    if (location.protocol === 'http:' || location.protocol === 'https:') {
        if (location.port !== '5000') BACKEND_ORIGIN = location.protocol + '//' + location.hostname + ':5000';
    } else {
        BACKEND_ORIGIN = 'http://127.0.0.1:5000'; // abierto como archivo (file://)
    }
    function apiUrl(ruta) { return BACKEND_ORIGIN + ruta; }
    /* ===== Estado del sistema (lógica de la app) ===== */
    let estadoSistema = {
        wally: {
            subCanchas: {
                'A': { jugadores: [], timerConfirm: null, timerOcupado: null, ocupada: false, segundosRestantes: 0 },
                'B': { jugadores: [], timerConfirm: null, timerOcupado: null, ocupada: false, segundosRestantes: 0 },
                'C': { jugadores: [], timerConfirm: null, timerOcupado: null, ocupada: false, segundosRestantes: 0 }
            },
            canchaSeleccionada: 'A',
            modo: 'individual',
            max: 16,
            reservas: [],
            ultimaReservaId: null
        },
        futsal: { jugadores: [], timerConfirm: null, timerOcupado: null, ocupada: false, segundosRestantes: 0, modo: 'individual', max: 16, reservas: [], ultimaReservaId: null },
        voley:  { jugadores: [], timerConfirm: null, timerOcupado: null, ocupada: false, segundosRestantes: 0, modo: 'individual', max: 16, reservas: [], ultimaReservaId: null }
    };

    /* ===== Datos — conectados a la base de datos (API del backend, DB :volleybol:) ===== */
    var DB_CANCHAS = { wally: [], futsal: [], voley: [] };
    var DB_SLOTS = { wally: [], futsal: [], voley: [] };
    var DB_META = {};
    // Hora elegida y horas a reservar en cada deporte
    var HORA_SELECCIONADA = { wally: '', futsal: '', voley: '' };
    var HORAS_RESERVA = { wally: 1, futsal: 1, voley: 1 };

    function fetchCanchas() {
        fetch(apiUrl('/api/canchas'))
            .then(function (r) { return r.json(); })
            .then(function (data) {
                DB_CANCHAS.wally = data.filter(function (c) { return c.sport_id === 'wally' && c.estado; });
                DB_CANCHAS.futsal = data.filter(function (c) { return c.sport_id === 'futsal' && c.estado; });
                DB_CANCHAS.voley = data.filter(function (c) { return c.sport_id === 'voley' && c.estado; });
                pintarCanchas();
                ['wally', 'futsal', 'voley'].forEach(actualizarCalculos);
            })
            .catch(function (e) { console.warn('canchas: no se pudo conectar con la API', e); });
    }

    function fetchSlots() {
        fetch(apiUrl('/api/slots'))
            .then(function (r) { return r.json(); })
            .then(function (data) {
                ['wally', 'futsal', 'voley'].forEach(function (s) {
                    DB_SLOTS[s] = data.filter(function (x) { return x.sport_id === s; });
                });
                pintarSlots();
            })
            .catch(function (e) { console.warn('slots: no se pudo conectar con la API', e); });
    }

    function fetchMetadatos() {
        fetch(apiUrl('/api/metadatos'))
            .then(function (r) { return r.json(); })
            .then(function (data) { DB_META = data; })
            .catch(function (e) { console.warn('metadatos: no se pudo conectar con la API', e); });
    }

    function fetchReservas(sport) {
        fetch(apiUrl('/api/reservas?sport=' + sport))
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var st = estadoSistema[sport];
                st.reservas.length = 0;
                data.forEach(function (r) {
                    st.reservas.push({
                        id: r.id,
                        cancha: r.cancha_nombre,
                        fecha: r.fecha,
                        horaEntrada: r.hora_entrada,
                        horaSalida: r.hora_salida,
                        estado: r.estado
                    });
                });
                renderizarMisReservas(sport);
                actualizarHorariosDisponibles(sport);
            })
            .catch(function (e) { console.warn('reservas: no se pudo conectar con la API', e); });
    }

    function pintarCanchas() {
        var $cont = $('#canchas-container-wally').empty();
        var sel = estadoSistema.wally.canchaSeleccionada;
        DB_CANCHAS.wally.forEach(function (c) {
            estadoSistema.wally.subCanchas[c.id] = estadoSistema.wally.subCanchas[c.id] ||
                { jugadores: [], timerConfirm: null, timerOcupado: null, ocupada: false, segundosRestantes: 0 };
            $cont.append(
                '<article class="card-item cancha-chip spawn-balloon' + (c.id === sel ? ' selected' : '') + '"' +
                ' data-id="' + c.id + '" data-cancha="' + c.id + '" data-precio="' + c.precio + '">' +
                    '<div class="card-item__media chip-avatar">' +
                        '<img loading="lazy" src="' + (c.img || '') + '" alt="Cancha ' + c.id + '" class="card-item__img chip-img">' +
                        '<span class="card-item__badge badge-lvl">' + c.id + '</span>' +
                    '</div>' +
                    '<div class="card-item__body chip-info">' +
                        '<strong class="card-item__titulo">' + c.nombre + '</strong>' +
                        '<small class="card-item__detalle">' + c.precio + ' Bs • ' + (c.detalle || '') + '</small>' +
                        '<span class="card-item__estado">Estado: Disponible</span>' +
                    '</div>' +
                    '<button type="button" class="card-item__accion btn-simular">✦ Simular</button>' +
                '</article>'
            );
        });
        if (sel) $('#lbl-cancha-wally').text(sel);
    }

    function pintarSlots() {
        ['wally', 'futsal', 'voley'].forEach(function (sport) {
            var $grid = $('.slots-grid[data-sport="' + sport + '"]');
            if (!$grid.length) return;
            $grid.empty();
            HORARIOS_BASE[sport] = [];
            (DB_SLOTS[sport] || []).forEach(function (s) {
                // Todos los horarios de la DB son reservables. Un slot solo se
                // marca ocupado si existe una reserva real (ver actualizarSlotsGrid).
                HORARIOS_BASE[sport].push(s.hora);
                $grid.append($('<button type="button" class="slot-btn spawn-balloon" data-time="' + s.hora + '">' + s.hora + '</button>'));
            });
            var primero = HORARIOS_BASE[sport][0];
            HORA_SELECCIONADA[sport] = primero || '';
            if (primero) $grid.find('.slot-btn[data-time="' + primero + '"]').first().addClass('active').attr('aria-pressed', 'true');
        });
        // Las reservas pueden llegar antes que los slots: recalculamos ocupación al pintar
        ['wally', 'futsal', 'voley'].forEach(actualizarHorariosDisponibles);
    }

    function loginConBase() {
        var user = $('#login-user').val().trim();
        var pass = $('#login-pass').val();
        var msg = $('#login-msg');
        msg.removeClass('err').text('Iniciando sesión…').show();
        fetch(apiUrl('/api/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        })
        .then(function (r) { return r.json(); })
        .then(function (j) {
            if (j.ok) {
                window.__usuario = j.usuario;
                window.__usuarioId = j.usuario_id;
                $('body').removeClass('login-pending');
                $('#login-panel').fadeOut(150);
                msg.removeClass('err').text(j.msg).show();
            } else {
                msg.addClass('err').text(j.msg || 'Credenciales inválidas').show();
            }
        })
        .catch(function () { msg.addClass('err').text('✘ No se pudo conectar con el servidor (¿está corriendo backend.py?)').show(); });
    }
    $('#btn-login').click(loginConBase);

    // Mostrar el formulario de registro de usuario
    $('#btn-mostrar-registro').click(function () { $('#login-extra').show(); });

    // Registrar un nuevo usuario en la base de datos (POST /api/registrar)
    $('#btn-registrar').click(function () {
        var user = $('#reg-user').val().trim();
        var pass = $('#reg-pass').val();
        var confirm = $('#reg-confirm').val();
        var msg = $('#login-msg-reg');
        if (!user || !pass) { msg.addClass('err').text('Ingresa usuario y contraseña').show(); return; }
        if (pass !== confirm) { msg.addClass('err').text('La confirmación no coincide').show(); return; }
        msg.removeClass('err').text('Registrando…').show();
        fetch(apiUrl('/api/registrar'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass, confirm: confirm })
        })
        .then(function (r) { return r.json(); })
        .then(function (j) { msg.removeClass('err').text(j.msg || 'Ok').show(); })
        .catch(function () { msg.addClass('err').text('✘ Error al registrar').show(); });
    });

    /* ===== Panel de precios: edita el precio por hora y lo guarda en la DB ===== */
    function abrirPanelPrecios() {
        var $lista = $('#lista-precios').empty();
        ['wally', 'futsal', 'voley'].forEach(function (sport) {
            (DB_CANCHAS[sport] || []).forEach(function (c) {
                var nombre = htmlSeguro(c.nombre);
                $lista.append(
                    '<label><span>' + nombre + ' <small>(' + sport + ')</small></span>' +
                    '<input type="number" min="0" step="0.01" value="' + Number(c.precio).toFixed(2) +
                    '" data-id="' + c.id + '" aria-label="Precio de ' + nombre + '"></label>'
                );
            });
        });
        $('#msg-precios').removeClass('err').text('').hide();
        $('#panel-precios').removeAttr('hidden');
    }
    $('#btnPrecios').click(abrirPanelPrecios);
    $('#btn-cerrar-precios').click(function () { $('#panel-precios').attr('hidden', 'hidden'); });

    $('#btn-guardar-precios').click(function () {
        var msg = $('#msg-precios');
        var cambios = [];
        var invalido = false;
        $('#lista-precios input').each(function () {
            var precio = parseFloat($(this).val());
            if (isNaN(precio) || precio < 0) { invalido = true; return false; }
            cambios.push({ id: $(this).data('id'), precio: precio });
        });
        if (invalido || !cambios.length) {
            msg.addClass('err').text('Ingresa precios válidos (números mayores o iguales a 0).').show();
            return;
        }
        msg.removeClass('err').text('Guardando…').show();
        Promise.all(cambios.map(function (c) {
            return fetch(apiUrl('/api/canchas/' + encodeURIComponent(c.id)), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ precio: c.precio })
            }).then(function (r) { return r.json(); }).catch(function () { return { ok: false }; });
        })).then(function (resultados) {
            if (resultados.some(function (j) { return !j.ok; })) {
                msg.addClass('err').text('No se pudieron guardar todos los precios.').show();
                return;
            }
            cambios.forEach(function (c) {
                ['wally', 'futsal', 'voley'].forEach(function (s) {
                    (DB_CANCHAS[s] || []).forEach(function (x) { if (x.id === c.id) x.precio = c.precio; });
                });
            });
            pintarCanchas();
            $('#btn-ver-todas-wally').fadeOut();
            ['wally', 'futsal', 'voley'].forEach(actualizarCalculos);
            msg.removeClass('err').text('✔ Precios guardados en la base de datos.').show();
            $('#panel-precios').attr('hidden', 'hidden');
        });
    });

    /* ===== Smoke Test (Doc 6) ===== */
    var __erroresConsola = 0;
    (function () {
        var _ce = console.error;
        console.error = function () { __erroresConsola++; return _ce.apply(console, arguments); };
    })();

    function smokeTestDom() {
        var imgsSinAlt = document.querySelectorAll('img:not([alt]), img[alt=""]').length;
        var enlacesVacios = document.querySelectorAll('a[href=""], a:not([href])').length;
        var botones = document.querySelectorAll('button').length;
        var componentes = document.querySelectorAll('.card-item').length;
        var salida = $('#salida-audit');
        if (!salida.length) return;
        salida.removeClass('err').text(
            `Smoke Test OK · Botones: ${botones} | Imágenes sin alt: ${imgsSinAlt} | Enlaces vacíos: ${enlacesVacios} | Errores consola: ${__erroresConsola} | Componentes .card-item: ${componentes}`
        );
    }
    $('#btnSmokeTest').click(smokeTestDom);

    // DOMPurify: sanitiza HTML dinámico antes de inyectarlo (Doc 7)
    function htmlSeguro(texto) {
        return window.DOMPurify ? window.DOMPurify.sanitize(texto) : String(texto);
    }

    /* ===== Horarios disponibles, vinculación de reservas y validación de fecha (Doc 5) ===== */
    // La duración se elige por deporte en HORAS_RESERVA (selector de 1 a 4 horas)

    var HORARIOS_BASE = {                          // horarios disponibles (se llenan en pintarSlots() desde la DB)
        wally:  [],
        futsal: [],
        voley:  []
    };

    function reservasDeSport(sport) {
        return sport === 'wally' ? estadoSistema.wally.reservas : estadoSistema[sport].reservas;
    }

    function fechaSeleccionada(sport) { return $('#fecha-' + sport).val() || ''; }

    function sumarHoras(h, hrs) {
        var p = String(h || '00:00').split(':');
        var t = (parseInt(p[0], 10) * 60 + parseInt(p[1], 10)) + hrs * 60;
        var m = ((t % 1440) + 1440) % 1440;
        return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    }

    function fechaValida(sport) {
        var f = $('#fecha-' + sport).val();
        if (!f) return true;
        var ano = parseInt(f.substring(0, 4), 10);
        var anos = [2026, 2027];
        if (DB_META && DB_META.ano_inicio) anos[0] = parseInt(DB_META.ano_inicio, 10);
        if (DB_META && DB_META.ano_fin) anos[1] = parseInt(DB_META.ano_fin, 10);
        return anos.indexOf(ano) !== -1;
    }

    function horaOcupada(sport, fecha, hora) {
        return reservasDeSport(sport).some(function (r) {
            if (r.estado === 'Terminada') return false;
            if (r.fecha !== fecha) return false;
            // Usamos la hora de salida guardada en la reserva (ya respeta las horas elegidas)
            var fin = r.horaSalida || sumarHoras(r.horaEntrada, 1);
            return r.horaEntrada <= hora && hora < fin;
        });
    }

    // Para empezar a las X horas, deben estar libres las N horas consecutivas
    function inicioValido(sport, fecha, hora, horas) {
        var base = HORARIOS_BASE[sport] || [];
        for (var i = 0; i < horas; i++) {
            var h = sumarHoras(hora, i);
            if (base.indexOf(h) === -1 || horaOcupada(sport, fecha, h)) return false;
        }
        return true;
    }

    function calcularHorariosDisponibles(sport) {
        var fecha = fechaSeleccionada(sport);
        var horas = HORAS_RESERVA[sport] || 1;
        return (HORARIOS_BASE[sport] || []).filter(function (h) {
            return inicioValido(sport, fecha, h, horas);
        });
    }

    function actualizarSlotsGrid(sport) {
        var disponibles = calcularHorariosDisponibles(sport);
        var fecha = fechaSeleccionada(sport);
        var horas = HORAS_RESERVA[sport] || 1;
        var $grid = $('.slots-grid[data-sport="' + sport + '"]');
        $grid.find('.slot-btn').each(function () {
            var t = $(this).data('time');
            var ocupado = horaOcupada(sport, fecha, t);
            var libre = disponibles.indexOf(t) !== -1;
            $(this).removeClass('ocupado sin-horas').removeAttr('disabled').removeAttr('title').text(t);
            if (ocupado) {
                // "(Ocupado)" solo si hay una reserva real en esa hora
                $(this).addClass('ocupado').removeClass('active')
                    .attr('disabled', 'disabled').attr('aria-pressed', 'false')
                    .text(t + ' (Ocupado)');
            } else if (!libre) {
                // No alcanzan horas consecutivas: no es un inicio válido, pero NO está reservado
                $(this).addClass('sin-horas').removeClass('active')
                    .attr('disabled', 'disabled').attr('aria-pressed', 'false')
                    .attr('title', 'No hay ' + horas + ' horas consecutivas libres desde ' + t);
            }
        });
        // Si la hora elegida dejó de estar libre, seleccionar el primero disponible
        if (disponibles.indexOf(HORA_SELECCIONADA[sport]) === -1) {
            HORA_SELECCIONADA[sport] = disponibles[0] || '';
            $grid.find('.slot-btn').removeClass('active').attr('aria-pressed', 'false');
            if (HORA_SELECCIONADA[sport]) {
                $grid.find('.slot-btn[data-time="' + HORA_SELECCIONADA[sport] + '"]').first()
                    .addClass('active').attr('aria-pressed', 'true');
            }
        }
    }

    function actualizarHorariosDisponibles(sport) {
        if (!(HORARIOS_BASE[sport] || []).length) return; // esperar a que carguen los slots de la DB
        actualizarSlotsGrid(sport);
        var disp = calcularHorariosDisponibles(sport);
        var $l = $('#lista-horarios-' + sport);
        if ($l.length) $l.text(disp.length ? 'Horarios disponibles: ' + disp.join(', ') : 'Sin horarios disponibles.');
    }

    function renderizarMisReservas(sport) {
        var lista = reservasDeSport(sport);
        var $tbody = $('#cuerpo-mis-reservas-' + sport);
        if (!$tbody.length) return;
        $tbody.empty();
        lista.forEach(function (r) {
            var fila = $('<tr class="fila-reserva"></tr>');
            fila.append($('<td></td>').text(r.cancha || ''));
            fila.append($('<td></td>').text(r.fecha || ''));
            fila.append($('<td></td>').text(r.horaEntrada || ''));
            fila.append($('<td></td>').text(r.horaSalida || ''));
            fila.append($('<td class="estado-' + String(r.estado || 'Activa').toLowerCase() + '"></td>').text(r.estado || 'Activa'));
            var tdAccion = $('<td></td>');
            var btn = $('<button type="button" class="btn-res-borrar spawn-balloon"></button>')
                .text('🗑').attr('data-sport', sport).attr('data-id', r.id || '').attr('aria-label', 'Borrar reserva');
            tdAccion.append(btn);
            fila.append(tdAccion);
            $tbody.append(fila);
        });
        var $sin = $('#sin-reservas-' + sport);
        if ($sin.length) $sin.css('display', lista.length ? 'none' : 'block');
    }

    // Borrar una reserva (DELETE /api/reservas/<id>)
    $(document).on('click', '.btn-res-borrar', function () {
        var sport = $(this).data('sport');
        var id = $(this).data('id');
        fetch(apiUrl('/api/reservas/' + id), { method: 'DELETE' })
            .then(function () { fetchReservas(sport); })
            .catch(function () { console.warn('reservas: no se pudo conectar con la API'); });
    });

    // Borrar todas las reservas del deporte
    $(document).on('click', '.btn-res-limpiar', function () {
        var sport = this.id.replace('btn-res-limpiar-', '');
        var ids = reservasDeSport(sport).map(function (r) { return r.id; }).filter(function (id) { return id; });
        Promise.all(ids.map(function (id) {
            return fetch(apiUrl('/api/reservas/' + id), { method: 'DELETE' }).then(function () { return true; }).catch(function () { return false; });
        })).then(function () { fetchReservas(sport); });
    });

    // Cuando cambia la fecha, recompute los horarios disponibles
    $('[id^="fecha-"]').on('change', function () {
        var sport = $(this).attr('id').replace('fecha-', '');
        actualizarHorariosDisponibles(sport);
    });

    // Conexión con la base de datos al cargar la página
    fetchCanchas();
    fetchSlots();
    fetchMetadatos();
    ['wally', 'futsal', 'voley'].forEach(fetchReservas);

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
        let esClaro = $('body').hasClass('light-theme');
        $('#theme-ico').text(esClaro ? '☀️' : '🌙');
        $('#theme-label').text(esClaro ? ' Modo Claro' : ' Modo Oscuro');
    });

    // 2b. SIMULADOR DE ALTO CONTRASTE (Doc 4)
    $('#btnSimularContraste').click(function() {
        let alto = $('body').toggleClass('alto-contraste').hasClass('alto-contraste');
        $(this).attr('aria-pressed', alto ? 'true' : 'false');
    });

    // 3. NAVEGACIÓN ENTRE DEPORTES
    $('.nav-link').click(function(e) {
        e.preventDefault();
        $('.nav-link').removeClass('active').removeAttr('aria-current');
        $(this).addClass('active').attr('aria-current', 'page');

        let sport = $(this).data('sport');
        $('body').removeClass('theme-wally theme-futsal theme-voley').addClass('theme-' + sport);

        $('.content-section').hide();
        $('#' + sport).fadeIn(200);
    });

    // 4. SELECCIÓN DE SLOTS DE HORARIO (delegado: los slots ahora vienen de la DB)
    $(document).on('click', '.slot-btn', function() {
        if ($(this).hasClass('ocupado')) return;

        let sport = $(this).closest('.slots-grid').data('sport');
        $(`.slots-grid[data-sport="${sport}"] .slot-btn`).removeClass('active').attr('aria-pressed', 'false');
        $(this).addClass('active').attr('aria-pressed', 'true');

        HORA_SELECCIONADA[sport] = $(this).data('time');
    });

    // 4b. SELECTOR DE HORAS A RESERVAR (1 a 4): cambia duración, disponibilidad y precio
    $(document).on('click', '.btn-horas', function () {
        let sport = $(this).closest('.horas-selector').data('sport');
        let horas = parseInt($(this).data('horas'), 10) || 1;
        HORAS_RESERVA[sport] = horas;
        $('.horas-selector[data-sport="' + sport + '"] .btn-horas').removeClass('active').attr('aria-pressed', 'false');
        $(this).addClass('active').attr('aria-pressed', 'true');
        actualizarHorariosDisponibles(sport);
        actualizarCalculos(sport);
    });

    // 5. ENFOQUE DE FOTO EN WALLYS (delegado: los chips ahora vienen de la DB)
    $(document).on('click', '.cancha-chip', function() {
        let letraCancha = $(this).data('cancha');
        let precioCancha = $(this).data('precio');

        estadoSistema.wally.canchaSeleccionada = letraCancha;
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

        $(`.btn-modo[data-sport="${sport}"]`).removeClass('active').attr('aria-pressed', 'false');
        $(this).addClass('active').attr('aria-pressed', 'true');

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

    // Precios a partir de la base de datos (canchas): wally (por cancha) y futsal/voley (por deporte)
    function precioDeSport(sport) {
        if (sport === 'wally') {
            var c = (DB_CANCHAS.wally || []).filter(function (x) { return x.id === estadoSistema.wally.canchaSeleccionada; })[0];
            return c ? (parseFloat(c.precio) || 0) : 0;
        }
        var lista = DB_CANCHAS[sport] || [];
        var c2 = lista[0];
        return c2 ? (parseFloat(c2.precio) || 0) : 0;
    }

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

        let horas = HORAS_RESERVA[sport] || 1;
        let precio = precioDeSport(sport) * horas;   // precio por hora × horas reservadas
        let totalJugadores = jugadores.length;

        let $lblHoras = $('#lbl-horas-' + sport);
        if ($lblHoras.length) $lblHoras.text(horas + 'h');

        let montoTotal = precio.toFixed(2);
        $('#monto-total-conjunto-' + sport).text(montoTotal);
        $('#total-jugadores-' + sport).text(totalJugadores);

        if (totalJugadores > 0 && precio > 0) {
            let cuota = (precio / totalJugadores).toFixed(2);
            $('#cuota-persona-' + sport).text(cuota);
        } else {
            $('#cuota-persona-' + sport).text('0.00');
        }

        if (estadoSistema[sport].modo === 'individual') {
            let cuotaActual = (totalJugadores > 0 && precio > 0) ? (precio / totalJugadores).toFixed(2) : '0.00';
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

        var anadir = function (dbId) {
            var rec = { nombre: nombre, confirmado: false, pagado: false };
            if (dbId) rec.id = dbId;
            subData.jugadores.push(rec);
            renderizarLista(sport);
            $('#nombre-jugador-' + sport).val('');
            actualizarCalculos(sport);
        };

        // A la base de datos si ya existe una reserva creada via API
        var reservaId = estadoSistema[sport].ultimaReservaId;
        if (reservaId) {
            fetch(apiUrl('/api/reservas/' + reservaId + '/jugadores'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nombre, confirmado: false, pagado: false })
            })
            .then(function (r) { return r.json(); })
            .then(function (j) { if (j.ok && j.id) { anadir(j.id); return; } anadir(); })
            .catch(function () { anadir(); });
        } else {
            anadir();
        }
    }

    function renderizarLista(sport) {
        let jugadores = sport === 'wally' 
            ? estadoSistema.wally.subCanchas[estadoSistema.wally.canchaSeleccionada].jugadores 
            : estadoSistema[sport].jugadores;

        let $lista = $('#lista-jugadores-' + sport).empty();

        jugadores.forEach((j, i) => {
            let $li = $('<li>');
            let $div = $('<div>');
            let $btnA = $('<button type="button" class="btn-check-asistencia spawn-balloon" data-sport="' + sport + '" data-index="' + i + '"></button>').text(j.confirmado ? '✔' : '⏳');
            let $btnP = $('<button type="button" class="btn-check-pago spawn-balloon" data-sport="' + sport + '" data-index="' + i + '"></button>').text(j.pagado ? '🟢' : '🔴');
            $btnA.attr('class', 'btn-check-asistencia spawn-balloon ' + (j.confirmado ? 'confirmado' : ''));
            $btnP.attr('class', 'btn-check-pago spawn-balloon ' + (j.pagado ? 'pagado' : ''));
            if (j.id) { $btnA.attr('data-id', j.id); $btnP.attr('data-id', j.id); }
            $div.append($btnA).append($btnP);
            $li.append($('<span></span>').text(htmlSeguro(j.nombre))).append($div);
            $lista.append($li);
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
        if (subData.jugadores[i].id) {
            fetch(apiUrl('/api/jugadores/' + subData.jugadores[i].id), {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmado: subData.jugadores[i].confirmado })
            }).catch(function () {});
        }
    });

    $(document).on('click', '.btn-check-pago', function() {
        let sport = $(this).data('sport');
        let i = $(this).data('index');
        let subData = sport === 'wally' ? estadoSistema.wally.subCanchas[estadoSistema.wally.canchaSeleccionada] : estadoSistema[sport];
        subData.jugadores[i].pagado = !subData.jugadores[i].pagado;
        renderizarLista(sport);
        if (subData.jugadores[i].id) {
            fetch(apiUrl('/api/jugadores/' + subData.jugadores[i].id), {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pagado: subData.jugadores[i].pagado })
            }).catch(function () {});
        }
    });

    /* ===== Simulación por tarjeta (Doc 3): un solo listener delegado =====
       Cambia únicamente el estado de la tarjeta clicada. */
    $(document).on('click', '.btn-simular', function(e) {
        e.stopPropagation();                     // no disparar la selección real de la cancha
        let $card = $(this).closest('.card-item');
        let activo = $card.toggleClass('card-item--activo').hasClass('card-item--activo');
        $card.find('.card-item__estado').text(activo ? 'Estado: Seleccionado (Simulación)' : 'Estado: Disponible');
    });

    $('.btn-timer-mini').click(function() {
        let sport = $(this).attr('id').replace('btn-iniciar-timer-', '');
        let subData = sport === 'wally' ? estadoSistema.wally.subCanchas[estadoSistema.wally.canchaSeleccionada] : estadoSistema[sport];
        let tiempo = 10 * 60;

        $('#btn-iniciar-timer-' + sport).hide();
        $('#display-timer-confirm-' + sport).show();

        if (subData.timerConfirm) clearInterval(subData.timerConfirm);

        subData.timerConfirm = setInterval(() => {
            if (tiempo <= 0) {
                clearInterval(subData.timerConfirm);
                subData.timerConfirm = null;
                subData.jugadores = [];
                if (sport === 'wally') sincronizarVistaWally(); else renderizarLista(sport);
                return;
            }
            let m = Math.floor(tiempo / 60), s = tiempo % 60;
            $('#time-left-' + sport).text(`${m<10?'0':''}${m}:${s<10?'0':''}${s}`);
            tiempo--;
        }, 1000);
    });

    $('.btn-finalizar-reserva-mini').click(function() {
        let sport = $(this).attr('id').replace('btn-finalizar-', '');
        let subData = sport === 'wally' ? estadoSistema.wally.subCanchas[estadoSistema.wally.canchaSeleccionada] : estadoSistema[sport];
        let fecha = $('#fecha-' + sport).val();
        let hora = HORA_SELECCIONADA[sport];

        if (!fecha || !hora) { alert("❌ Selecciona Fecha y Slot de Hora."); return; }
        if (!fechaValida(sport)) { alert("❌ La fecha no es válida. Solo se atienden 2026 y 2027."); return; }

        let horas = HORAS_RESERVA[sport] || 1;
        let horaSalida = sumarHoras(hora, horas);
        if (!inicioValido(sport, fecha, hora, horas)) {
            alert("❌ Ese horario no está disponible durante " + horas + "h. Elige otro inicio.");
            actualizarHorariosDisponibles(sport);
            return;
        }

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

        // El contador de ocupación dura las horas elegidas (no siempre 1 hora)
        subData.segundosRestantes = horas * 3600;
        subData.ocupada = true;

        let $pill = $('#status-cancha-' + sport);
        $pill.removeClass('disponible').addClass('ocupado');
        $pill.find('span:first').html(`🔴 Ocupada`);
        $('#timer-ocupado-' + sport)
            .text(` | ⏳ ${horas < 10 ? '0' : ''}${horas}:00:00`)
            .show();

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
                // Marcar reservas terminadas y liberar horarios (Doc 5)
                reservasDeSport(sport).forEach(function (r) { if (r.estado === 'Activa') r.estado = 'Terminada'; });
                renderizarMisReservas(sport);
                actualizarHorariosDisponibles(sport);
                $pill.removeClass('ocupado').addClass('disponible');
                $pill.find('span:first').html(`🟢 Libre`);
                $('#timer-ocupado-' + sport).hide();
            }
        }, 1000);

        let detalle = modo === 'conjunto' ? `\nResponsable: ${$(`#nombre-capitan-${sport}`).val()}` : '';

        // Registrar la reserva en la base de datos (POST /api/reservas)
        fetch(apiUrl('/api/reservas'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cancha: sport === 'wally' ? estadoSistema.wally.canchaSeleccionada : (DB_CANCHAS[sport][0] ? DB_CANCHAS[sport][0].id : ''),
                fecha: fecha,
                hora_entrada: hora,
                hora_salida: horaSalida,
                estado: 'Activa',
                usuario_id: window.__usuarioId || null
            })
        })
        .then(function (r) { return r.json(); })
        .then(function (j) {
            if (!j.ok) { alert('✘ ' + (j.msg || 'No se pudo crear la reserva')); return; }
            estadoSistema[sport].ultimaReservaId = j.id;
            fetchReservas(sport);
            actualizarHorariosDisponibles(sport);
            alert(`🏆 ¡RESERVA EXITOSA! (${sport.toUpperCase()})${detalle}\nFecha: ${fecha} - Hora: ${hora} a ${horaSalida} (${horas}h)\nTotal: ${precioDeSport(sport) * horas} Bs`);
        })
        .catch(function () { alert('✘ No se pudo conectar con el servidor (¿está corriendo backend.py?)'); });
    });

    $('.pay-btn-mini').click(function() {
        let sport = $(this).data('sport');
        let metodo = $(this).data('method');
        $(`.pay-btn-mini[data-sport="${sport}"]`).removeClass('active-pay').attr('aria-pressed', 'false');
        $(this).addClass('active-pay').attr('aria-pressed', 'true');
        if (metodo === 'qr') $(`#qr-container-${sport}`).slideDown(150);
        else $(`#qr-container-${sport}`).slideUp(150);
    });

    $('.confirm-btn-mini').click(function() {
        let sport = $(this).data('sport');
        alert("✔ Pago verificado correctamente.");
        $(`#qr-container-${sport}`).slideUp(150);
    });

    /* ===== PWA (Doc 1): Service Worker + botón de instalación ===== */
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('sw.js')
                .then(function (reg) { console.log('SW activo en alcance:', reg.scope); })
                .catch(function (err) { console.error('Fallo al registrar el Service Worker:', err); });
        });
    }

    var btnInstalar = document.getElementById('btnInstalarPWA');
    var eventoInstalacion = null;

    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();                       // evita el mini-banner automático
        eventoInstalacion = e;
        if (btnInstalar) btnInstalar.hidden = false;
    });

    window.addEventListener('appinstalled', function () {
        if (btnInstalar) btnInstalar.hidden = true;
        eventoInstalacion = null;
    });

    if (btnInstalar) {
        btnInstalar.addEventListener('click', function () {
            if (!eventoInstalacion) return;
            eventoInstalacion.prompt();
            eventoInstalacion.userChoice.then(function () {
                btnInstalar.hidden = true;
                eventoInstalacion = null;
            });
        });
    }

    /* ===== Simulador de vista móvil / escritorio (Doc 2) ===== */
    $('#btnSimularVista').click(function () {
        var esMovil = $('.dashboard-wrapper').toggleClass('sim-movil').hasClass('sim-movil');
        $(this).attr('aria-pressed', esMovil ? 'true' : 'false');
    });
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
