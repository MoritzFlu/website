import NetworkNode from './NetworkNode';
import Ethernet from './Ethernet';
import ARP from './ARP';
import IPv4 from './IPv4';
import ICMP from './ICMP';
import UDP from './UDP';
import DNS from './DNS';
import TCP from './TCP';
import * as Config from './config';

export default class Client extends NetworkNode {
    ethernet
    arp
    ip
    icmp
    udp
    dns
    tcp
    type = "client"

    // Set externally by Network.js after construction
    root_dns_ip      = null
    hostname_registry = null  // array of { fqdn, ip }

    constructor(id, svg) {
        super(id, svg);

        this.ethernet = new Ethernet(this);
        this.arp      = new ARP(this, this.ethernet);
        this.ip       = new IPv4(this);
        this.icmp     = new ICMP(this.ip);
        this.udp      = new UDP(this);
        this.dns      = new DNS(this);
        this.tcp      = new TCP(this);

        this.init       = this.init.bind(this);
        this.do_request = this.do_request.bind(this);
    }

    init() {
        this.ip.register_l2(this.ethernet);

        this.arp.init();
        this.ethernet.init();
        this.ip.init();

        this.ip.register_arp(this.arp);
        this.icmp.init();
        this.ip.register_icmp(this.icmp);

        this.udp.init();
        this.udp.register_port(53, this.dns.receive);
        this.tcp.init();

        this.renderer.register_event(this.id, "click", () => {
            if (!this.renderer.on_node_click) return;
            this.renderer.on_node_click({
                type: 'client',
                id: this.id,
                ip: this.ports[0]?.get_l3addr_witout_subnet(0) ?? null,
                arp_table: { ...this.arp.table },
            });
        });
    }

    // Full DNS → TCP → HTTP for a specific hostname entry { fqdn, ip }.
    // Called by the Network scheduler, which picks both the client and the hostname.
    do_request_for(fqdn) {
        if (!this.root_dns_ip) return;
        this.dns.query(fqdn, this.root_dns_ip, (resolved_ip) => {
            this.tcp.connect(resolved_ip, 80, (conn_id) => {
                this.tcp.send(conn_id, [{ method: 'GET', url: fqdn }]);
            });
        });
    }

    // TCP → HTTP to a pre-resolved IP, skipping DNS entirely.
    // fast=true also skips the TCP handshake so HTTP data is visible immediately.
    do_direct_request(ip, fqdn, fast = false) {
        const connect = fast
            ? (dst, port, cb) => this.tcp.connect_fast(dst, port, cb)
            : (dst, port, cb) => this.tcp.connect(dst, port, cb);
        connect(ip, 80, (conn_id) => {
            this.tcp.send(conn_id, [{ method: 'GET', url: fqdn }]);
        });
    }

    // Legacy alias kept for compatibility.
    do_request() {
        if (!this.hostname_registry || this.hostname_registry.length === 0) return;
        const entry = this.hostname_registry[Math.floor(Math.random() * this.hostname_registry.length)];
        this.do_request_for(entry.fqdn);
    }

    update() {}
}
