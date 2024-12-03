import { ETHERNET_COLOR } from './config';
import Packet from './Packet';

class EthernetHeader {
    src          // MAC source address
    dst          // MAC destination address
    qTag         // 802.1Q tag
    ethertype    // Type of next layer
    data         // Data in frame
    fcs          // Checksum
}

export default class Ethernet {
    node
    l3Protos

    // Similar to the Network node, this layer has to be able to register types via a handler
    // Such that different L3 protocols can register their ethertype here
    constructor(node) {
        // Functions that get called via setTimeout need to be bound
        this.node = node;

        this.l3Protos = {};

        this.type = 1;

        this.receive = this.receive.bind(this);
        this.register_ethertype = this.register_ethertype.bind(this);
        this.init = this.init.bind(this);
    }

    init() {
        // Tell node to forward packets with Type 1 to this layer
        this.node.register_packet_handler(this.type,this.receive);
    }


    register_ethertype(ethertype, handler) {

        // Check if handler already exists
        if ( ethertype in this.l3Protos) {
            console.warn("Overwriting handler for ", ethertype, "from ", this.this.l3Protos[ethertype], "to",handler);
        }

        // Store reference for handler
        this.l3Protos[ethertype] = handler;
    }

    receive(packet,port) {
        // Check if packet is destined for this node
        let frame = packet.data;
        let in_port = this.node.ports[port];

        // Drop packet if not destined for this node
        let is_broadcast = frame.dst === "FF:FF:FF:FF:FF:FF";
        if ( !is_broadcast && (in_port.l2Addr !== frame.dst) ) {
            console.warn("Node", this.node, " received Ethernet frame with wrong destination: ", frame.dst, "Dropping packet!",frame);
            return;
        }

        // Get Ethertype handler
        let type = frame.ethertype;
        let handler = this.l3Protos[type];

        // Check if handler exists
        if ( handler === undefined) {
            console.warn("Dropping unknown ethertype, since no handler found", type, "Source: ", this);
            return;
        }
        // Pass frame data on to handler
        handler(frame.data, port);
    }

    send(destination,port,data,ethertype,color=null) {
        // Wrap frame in ethernet header
        let frame = new EthernetHeader();
        frame.src = this.node.ports[port].l2Addr;
        frame.dst = destination;
        frame.data = data;
        frame.ethertype = ethertype;

        // Wrap data in packet class
        let packet = new Packet(
            this.type,
            frame,
            ETHERNET_COLOR
        )

        // IF color was passed to function overwrite Ethernet color
        if ( !(color === null)) {
            packet.color = color;
        }

        // Send packet out of given port
        //console.log("Sending Ethernet Frame",packet);
        this.node.ports[port].send_packet(packet);
    }
}