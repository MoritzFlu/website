import * as d3 from "d3";
import STP from './STP';

// Todo: SimPacket should be moved to another separate file to fix cycle imports

// ---------------------------------------------------------------
//    DATA CLASSES FOR SIMULATION
// ---------------------------------------------------------------
Array.prototype.random = function () {
    return this[Math.floor((Math.random() * this.length))];
}

class SimLink {
    svg_ref
    constructor(ref) {
        this.svg_ref = ref;
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

    // Set to true if this animations over this link have to be played in reverse
    reversed = false;

    l2Addr
    l3Addr

    constructor(parent, link, speed) {
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
        this.parent.receive_packet(packet);
    }

    send_packet(packet) {
        let color = packet.color;
        let svg = this.link.svg_ref;

        let start = { x: svg.getAttribute("x1"), y: svg.getAttribute("y1") };
        let end = { x: svg.getAttribute("x2"), y: svg.getAttribute("y2") };

        // Reverse direction if needed
        if (this.reversed) {
            let tmp = start;
            start = end;
            end = tmp;
        }

        // TODO: Drawing should be moved out of this functtion since it mixes network logic and drawing loggic
        var packet_svg = d3.select("#network-svg")
            .append("circle")
            .attr("r", 10)
            .attr("fill", color)
            .attr("cx", start.x)
            .attr("cy", start.y);

        packet_svg.transition()
            .duration(this.speed)
            .ease(d3.easeLinear)
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
    //svg_ref
    id = 0;
    ports = [];

    constructor(id, speed) {
        this.id = id;
        this.speed = speed;

        this.stp = new STP(this.id,this);

        this.receive_packet = this.receive_packet.bind(this);
    }

    add_port(port) {
        this.ports.push(port);
    }

    // Called at the beginning of the simulation
    init() {
        this.stp.init();
    }

    add_connection(destination, svg_link, speed) {
        // Link connecting both
        let link = new SimLink(svg_link);
        // Create ports for source and destination
        let source_port = new SimPort(this, link, speed);
        let dest_port = new SimPort(destination, link, speed);
        source_port.set_destination(dest_port);
        dest_port.set_destination(source_port);
        // Dest port needs to do animations reversed
        dest_port.set_reversed();
        // Add ports to both source and destination sim node
        this.ports.push(source_port);
        destination.add_port(dest_port);
    }

    // Main handler for reading packets, called by ports
    receive_packet(packet) {
        switch (packet.type) {
            case 0:
                this.stp.recveive(packet);
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