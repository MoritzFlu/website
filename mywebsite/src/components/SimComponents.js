import * as d3 from "d3";
import STP from './STP';
import * as Config from './config';

// Todo: SimPacket should be moved to another separate file to fix cycle imports

// ---------------------------------------------------------------
//    DATA CLASSES FOR SIMULATION
// ---------------------------------------------------------------
Array.prototype.random = function () {
    return this[Math.floor((Math.random() * this.length))];
}

Array.prototype.randomIndex = function () {
    return Math.floor((Math.random() * this.length));
}

class SimLink {
    svg
    constructor(ref) {
        this.svg = ref;
    }

}

export class SimPacket {
    color
    data
    type

    constructor(type, data, color) {
        this.type = type;
        this.data = data;
        this.color = color;
    }
}

class SimPort {
    destination
    link
    speed = 1000;
    parent
    id

    // Set to true if this animations over this link have to be played in reverse
    reversed = false;

    l2Addr
    l3Addr

    constructor(parent, link, speed, id) {
        this.id = id;
        this.link = link;
        this.speed = speed;
        this.parent = parent;

        this.receive_packet = this.receive_packet.bind(this);
    }

    set_destination(dest) {
        this.destination = dest;
    }

    set_reversed() {
        this.reversed = true;
    }

    // Passes packet to parent switch node for handling
    receive_packet(packet) {
        this.parent.receive_packet(packet,this.id);
    }

    send_packet(packet) {
        let color = packet.color;
        let svg = this.link.svg;

        let start = { x: svg.getAttribute("x1"), y: svg.getAttribute("y1") };
        let end = { x: svg.getAttribute("x2"), y: svg.getAttribute("y2") };

        // Reverse direction if needed
        if (this.reversed) {
            let tmp = start;
            start = end;
            end = tmp;
        }

        // TODO: Drawing should be moved out of this functtion since it mixes network logic and drawing loggic
        var packet_svg = d3.select("#"+Config.NETWORK_SVG_REF)
            .append("circle")
            .attr("r", Config.PACKET_SIZE)
            .attr("fill", color)
            .attr("cx", start.x)
            .attr("cy", start.y);

        packet_svg.transition()
            .duration(this.speed)
            .ease(Config.PACKET_EASE)
            .attr("cx", end.x)
            .attr("cy", end.y);


        // Set timeout to delete packet on arrival
        setTimeout(() => { packet_svg.remove() }, this.speed);

        // Set timeout to call packet handling on receiver
        // Bind ensures that packet is passed as paramter when called
        setTimeout(this.destination.receive_packet.bind(null,packet), this.speed);
    }

}


export default class SwitchNode {
    id = 0;
    ports = [];
    svg

    constructor(id, svg) {
        this.id = id;
        this.svg = svg;

        this.stp = new STP(this.id,this);

        this.receive_packet = this.receive_packet.bind(this);
        this.show_debug = this.show_debug.bind(this);

        //svg.addEventListener("click",this.show_debug);
    }

    show_debug() {
        console.log(this);
    }

    add_port(link, speed) {
        // Add new port with ID that is one larger than alst one
        let new_port = new SimPort(this, link, speed, this.ports.length);
        this.ports.push(new_port);  
        return new_port
    }

    // Called at the beginning of the simulation
    init() {
        this.stp.init();
    }

    add_connection(destination, svg_link, speed) {
        // Link connecting both
        let link = new SimLink(svg_link);
        // Create ports for source and destination
        let source_port = this.add_port(link, speed);
        let dest_port = destination.add_port(link, speed);
        source_port.set_destination(dest_port);
        dest_port.set_destination(source_port);
        // Dest port needs to do animations reversed
        dest_port.set_reversed();
    }

    // Main handler for reading packets, called by ports
    receive_packet(packet,port) {
        switch (packet.type) {
            case 0:
                this.stp.recveive(packet,port);
                break;
            default:
                console.log("Dropping unknown packet type");
        }
    }


    broadcast(packet) {
        for (let i = 0; i < this.ports.length; i++) {
            // Start animation
            this.ports[i].send_packet(packet);
        }
    }
}