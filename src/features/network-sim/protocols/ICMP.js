// ICMP_COLOR reserved for future per-packet coloring

const TYPE_ECHO_REPLY     = 0;
const TYPE_UNREACHABLE    = 3;
const TYPE_ECHO_REQUEST   = 8;
const TYPE_TTL_EXCEEDED   = 11;

export default class ICMP {
    ipv4
    proto = 1;

    constructor(ipv4) {
        this.ipv4 = ipv4;
        this.receive = this.receive.bind(this);
    }

    init() {
        this.ipv4.register_protocol(1, this.receive);
    }

    receive(data, ip_header) {
        if (data.type === TYPE_ECHO_REQUEST) {
            this._send(TYPE_ECHO_REPLY, 0, data.payload, ip_header.src);
        }
        // Error types (3, 11) are handled by the originating router/host — no response needed.
    }

    time_exceeded(original_ip_header) {
        this._send(TYPE_TTL_EXCEEDED, 0, original_ip_header, original_ip_header.src);
    }

    unreachable(original_ip_header, code = 0) {
        this._send(TYPE_UNREACHABLE, code, original_ip_header, original_ip_header.src);
    }

    ping(dst) {
        this._send(TYPE_ECHO_REQUEST, 0, null, dst);
    }

    _send(type, code, payload, dst) {
        const msg = { type, code, payload };
        this.ipv4.send(msg, dst, 1);
    }
}
