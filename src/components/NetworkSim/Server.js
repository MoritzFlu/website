import NetworkNode from './NetworkNode';
import Ethernet from './Ethernet';
import ARP from './ARP';
import IPv4 from './IPv4';
import ICMP from './ICMP';
import TCP from './TCP';

export default class Server extends NetworkNode {
    ethernet
    arp
    ip
    icmp
    tcp
    type = "server"

    constructor(id, svg) {
        super(id, svg);

        this.ethernet = new Ethernet(this);
        this.arp      = new ARP(this, this.ethernet);
        this.ip       = new IPv4(this);
        this.icmp     = new ICMP(this.ip);
        this.tcp      = new TCP(this);

        this.init = this.init.bind(this);
    }

    init() {
        this.ip.register_l2(this.ethernet);

        this.arp.init();
        this.ethernet.init();
        this.ip.init();

        this.ip.register_arp(this.arp);
        this.icmp.init();
        this.ip.register_icmp(this.icmp);

        this.tcp.init();
        this.tcp.listen(80, (conn_id) => this._handle_connection(conn_id));

        this.renderer.register_event(this.id, "click", () => {
            if (!this.renderer.on_node_click) return;
            this.renderer.on_node_click({
                type: 'server',
                id: this.id,
                ip: this.ports[0]?.get_l3addr_witout_subnet(0) ?? null,
                hostname: this.fqdn ?? null,
                arp_table: { ...this.arp.table },
            });
        });
    }

    _handle_connection(conn_id) {
        const conn = this.tcp.connections[conn_id];
        if (!conn) return;
        conn.on_data = (_data, cid) => this._send_http_response(cid);
    }

    _send_http_response(conn_id) {
        const n = Math.floor(Math.random() * 20) + 1;
        const payloads = Array.from({ length: n }, (_, i) => ({ status: 200, chunk: i, total: n }));
        this.tcp.send(conn_id, payloads);
    }

    update() {}
}
