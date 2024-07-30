import * as d3 from "d3";
import * as Config from './config';

import * as ip from 'ip';

import 'random-mac';
import randomMac from "random-mac";

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

        // TODO: add collision handling
        this.l2Addr = randomMac();
        this.l3Addr = [];

        // TODO: Deceide IP(s) via config file? or implement DHCP?
        if (this.parent.type === "server") {
            this.add_l3addr("10.0.0." + this.parent.id.match(/\d+/)[0] + "/16");
        }
        if (this.parent.type === "client") {
            this.add_l3addr("10.0.1." + this.parent.id.match(/\d+/)[0] + "/16");
        }

        // Bind functions that may be called via setTimeout
        this.receive_packet = this.receive_packet.bind(this);
        this.send_packet = this.send_packet.bind(this);
    }


    // Do this better, allow multiple IP addresses on an interface
    // Better handling needed
    // TODO: better function naming, you code like a first semester
    add_l3addr(addr) {
        //TODO: Add handling for address range overlap
        /* 
        if (ip.isV4Format(addr) || ip.isV6Format(addr)) {
            this.l3Addr.push(addr);
        } else {
            console.error("Trying to add invalid IP address: ",addr);
        }
            */
        this.l3Addr.push(addr);
    }
    rm_l3addr(addr) {
        for (let i = 0; i < this.l3Addr.length; i++) {
            if (ip.isEqual(addr, this.l3Addr[i])) {
                // Remove thsi entry from the stored addresses
                this.l3Addr.splice(i, 1);
            }
        }
    }
    // TODO: change to strip_subnet function called from other functions
    get_l3addr_witout_subnet(index) {
        // Remove subnet mask
        return this.l3Addr[index].split("/")[0]
    }
    // Check if this port has the correct address when receiving a packet
    check_can_receive(addr) {
        for (let i = 0; i < this.l3Addr.length; i++) {
            let to_compare = this.get_l3addr_witout_subnet(i);
            if (ip.isEqual(addr, to_compare)) {
                return true;
            }
        }
        return false;
    }
    check_subnet(addr) {
        for (let i = 0; i < this.l3Addr.length; i++) {
            if (ip.cidrSubnet(this.l3Addr[i]).contains(addr)) {
                return this.l3Addr[i];
            }
        }
        return false;
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
        if (this.blocked) {
            // Drop packet since Port is blocked
            return
        } else {
            this.parent.receive_packet(packet, this.id);
        }

    }

    send_packet(packet) {
        if (this.blocked) {
            return
        } else {

            // Tell renderer to animate packet
            this.renderer.anim_packet(this.link.id, packet.color, this.speed, this.reversed);

            // Set timeout to call packet handling on receiver
            // Bind ensures that packet is passed as paramter when called
            setTimeout(this.destination.receive_packet.bind(null, packet), this.speed);
        }
    }

}