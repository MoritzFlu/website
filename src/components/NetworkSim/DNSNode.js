import Router from './Router';
import DNS from './DNS';

// A DNSNode is a Router that also runs the DNS protocol (IPv4/53).
// type is either "dns-root" (the central root DNS) or "dns-asn" (one per ASN).
export default class DNSNode extends Router {
    dns
    type  // overrides Router's "router" default

    constructor(id, renderer, node_type) {
        super(id, renderer);
        this.type = node_type;
        this.dns = new DNS(this);
    }

    init() {
        super.init();
        this.parent_ip_register_dns();
    }

    // Overrides Router._show_routing_table — called by the click handler Router.init() registers.
    // Router binds `this._show_routing_table` at init time, so this override is picked up automatically.
    _show_routing_table() {
        if (!this.renderer.on_node_click) return;
        this.renderer.on_node_click({
            type: this.type,
            id: this.id,
            dns_zones: Object.entries(this.dns.zones).map(([name, rec]) => ({
                name, ip: rec.ip, is_ns: rec.is_ns,
            })),
        });
    }

    parent_ip_register_dns() {
        this.udp.register_port(53, this.dns.receive);
    }

    register_zone(fqdn, ip) { this.dns.register_zone(fqdn, ip); }
    register_ns(label, ns_ip) { this.dns.register_ns(label, ns_ip); }
}
