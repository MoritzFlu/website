import NetworkNode from './NetworkNode';
import Ethernet from '../protocols/Ethernet';
import ARP from '../protocols/ARP';
import IPv4 from '../protocols/IPv4';
import ICMP from '../protocols/ICMP';
import RIP from '../protocols/RIP';
import UDP from '../protocols/UDP';

export default class Router extends NetworkNode {
    ethernet
    arp
    ip
    icmp
    rip
    udp
    type = "router"

    constructor(id, renderer) {
        super(id, renderer);

        this.ethernet = new Ethernet(this);
        this.arp = new ARP(this, this.ethernet);
        this.ip = new IPv4(this);
        this.icmp = new ICMP(this.ip);
        this.rip = new RIP(this);
        this.udp = new UDP(this);

        this.init = this.init.bind(this);
        this.show_debug = this._show_routing_table.bind(this);
    }

    init() {
        this.ip.register_l2(this.ethernet);

        this.arp.init();
        this.ethernet.init();
        this.ip.init();

        this.ip.register_arp(this.arp);
        this.icmp.init();
        this.ip.register_icmp(this.icmp);

        if (this.rip) this.rip.init();
        this.udp.init();

        this.renderer.register_event(this.id, "click", this._show_routing_table.bind(this));
    }

    // Add a static route (used during network setup and by BGP).
    add_route(prefix, next_hop, port) {
        this.ip.routing_table.add_route(prefix, next_hop, port);
    }

    _show_routing_table() {
        if (this.renderer.on_node_click) {
            this.renderer.on_node_click({
                type: this.type,
                id: this.id,
                routing_table: this.ip.routing_table.get_routes(),
            });
        }
    }

    update() {}
}
