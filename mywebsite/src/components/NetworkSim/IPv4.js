import { IPV4_COLOR } from "./config"

export class IPHeader {
        version // e.g. 4 for IPv4
        ihl // Ip header size
        dscp // Differenciated Services Code Point
        ecn // Congestion notificaitons
        total_length // size of packet (including IP header and data field)
        identification // rarely used
        flags // reserved, dont fragment, more fragments
        fragment_offset
        ttl // time to live
        protocol // L4 protocol
        header_checksum // CHecksum of header
        src // source address
        dst // destination address
        data // L4 data
    }

export default class IPv4 {
    parent
    arp
    l2

    constructor(parent) {
        this.parent = parent;
        this.queue = {}

        this.receive = this.receive.bind(this);
        this.arp_callback = this.arp_callback.bind(this);
        this.init = this.init.bind(this);
        this.send = this.send.bind(this);

        this.ethertype = 0x0800;

    }

    init() {
    }

    // Handler to be called to get L2 address from L3 address
    register_arp(arp) {
        this.arp = arp;
        // Tell ARP which function to call when an address gets resolved
        this.arp.register_address_callback(this.arp_callback);
    }

    // Handler to send frame via
    register_l2(l2_handler) {
        this.l2 = l2_handler;
        // Register handler for IP ethertype
        this.l2.register_ethertype(0x0800,this.receive);
    }

    // TODO: handle multiple calls for asame address
    arp_callback(mac, ip, port) {
        console.log("Received ARP reply for "+mac)
        if (ip in this.queue) {
            let packet = this.queue[ip];

            this.l2.send(mac, port, packet,this.ethertype, IPV4_COLOR);
        }
    }

    receive(packet) {
        console.log("L3 RECEIVE",packet);
    }

    send(data,address) {
        // First: Check which port to send data on
        let out_port = null;
        let src_addr = null;
        for (let i = 0; i < this.parent.ports.length; i++) {
            let port = this.parent.ports[i];
            
            // Use first port that has an IP address range that matches destination
            src_addr = port.check_subnet(address);
            if (src_addr) {
                out_port = port.id;
                break
            }
        }

        // Exit if no viable port was found
        if (out_port === null) {
            console.log("No Port for address: "+address)
            return
        }
        console.log("PORT",out_port);

        let packet = new IPHeader();
        packet.data = data;
        packet.version = 4;
        packet.src = src_addr;
        packet.dst = address;
        packet.ttl = 40;
        
        // Second: Check if mac already known
        let mac = this.arp.lookup(address, out_port);

        if (mac === null) {
            // No address known, queue and wait for ARP reply
            this.queue[address] = data;
        } else {
            // Address known, send out
            // Pass packet to L2 handler
            this.l2.send(mac, out_port, packet,this.ethertype, IPV4_COLOR);
        }

    }



}