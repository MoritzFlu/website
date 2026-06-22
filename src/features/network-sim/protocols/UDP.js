const PROTO = 17;

// Minimal UDP layer. Wraps datagrams over IPv4/17.
// Each send() produces exactly one IP packet — no fragmentation, no connection state.
export default class UDP {
    parent
    _handlers = {}  // port number → handler(data, src_ip, src_port)

    constructor(parent) {
        this.parent  = parent;
        this.receive = this.receive.bind(this);
    }

    init() {
        this.parent.ip.register_protocol(PROTO, this.receive);
    }

    register_port(port, handler) {
        this._handlers[port] = handler;
    }

    receive(segment, ip_header) {
        const handler = this._handlers[segment.dst_port];
        if (handler) handler(segment.data, ip_header.src, segment.src_port);
    }

    send(data, dst_ip, dst_port, src_port, color) {
        this.parent.ip.send({ src_port, dst_port, data }, dst_ip, PROTO, color);
    }
}
