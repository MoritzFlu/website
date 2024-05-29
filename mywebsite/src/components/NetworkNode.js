import * as d3 from "d3";
import STP from './STP';
import Ethernet from './Ethernet';


import Link from './Link';
import Packet from "./Packet";
import Port from "./Port";

import * as Config from './config';
import "random-mac";

Array.prototype.random = function () {
    return this[Math.floor((Math.random() * this.length))];
}
Array.prototype.randomIndex = function () {
    return Math.floor((Math.random() * this.length));
}


// Todo: SimPacket should be moved to another separate file to fix cycle imports

// ---------------------------------------------------------------
//    DATA CLASSES FOR SIMULATION
// ---------------------------------------------------------------

export default class NetworkNode {
    id = 0;
    ports = [];

    constructor(id) {
        this.id = id;

        this.receive_packet = this.receive_packet.bind(this);
        this.show_debug = this.show_debug.bind(this);
        // Since init is called after a timeout from the network starter
        this.init = this.init.bind(this);

        // TODO: move this to renderer, add function to renderer to register this
        //svg.addEventListener("click",this.show_debug);
    }

    show_debug() {
        console.log(this);
    }

    add_port(link, speed, renderer) {
        // Add new port with ID that is one larger than alst one
        let new_port = new Port(this, link, speed, this.ports.length, renderer);
        this.ports.push(new_port);  
        return new_port
    }

    add_connection(destination, speed, link_obj, renderer) {
        // Link connecting both
        let link = new Link(link_obj.id, renderer);
        // Create ports for source and destination
        let source_port = this.add_port(link, speed, renderer);
        let dest_port = destination.add_port(link, speed, renderer);
        source_port.set_destination(dest_port);
        dest_port.set_destination(source_port);
        // Dest port needs to do animations reversed
        dest_port.set_reversed();
    }

    broadcast(packet) {
        for (let i = 0; i < this.ports.length; i++) {
            // Start animation
            this.ports[i].send_packet(packet);
        }
    }


    // Super implements packet handling to ensure that all nodes have the same packet.type interpretation
    // This should always check if the module has the corresponding module setup and drop the packet if not
    receive_packet(packet,port) {
        // Switch based on packet type
        switch (packet.type) {
            // Type 0: STP
            case 0:
                // Handle STP packet if STP module is in node
                if (this.stp !== undefined) {
                    this.stp.recveive(packet,port);
                } 
                break;
            default:
                console.warn("Dropping unknown packet type", packet.type, "Source: ", this.parent);
        }
    }
}