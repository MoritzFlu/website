import * as Config from './config';

// Simplified TCP — 3-way handshake + sliding window (size TCP_WINDOW_SIZE) + cumulative ACK.
// Segment format: { src_port, dst_port, seq, ack, flags, data?, is_last? }
// flags: "SYN" | "SYN-ACK" | "ACK" | "DATA" | "FIN"
// conn_id = "local_ip:local_port:peer_ip:peer_port"

let _port_counter = 49152;

export default class TCP {
    parent
    connections = {}   // conn_id → connection state
    listeners  = {}    // port_num → on_connect(conn_id) callback

    constructor(parent) {
        this.parent = parent;
        this.receive = this.receive.bind(this);
    }

    init() {
        this.parent.ip.register_protocol(6, this.receive);
    }

    // Server: register a listener on a local port
    listen(port, on_connect) {
        this.listeners[port] = on_connect;
    }

    // Client: open a connection without a handshake; calls on_established immediately.
    // The server auto-creates its connection state on the first DATA segment received.
    connect_fast(dst_ip, dst_port, on_established) {
        const src_port = ((_port_counter++) % 16383) + 49152;
        const my_ip    = this._my_ip();
        const conn_id  = `${my_ip}:${src_port}:${dst_ip}:${dst_port}`;
        this.connections[conn_id] = {
            role: 'client', state: 'ESTABLISHED',
            my_ip, my_port: src_port,
            peer_ip: dst_ip, peer_port: dst_port,
            seq: 1, peer_seq: 1,
            send_queue: [], send_start: 0, send_base: 0,
            on_established, on_data: null, on_close: null,
        };
        on_established(conn_id);
    }

    // Client: open a connection; on_established(conn_id) is called when handshake completes
    connect(dst_ip, dst_port, on_established) {
        const src_port = ((_port_counter++) % 16383) + 49152;
        const my_ip = this._my_ip();
        const conn_id = `${my_ip}:${src_port}:${dst_ip}:${dst_port}`;

        this.connections[conn_id] = {
            role: 'client',
            state: 'SYN_SENT',
            my_ip, my_port: src_port,
            peer_ip: dst_ip, peer_port: dst_port,
            seq: 1,         // next seq to send (SYN consumed seq=0)
            peer_seq: 0,    // next expected from peer
            send_queue: [],
            send_start: 0,
            send_base: 0,
            on_established,
            on_data: null,
            on_close: null,
        };

        this._seg(dst_ip, src_port, dst_port, { flags: 'SYN', seq: 0, ack: 0 }, Config.TCP_COLOR);
    }

    // Send an array of payloads on an established connection using a sliding window
    send(conn_id, payloads) {
        const conn = this.connections[conn_id];
        if (!conn || conn.state !== 'ESTABLISHED') return;
        conn.send_queue = payloads;
        conn.send_start = conn.seq;
        conn.send_base  = conn.seq;
        this._flush_window(conn_id);
    }

    receive(segment, ip_header) {
        const my_ip   = ip_header.dst;
        const peer_ip = ip_header.src;
        const { src_port: peer_port, dst_port: my_port, flags } = segment;
        const conn_id = `${my_ip}:${my_port}:${peer_ip}:${peer_port}`;

        switch (flags) {
            case 'SYN':     return this._on_syn(conn_id, segment, my_ip, my_port, peer_ip, peer_port);
            case 'SYN-ACK': return this._on_synack(conn_id, segment);
            case 'DATA':    return this._on_data(conn_id, segment, my_ip, my_port, peer_ip, peer_port);
            case 'ACK':     return this._on_ack(conn_id, segment);
            case 'FIN':     return this._on_fin(conn_id, segment);
            default: break;
        }
    }

    _on_syn(conn_id, seg, my_ip, my_port, peer_ip, peer_port) {
        if (!this.listeners[my_port]) return;
        this.connections[conn_id] = {
            role: 'server',
            state: 'SYN_RECEIVED',
            my_ip, my_port,
            peer_ip, peer_port,
            seq: 1,                  // SYN-ACK consumes seq=0
            peer_seq: seg.seq + 1,   // client's SYN counts as 1
            send_queue: [],
            send_start: 0,
            send_base: 0,
            on_data: null,
            on_close: null,
        };
        this._seg(peer_ip, my_port, peer_port,
            { flags: 'SYN-ACK', seq: 0, ack: seg.seq + 1 }, Config.TCP_COLOR);
    }

