import * as d3 from "d3";
import STP from './STP';



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
    renderer

    constructor(id,renderer) {
        this.id = id;
        this.renderer = renderer;
        this.packet_handlers = {};

        // Binds for asynchronous calls from other classes e.g. setTimeout
        this.receive_packet = this.receive_packet.bind(this);
        this.show_debug = this.show_debug.bind(this);
        this.init = this.init.bind(this);
        this.register_packet_handler = this.register_packet_handler.bind(this);
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

    send_packet(packet, port) {
        this.ports[port].send_packet(packet);
    }

    broadcast(packet) {
        for (let i = 0; i < this.ports.length; i++) {
            // Start animation
            this.ports[i].send_packet(packet);
        }
    }

    // Broadcast over all ports except the one mentioned
    // (necessary for ethernet switching)
    limited_broadcast(packet,port) {
        for (let i = 0; i < this.ports.length; i++) {
            // Skip port that is passed as parameter
            if (i === port) continue;
            // Start animation
            this.ports[i].send_packet(packet);
        }
    }




    // Super implements packet handling to ensure that all nodes have the same packet.type interpretation
    // This should always check if the module has the corresponding module setup and drop the packet if not
    receive_packet(packet,port) {
        // Get handling function based on packet outer type
        let handler = this.packet_handlers[packet.type];
        // Check if handler exists
        if ( handler === undefined) {
            //console.warn("Dropping unknown packet type, since no handler found", packet.type, "Source: ", this);
            return;
        }
        // Pass packet on to handler
        handler(packet, port);
    }

    register_packet_handler(type, handler) {

        // Check if handler already exists
        if ( type in this.packet_handlers) {
            console.warn("Overwriting handler for ", type, "from ", this.packet_handlers[type], "to",handler);
        }

        // Store reference for handler
        this.packet_handlers[type] = handler;
    }
}