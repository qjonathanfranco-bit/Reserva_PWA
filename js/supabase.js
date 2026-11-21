/* supabase.js — Cliente REST de Supabase para la PWA (funciona en GitHub Pages).
   La clave publishable es pública y está pensada para usarse en el navegador. */
window.SUPA = (function () {
    var URL_BASE = 'https://vbmcjvlwrtlcfokpefrc.supabase.co/rest/v1';
    var KEY = 'sb_publishable_lUq0Ij0Ps61-t6ig99xhQg_qbzbiWHr';

    function headers(extra) {
        var h = {
            'apikey': KEY,
            'Authorization': 'Bearer ' + KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
        return h;
    }

    function req(path, opciones) {
        opciones = opciones || {};
        return fetch(URL_BASE + path, {
            method: opciones.method || 'GET',
            headers: headers(opciones.headers),
            body: opciones.body ? JSON.stringify(opciones.body) : undefined,
            cache: 'no-store'   // evitar que el navegador muestre datos borrados
        }).then(function (r) {
            return r.text().then(function (txt) {
                var data = null;
                try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
                if (!r.ok) {
                    var err = new Error((data && data.message) || ('Error ' + r.status));
                    err.status = r.status;
                    err.data = data;
                    throw err;
                }
                return data;
            });
        });
    }

    function sha256(texto) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
            .then(function (buf) {
                return Array.prototype.map.call(new Uint8Array(buf), function (b) {
                    return ('0' + b.toString(16)).slice(-2);
                }).join('');
            });
    }

    return {
        // ---------- Lecturas ----------
        canchas: function () {
            return req('/canchas?select=id,nombre,sport_id,precio,detalle,estado,img');
        },
        slots: function () {
            return req('/slots?select=sport_id,hora,disponible&order=sport_id,hora');
        },
        metadatos: function () {
            return req('/metadatos?select=key,valor').then(function (filas) {
                var out = {};
                (filas || []).forEach(function (f) { out[f.key] = f.valor; });
                return out;
            });
        },
        reservas: function (sport) {
            var path = '/reservas?select=id,cancha_id,fecha,hora_entrada,hora_salida,estado,' +
                'canchas!inner(nombre,sport_id)&order=id.desc';
            if (sport) path += '&canchas.sport_id=eq.' + encodeURIComponent(sport);
            return req(path).then(function (filas) {
                return (filas || []).map(function (r) {
                    var c = r.canchas;
                    if (Array.isArray(c)) c = c[0] || {};
                    return {
                        id: r.id,
                        cancha_nombre: (c && c.nombre) || '',
                        sport_id: (c && c.sport_id) || '',
                        fecha: r.fecha,
                        hora_entrada: r.hora_entrada,
                        hora_salida: r.hora_salida,
                        estado: r.estado
                    };
                });
            });
        },

        // ---------- Login / registro ----------
        login: function (username, password) {
            return req('/usuarios?select=id,username,password_hash,activo&username=eq.' +
                encodeURIComponent(username) + '&limit=1').then(function (filas) {
                if (!filas || !filas.length || !filas[0].activo) return { ok: false, msg: 'Credenciales inválidas' };
                var fila = filas[0];
                return sha256(password).then(function (hash) {
                    if (hash !== String(fila.password_hash).toLowerCase()) {
                        return { ok: false, msg: 'Credenciales inválidas' };
                    }
                    return {
                        ok: true,
                        msg: '✔ ¡Bienvenido, ' + fila.username + '!',
                        usuario: fila.username,
                        usuario_id: fila.id
                    };
                });
            });
        },
        registrar: function (username, password) {
            return sha256(password).then(function (hash) {
                return req('/usuarios', {
                    method: 'POST',
                    headers: { 'Prefer': 'resolution=ignore-duplicates,return=representation' },
                    body: { username: username, password_hash: hash, activo: true }
                }).then(function (filas) {
                    if (!filas || !filas.length) return { ok: false, msg: 'El usuario ya existe' };
                    return { ok: true, msg: '✔ Usuario ' + username + ' creado. Inicia sesión con él.' };
                });
            }).catch(function (e) {
                if (e.status === 409) return { ok: false, msg: 'El usuario ya existe' };
                throw e;
            });
        },

        // ---------- Escrituras ----------
        crearReserva: function (datos) {
            return req('/reservas', {
                method: 'POST',
                headers: { 'Prefer': 'return=representation' },
                body: datos
            }).then(function (filas) {
                return { ok: true, id: (filas && filas[0] && filas[0].id), msg: '✔ Reserva creada en Supabase.' };
            });
        },
        borrarReserva: function (id) {
            return req('/reservas?id=eq.' + encodeURIComponent(id), {
                method: 'DELETE',
                headers: { 'Prefer': 'return=representation' }
            }).then(function (filas) { return { ok: !!(filas && filas.length) }; });
        },
        crearJugador: function (reservaId, nombre, confirmado, pagado) {
            return req('/jugadores', {
                method: 'POST',
                headers: { 'Prefer': 'return=representation' },
                body: { reserva_id: reservaId, nombre: nombre, confirmado: !!confirmado, pagado: !!pagado }
            }).then(function (filas) {
                return { ok: true, id: (filas && filas[0] && filas[0].id) };
            });
        },
        actualizarJugador: function (id, cambios) {
            return req('/jugadores?id=eq.' + encodeURIComponent(id), {
                method: 'PATCH',
                headers: { 'Prefer': 'return=representation' },
                body: cambios
            }).then(function (filas) { return { ok: !!(filas && filas.length) }; });
        },
        cambiarPrecio: function (id, precio) {
            return req('/canchas?id=eq.' + encodeURIComponent(id), {
                method: 'PATCH',
                headers: { 'Prefer': 'return=representation' },
                body: { precio: precio }
            }).then(function (filas) {
                return { ok: !!(filas && filas.length), msg: '✔ Precio actualizado' };
            });
        }
    };
})();