    _on_synack(conn_id, seg) {
        const conn = this.connections[conn_id];
        if (!conn || conn.state !== 'SYN_SENT') return;
        conn.state    = 'ESTABLISHED';
        conn.peer_seq = seg.seq + 1;  // server's SYN-ACK counts as 1
        this._seg(conn.peer_ip, conn.my_port, conn.peer_port,
            { flags: 'ACK', seq: conn.seq, ack: seg.seq + 1 }, Config.TCP_COLOR);
        if (conn.on_established) conn.on_established(conn_id);
    }

    _on_ack(conn_id, seg) {
        const conn = this.connections[conn_id];
        if (!conn) return;

        if (conn.state === 'SYN_RECEIVED') {
            conn.state = 'ESTABLISHED';
            if (this.listeners[conn.my_port]) this.listeners[conn.my_port](conn_id);
            return;
        }

        if (conn.state === 'ESTABLISHED') {
            conn.send_base = seg.ack;
            const all_done = seg.ack >= conn.send_start + conn.send_queue.length
                          && conn.send_queue.length > 0;
            if (all_done) {
                // All data ACKed — send FIN
                this._seg(conn.peer_ip, conn.my_port, conn.peer_port,
                    { flags: 'FIN', seq: conn.seq, ack: conn.peer_seq }, Config.TCP_COLOR);
                conn.seq++;
                conn.state = 'FIN_WAIT';
            } else {
                this._flush_window(conn_id);
            }
            return;
        }

        if (conn.state === 'FIN_WAIT') {
            if (conn.on_close) conn.on_close(conn_id);
            delete this.connections[conn_id];
        }
    }

    _on_data(conn_id, seg, my_ip, my_port, peer_ip, peer_port) {
        let conn = this.connections[conn_id];
        if (!conn) {
            // fast-connect path: client skipped the handshake, auto-create server side
            if (!this.listeners[my_port]) return;
            conn = this.connections[conn_id] = {
                role: 'server', state: 'ESTABLISHED',
                my_ip, my_port, peer_ip, peer_port,
                seq: 1, peer_seq: 0,
                send_queue: [], send_start: 0, send_base: 0,
                on_data: null, on_close: null,
            };
            this.listeners[my_port](conn_id);
        }
        conn.peer_seq = seg.seq + 1;

        // Cumulative ACK: only send ACK at window boundary or on the last packet
        const at_window_boundary = (seg.seq % Config.TCP_WINDOW_SIZE === 0);
        if (at_window_boundary || seg.is_last) {
            this._seg(conn.peer_ip, conn.my_port, conn.peer_port,
                { flags: 'ACK', seq: conn.seq, ack: seg.seq + 1 }, Config.TCP_COLOR);
        }

        if (conn.on_data) conn.on_data(seg.data, conn_id);
    }

    _on_fin(conn_id, seg) {
        const conn = this.connections[conn_id];
        if (!conn) return;
        this._seg(conn.peer_ip, conn.my_port, conn.peer_port,
            { flags: 'ACK', seq: conn.seq, ack: seg.seq + 1 }, Config.TCP_COLOR);
        if (conn.on_close) conn.on_close(conn_id);
        delete this.connections[conn_id];
    }

    // Send as many DATA segments as the window allows, spaced by a small delay
    _flush_window(conn_id) {
        const conn = this.connections[conn_id];
        if (!conn || conn.state !== 'ESTABLISHED' || conn.send_queue.length === 0) return;

        const window_end = conn.send_base + Config.TCP_WINDOW_SIZE;
        let delay = 0;

        while (conn.seq < window_end) {
            const idx = conn.seq - conn.send_start;
            if (idx >= conn.send_queue.length) break;

            const seq     = conn.seq;
            const payload = conn.send_queue[idx];
            const is_last = (idx === conn.send_queue.length - 1);

            ;((s, p, last, d) => setTimeout(() => {
                if (!this.connections[conn_id]) return;
                this._seg(conn.peer_ip, conn.my_port, conn.peer_port,
                    { flags: 'DATA', seq: s, ack: conn.peer_seq, data: p, is_last: last },
                    Config.HTTP_COLOR);
            }, d))(seq, payload, is_last, delay);

            delay += 60;
            conn.seq++;
        }
    }

    _seg(dst_ip, src_port, dst_port, fields, color) {
        this.parent.ip.send({ src_port, dst_port, ...fields }, dst_ip, 6, color);
    }

    _my_ip() {
        for (const port of this.parent.ports) {
            if (port.l3Addr.length > 0) return port.get_l3addr_witout_subnet(0);
        }
        return '0.0.0.0';
    }
}
