import NetworkNode from './NetworkNode';
import Ethernet from '../protocols/Ethernet';
import ARP from '../protocols/ARP';
import IPv4 from '../protocols/IPv4';
import ICMP from '../protocols/ICMP';
import TCP from '../protocols/TCP';

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
                mac: this.ports[0]?.l2Addr ?? null,
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
        const n = Math.floor(Math.random() * 16) + 5;
        const payloads = Array.from({ length: n }, (_, i) => ({ status: 200, chunk: i, total: n }));
        this.tcp.send(conn_id, payloads);
    }

    send_bootstrap_response(client_ip, client_port) {
        const my_ip = this.ports[0]?.get_l3addr_witout_subnet(0);
        if (!my_ip) return;
        const conn_id = `${my_ip}:80:${client_ip}:${client_port}`;
        this.tcp.connections[conn_id] = {
            role: 'server', state: 'ESTABLISHED',
            my_ip, my_port: 80,
            peer_ip: client_ip, peer_port: client_port,
            seq: 1, peer_seq: 0,
            send_queue: [], send_start: 0, send_base: 0,
            on_data: null, on_close: null,
        };
        this._send_http_response(conn_id);
        return conn_id;
    }

    update() {}
}
