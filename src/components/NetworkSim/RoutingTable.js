import * as ip from 'ip';

// Longest-prefix-match routing table.
// next_hop = null means the destination is directly reachable on that port (no gateway needed).
export default class RoutingTable {
    routes = [];

    add_route(prefix, next_hop, port) {
        // Normalize to network address so "10.0.0.254/24" and "10.0.0.0/24" are the same key.
        const subnet = ip.cidrSubnet(prefix);
        const normalized = `${subnet.networkAddress}/${subnet.subnetMaskLength}`;
        this.remove_route(normalized);
        this.routes.push({ prefix: normalized, prefix_len: subnet.subnetMaskLength, next_hop, port });
        this.routes.sort((a, b) => b.prefix_len - a.prefix_len);
    }

    remove_route(prefix) {
        const subnet = ip.cidrSubnet(prefix);
        const normalized = `${subnet.networkAddress}/${subnet.subnetMaskLength}`;
        this.routes = this.routes.filter(r => r.prefix !== normalized);
    }

    // Returns {next_hop, port} or null. next_hop is null for directly-connected routes.
    lookup(dst_ip) {
        for (const route of this.routes) {
            if (ip.cidrSubnet(route.prefix).contains(dst_ip)) {
                return { next_hop: route.next_hop, port: route.port };
            }
        }
        return null;
    }

    get_routes() {
        return this.routes.slice();
    }
}
