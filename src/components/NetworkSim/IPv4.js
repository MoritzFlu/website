import { IPV4_COLOR } from "./config";

import RoutingTable from "./RoutingTable";

export class IPHeader {
    version
    ihl
    dscp
    ecn
    total_length
    identification
    flags
    fragment_offset
    ttl
    protocol
    header_checksum
    src
    dst
    data
}

export default class IPv4 {
    parent
    arp
    l2
    icmp = null
    routing_table
    // Queue packets waiting for ARP resolution, keyed by the IP being resolved.
    // Values are arrays of IPHeader objects.
    queue = {}
    l4_protos = {}

    constructor(parent) {
        this.parent = parent;
        this.routing_table = new RoutingTable();
        this.ethertype = 0x0800;

        this.receive = this.receive.bind(this);
        this.arp_callback = this.arp_callback.bind(this);
        this.init = this.init.bind(this);
        this.send = this.send.bind(this);
    }

    // Populate routing table with directly-connected routes (called after ports exist).
    init() {
        for (let i = 0; i < this.parent.ports.length; i++) {
            let port = this.parent.ports[i];
            for (let j = 0; j < port.l3Addr.length; j++) {
                this.routing_table.add_route(port.l3Addr[j], null, i);
            }
        }
    }

    register_arp(arp) {
        this.arp = arp;
        this.arp.register_address_callback(this.arp_callback);
    }

    register_l2(l2_handler) {
        this.l2 = l2_handler;
        this.l2.register_ethertype(0x0800, this.receive);
    }

    // Register an L4 protocol handler (e.g. TCP=6, UDP=17, ICMP=1).
    register_protocol(proto_num, handler) {
        this.l4_protos[proto_num] = handler;
    }

    // Optionally attach an ICMP instance so IPv4 can generate error messages.
    register_icmp(icmp) {
        this.icmp = icmp;
    }

    // Called by ARP when a pending address resolution completes.
    arp_callback(mac, resolved_ip, port) {
        const queued = this.queue[resolved_ip];
        if (!queued) return;
        delete this.queue[resolved_ip];
        for (const pkt of queued) {
            this.l2.send(mac, port, pkt, this.ethertype, pkt.color || IPV4_COLOR);
        }
    }

    receive(header, port) {
        header.ttl -= 1;
        if (header.ttl <= 0) {
            console.log("TTL expired dropping packet from", header.src, "to", header.dst);
            if (this.icmp) this.icmp.time_exceeded(header);
            return;
        }

        // Check if this packet is destined for one of our own addresses.
        for (let i = 0; i < this.parent.ports.length; i++) {
            if (this.parent.ports[i].check_can_receive(header.dst)) {
                const handler = this.l4_protos[header.protocol];
                if (handler) {
                    handler(header.data, header);
                } else {
                    console.log("No L4 handler for protocol", header.protocol, "on node", this.parent.id);
                }
                return;
            }
        }

        // Not for us — forward (router behaviour).
        this._forward(header);
    }

    _forward(header) {
        const result = this.routing_table.lookup(header.dst);
        if (!result) {
            console.log("No route to", header.dst, "on node", this.parent.id);
            if (this.icmp) this.icmp.unreachable(header);
            return;
        }
        const resolve_ip = result.next_hop || header.dst;
        const mac = this.arp.lookup(resolve_ip, result.port);
        if (mac === null) {
            if (!this.queue[resolve_ip]) this.queue[resolve_ip] = [];
            this.queue[resolve_ip].push(header);
        } else {
            this.l2.send(mac, result.port, header, this.ethertype, header.color || IPV4_COLOR);
        }
    }

    // color: optional packet color for visualization (DNS_COLOR, TCP_COLOR, etc.)
    send(data, dst, protocol = 0, color = null) {
        const result = this.routing_table.lookup(dst);
        if (!result) {
            console.log("No route to", dst, "on node", this.parent.id);
            return;
        }

        const packet = new IPHeader();
        packet.data = data;
        packet.version = 4;
        packet.src = this.parent.ports[result.port].get_l3addr_witout_subnet(0);
        packet.dst = dst;
        packet.ttl = 64;
        packet.protocol = protocol;
        packet.color = color || IPV4_COLOR;

        const resolve_ip = result.next_hop || dst;
        const mac = this.arp.lookup(resolve_ip, result.port);

        if (mac === null) {
            if (!this.queue[resolve_ip]) this.queue[resolve_ip] = [];
            this.queue[resolve_ip].push(packet);
        } else {
            this.l2.send(mac, result.port, packet, this.ethertype, packet.color);
        }
    }
}
