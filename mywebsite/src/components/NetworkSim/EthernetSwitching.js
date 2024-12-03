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

    update() {

    }

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
        this.forwarding_table[src] = port;

        // If destination is broadcast address, broadcast packet
        if (dst === "FF:FF:FF:FF:FF:FF") {
            this.parent.limited_broadcast(packet,port);
            return
        }

        // Try to get output port from forwarding
        let out_port = this.forwarding_table[dst];

        //console.log("SWITCHING IN",port,"OUT",out_port,"TABLE",this.forwarding_table);

        if (out_port === undefined) {
            // No entry, broadcast through all ports except incoming port
            this.parent.limited_broadcast(packet,port);
        } else {
            // Entry known, send packet according to stored port
            this.parent.send_packet(packet,out_port);
        }

    }

}