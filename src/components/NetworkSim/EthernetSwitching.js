export default class EthernetSwitching {
    forwarding_table
    parent

    constructor(parent) {
        // Functions that get called via setTimeout need to be bound
        this.init = this.init.bind(this);
        this.forwarding_table = {};
        this.parent = parent;

        this.type = 1;

        this.receive = this.receive.bind(this);
    }

    init() {
        this.parent.register_packet_handler(this.type, this.receive);
    }

    flush() {
        this.forwarding_table = {};
    }

    update() {}

    receive(packet, port) {

        // Get ethernet frame
        // TODO: layers in packets and parsing should be done more flexible
        ///   e.g. implement packets types and their numbers 
        let frame = packet.data;

        // Get source, dest macs from packet
        let src = frame.src;
        let dst = frame.dst;

        // Learn address from port
        // TODO: add lifetime and remove and maybe more sophisticated handling of colissions
        const prev = this.forwarding_table[src];
        if (prev !== undefined && prev !== port) {
            console.warn(`[L2-MOVE] ${this.parent.id}: MAC ${src} MOVED from port ${prev} → ${port}  (dst=${dst})`);
        }
        this.forwarding_table[src] = port;

        // If destination is broadcast address, broadcast packet
        if (dst === "FF:FF:FF:FF:FF:FF") {
            this.parent.limited_broadcast(packet,port);
            return
        }

        // Try to get output port from forwarding table.
        // If the port is blocked (STP state change after learning), fall back to flooding
        // rather than silently dropping — the spanning tree's active ports will deliver it.
        let out_port = this.forwarding_table[dst];

        if (out_port === undefined || this.parent.ports[out_port].blocked) {
            this.parent.limited_broadcast(packet,port);
        } else {
            this.parent.send_packet(packet,out_port);
        }

    }

}