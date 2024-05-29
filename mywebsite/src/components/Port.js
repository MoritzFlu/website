import * as d3 from "d3";
import * as Config from './config';

export default class Port {
    destination
    link
    speed = 1000;
    parent
    id
    blocked = false;
    renderer

    // Set to true if this animations over this link have to be played in reverse
    reversed = false;

    l2Addr
    l3Addr

    constructor(parent, link, speed, id, renderer) {
        this.id = id;
        this.link = link;
        this.speed = speed;
        this.parent = parent;
        this.renderer = renderer;

        // Bind functions that may be called via setTimeout
        this.receive_packet = this.receive_packet.bind(this);
        this.send_packet = this.send_packet.bind(this);
    }

    set_destination(dest) {
        this.destination = dest;
    }

    block() {
        this.blocked = true;
    }
    unblock() {
        this.blocked = false;
    }

    // Once port is set in reverse mode, does not have to be changed back again
    set_reversed() {
        this.reversed = true;
    }

    // Passes packet to parent switch node for handling
    receive_packet(packet) {
        this.parent.receive_packet(packet, this.id);
    }

    send_packet(packet) {
        // Tell renderer to animate packet
        this.renderer.anim_packet(this.link.id, packet.color, this.speed, this.reversed);

        // Set timeout to call packet handling on receiver
        // Bind ensures that packet is passed as paramter when called
        setTimeout(this.destination.receive_packet.bind(null, packet), this.speed);
    }

}