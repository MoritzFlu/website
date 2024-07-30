import { ARP_COLOR } from "./config"

// See https://datatracker.ietf.org/doc/html/rfc826 for reference
class ARPHeader {
    hrd // Hardware address space
    pro // Ethertype, e.g. Ipv4 has 0x0800
    hlen // Length of HW address in octets
    pln // Length of L3 address
    op // operation
    sha  // sender hardware address
    spa // sender protocol address
    tha // target hardware address
    tpa // traget protocol address
} 

// TODO: could be more flexible to lookup any kind of address but currently only focuses on Ethernet and IPv4
export default class ARP {
    node
    table
    layer2

    // Store packets that wait for an ARP reply
    lookup_queue

    constructor(node,layer2) {
        this.node = node;
        this.layer2 = layer2;
        this.table = {};
        this.address_callback = null

        // TODO: add timeout to queue
        this.lookup_queue = {};

        this.init = this.init.bind(this);
        this.lookup = this.lookup.bind(this);
        this.send_request = this.send_request.bind(this);

        this.receive = this.receive.bind(this);

        this.ethertype = 0x0806;
    }

    // Perform lookup on all 
    init() {
        // Loop over all ports and store their adresses
        // TODO: this should be updateable when new addresses are assigned
        for (let i = 0; i < this.node.ports.length; i++) {
            let port = this.node.ports[i];
            this.table[port.l3Addr] = {
                l2Addr: port.l2Addr,
                port: i
            };
        }

        this.layer2.register_ethertype(0x0806,this.receive);
    }

    register_address_callback(callback) {
        this.address_callback = callback
    }
    
    receive(header,port) {

        // Received an ARP request
        if (header.op === 1) {
            this.handle_request(header, port);
        }

        // Received an ARP reply
        if (header.op === 2) {
            this.handle_answer(header, port);
        }

    }

    handle_request(header,port) {
        let req_addr = header.tpa;

        let port_obj = this.node.ports[port];

        // Check if this node has the requested IP addr
        if (port_obj.check_can_receive(req_addr)) {
            console.log("ANSWERING ARP REQUEST",header);
            this.answer_request(header,port);
        }
    }

    answer_request(header,port) {
        let reply = new ARPHeader();

        reply.hrd = 1; // Ethernet
        reply.hlen = 6; // MAC (6 octets)
        reply.pln = 4; // IPv4 (4 octets)
        reply.op = 2; // Reply

        // Set target for reply to source from origin
        reply.tha = header.sha;
        reply.tpa = header.spa;
        // Reply to requested IP
        reply.spa = header.tpa;
        // Add MAC from port to request
        reply.sha = this.node.ports[port].l2Addr;

        // Pass packet to L2 handler
        this.layer2.send(header.sha,port,reply,this.ethertype,ARP_COLOR);
    }

    // TODO: better handling, store info per port
    handle_answer(header,port) {
        // add entry to ARP table
        this.table[header.spa] = header.sha;
        this.address_callback(header.sha, header.spa, port);
    }

    // Sends ARP packet to perform IP lookup
    lookup(adress,port) {
        // Check if address is already known
        let mac = this.table[adress];
        if (mac === undefined) {
            this.send_request(adress, port);
            // TODO: add hook wait for reply
            return null;
        }  else {
            // Adress is known
            return mac;
        }
    }

    send_request(address,port) {
        console.log(this,port);
        let req = new ARPHeader();

        req.hrd = 1; // Ethernet
        req.pro = 0x800; // IPv4
        req.hlen = 6; // MAC (6 octets)
        req.pln = 4; // IPv4 (4 octets)
        req.op = 1; // Request

        req.sha = this.node.ports[port].l2Addr;
        // TODO: choose IP better?
        // Does that even need to be set here?
        req.spa = this.node.ports[port].get_l3addr_witout_subnet(0);

        req.tpa = address;


        // Transmit package
        // TODO: add hook that waits for response
        // TODO: add MAC broadcast to switching
        this.layer2.send("FF:FF:FF:FF:FF:FF",port,req,this.ethertype,ARP_COLOR);
    }
}