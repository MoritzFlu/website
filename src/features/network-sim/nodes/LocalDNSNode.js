import NetworkNode from './NetworkNode';
import Ethernet from '../protocols/Ethernet';
import ARP from '../protocols/ARP';
import IPv4 from '../protocols/IPv4';
import UDP from '../protocols/UDP';
import DNS from '../protocols/DNS';

// A leaf-level DNS node that serves A records for one subnet.
// Unlike DNSNode (which extends Router and runs RIP), this is a simple
// end-host: it has no routing capabilities and just answers UDP/53 queries.
export default class LocalDNSNode extends NetworkNode {
    ethernet
    arp
    ip
    udp
    dns
    type = "dns-local"
    _pending_zones = []   // { fqdn, ip } staged before init()

    constructor(id, renderer) {
        super(id, renderer);
        this.ethernet = new Ethernet(this);
        this.arp      = new ARP(this, this.ethernet);
        this.ip       = new IPv4(this);
        this.udp      = new UDP(this);
        this.dns      = new DNS(this);
        this.init     = this.init.bind(this);
    }

    init() {
        this.ip.register_l2(this.ethernet);
        this.arp.init();
        this.ethernet.init();
        this.ip.init();
        this.ip.register_arp(this.arp);
        this.udp.init();

        for (const z of this._pending_zones) {
            this.dns.register_zone(z.fqdn, z.ip);
        }
        this.udp.register_port(53, this.dns.receive);

        this.renderer.register_event(this.id, "click", () => {
            if (!this.renderer.on_node_click) return;
            this.renderer.on_node_click({
                type: 'dns-local',
                id: this.id,
                dns_zones: Object.entries(this.dns.zones).map(([name, rec]) => ({
                    name, ip: rec.ip, is_ns: rec.is_ns,
                })),
            });
        });
    }

    update() {}
}
