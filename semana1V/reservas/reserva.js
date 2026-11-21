/* Componente "Sistema de Reservas" · JavaScript vanilla (ES6+)
   - Estado en memoria, separado del DOM.
   - Una sola delegación de eventos sobre el contenedor.
   - .closest('.reserva-card') limita cada acción a su propia tarjeta. */
(function () {
    'use strict';

    const SEL = {
        modulo: '.reserva-modulo',
        lista: '.reserva-modulo__lista',
        card: '.reserva-card',
        accion: '[data-accion]'
    };
    const CLS = {
        reservado: 'reserva-card--reservado',
        invalido: 'reserva-card__input--invalido',
        msgOk: 'reserva-card__mensaje--ok'
    };
    const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function hoyISO() {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 10);
    }

    function iniciar(raiz) {
        const lista = raiz.querySelector(SEL.lista);
        const plantilla = raiz.querySelector('template');
        const datos = window.RESERVA_DATOS;
        if (!lista || !plantilla || !Array.isArray(datos)) {
            console.error('Reserva: falta lista, plantilla o datos.');
            return;
        }

        // Estado por id: { reserva: null | {nombre, correo, fecha, hora} }
        const estado = new Map(datos.map(d => [String(d.id), { reserva: null }]));

        /* ---------- Render ---------- */
        function crearTarjeta(d) {
            const nodo = plantilla.content.firstElementChild.cloneNode(true);
            const id = String(d.id);
            nodo.dataset.id = id;
            nodo.querySelector('[data-campo="nombre-espacio"]').textContent = d.nombre;
            nodo.querySelector('[data-campo="detalle"]').textContent = d.detalle;
            nodo.querySelector('[data-campo="precio"]').textContent = d.precio + ' Bs';

            // ids únicos por tarjeta para asociar <label for>
            nodo.querySelectorAll('[data-for]').forEach(el => {
                const nuevo = 'reserva-' + id + '-' + el.dataset.for;
                const control = nodo.querySelector('[name="' + el.dataset.for + '"]');
                control.id = nuevo;
                el.htmlFor = nuevo;
            });

            const select = nodo.querySelector('[name="hora"]');
            d.horarios.forEach(h => select.add(new Option(h, h)));
            nodo.querySelector('[name="fecha"]').min = hoyISO();
            return nodo;
        }

        function pintar(card) {
            const d = datos.find(x => String(x.id) === card.dataset.id);
            const r = estado.get(card.dataset.id).reserva;
            const reservado = !!r;

            card.classList.toggle(CLS.reservado, reservado);
            card.querySelector('[data-campo="estado"]').textContent =
                reservado ? 'Reservado · ' + r.fecha + ' ' + r.hora : 'Disponible';

            card.querySelectorAll('.reserva-card__input').forEach(i => { i.disabled = reservado; });
            card.querySelector('[data-accion="reservar"]').hidden = reservado;
            card.querySelector('[data-accion="simular"]').hidden = reservado;
            card.querySelector('[data-accion="cancelar"]').hidden = !reservado;
            card.setAttribute('aria-label', d.nombre + (reservado ? ' (reservado)' : ' (disponible)'));
        }

        function mensaje(card, texto, ok) {
            const p = card.querySelector('[data-campo="mensaje"]');
            p.textContent = texto;
            p.classList.toggle(CLS.msgOk, !!ok);
        }

        datos.forEach(d => {
            const li = document.createElement('li');
            const card = crearTarjeta(d);
            li.appendChild(card);
            lista.appendChild(li);
            pintar(card);
        });

        /* ---------- Validación ---------- */
        function validar(card) {
            const f = card.querySelector('.reserva-card__form');
            const v = {
                nombre: f.nombre.value.trim(),
                correo: f.correo.value.trim(),
                fecha: f.fecha.value,
                hora: f.hora.value
            };
            const errores = {};
            if (v.nombre.length < 3) errores.nombre = 'Ingresa tu nombre (mín. 3 letras).';
            if (!RE_CORREO.test(v.correo)) errores.correo = 'Correo no válido.';
            if (!v.fecha) errores.fecha = 'Elige una fecha.';
            else if (v.fecha < hoyISO()) errores.fecha = 'La fecha no puede ser pasada.';
            if (!v.hora) errores.hora = 'Elige un horario.';

            ['nombre', 'correo', 'fecha', 'hora'].forEach(n =>
                f[n].classList.toggle(CLS.invalido, !!errores[n]));
            const primero = Object.keys(errores)[0];
            if (primero) f[primero].focus();
            return { valores: v, errores };
        }

        /* ---------- Acciones (cada una opera solo sobre su tarjeta) ---------- */
        const acciones = {
            reservar(card) {
                const { valores, errores } = validar(card);
                const primero = Object.values(errores)[0];
                if (primero) return mensaje(card, primero, false);

                const choque = datos.some(d => {
                    const r = estado.get(String(d.id)).reserva;
                    return String(d.id) === card.dataset.id && r &&
                        r.fecha === valores.fecha && r.hora === valores.hora;
                });
                if (choque) return mensaje(card, 'Ese horario ya está reservado.', false);

                estado.get(card.dataset.id).reserva = valores;
                pintar(card);
                mensaje(card, '¡Reserva confirmada!', true);
            },
            cancelar(card) {
                estado.get(card.dataset.id).reserva = null;
                const f = card.querySelector('.reserva-card__form');
                f.reset();
                f.querySelectorAll('.reserva-card__input').forEach(i => i.classList.remove(CLS.invalido));
                pintar(card);
                mensaje(card, 'Reserva cancelada.', true);
            },
            simular(card) {
                const f = card.querySelector('.reserva-card__form');
                f.nombre.value = 'Jugador Demo';
                f.correo.value = 'demo@correo.com';
                f.fecha.value = hoyISO();
                f.hora.selectedIndex = 1;
                acciones.reservar(card);
            }
        };

        /* ---------- Delegación de eventos ---------- */
        lista.addEventListener('click', e => {
            const boton = e.target.closest(SEL.accion);
            if (!boton || !lista.contains(boton)) return;
            const card = boton.closest(SEL.card);
            if (!card) return;
            const fn = acciones[boton.dataset.accion];
            if (fn) fn(card);
        });

        // Limpia el error de un campo al corregirlo (también delegado)
        lista.addEventListener('input', e => {
            const campo = e.target.closest('.reserva-card__input');
            if (!campo) return;
            campo.classList.remove(CLS.invalido);
            const card = campo.closest(SEL.card);
            if (card) mensaje(card, '', false);
        });

        // Evita que Enter envíe el <form> y recargue la página
        lista.addEventListener('submit', e => {
            e.preventDefault();
            const card = e.target.closest(SEL.card);
            if (card && !estado.get(card.dataset.id).reserva) acciones.reservar(card);
        });
    }

    document.querySelectorAll(SEL.modulo).forEach(iniciar);
})();
