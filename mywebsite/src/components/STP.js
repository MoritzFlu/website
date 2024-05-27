import * as d3 from "d3";
import { SimPacket } from "./SimComponents";

export default class STP {
    bridge_id
    root_id
    is_root
    parents
    status
    status_viz
    status_text

    root_path_cost = 0

    // Scale is normal *4 since packets travel slow
    // Should always be faster than longest link transmission time
    // TODO: bind to time scale
    hello_time = 2000 * 4;

    constructor(bridge_id, parent) {
        this.parent = parent;
        this.bridge_id = bridge_id;
        this.root_id = bridge_id;
        this.is_root = true;
        this.status = {};

        // Bind update to call it at intervals
        this.update = this.update.bind(this);
        // Bind since receive is called asynchronous and needs to change this
        this.recveive = this.recveive.bind(this);
    }

    // STP initial actions
    init() {

        // Initial status visualization
        this.status_viz = d3.select("#network-svg")
            .append("circle")
            .attr("r", 10)
            .attr("fill", "#ff0000")
            .attr("cx", this.parent.svg.getAttribute("x"))
            .attr("cy", this.parent.svg.getAttribute("y"));

        this.status_text = d3.select("#network-svg")
            .append("text")
            .attr("x", this.parent.svg.getAttribute("x"))
            .attr("y", this.parent.svg.getAttribute("y"))
            .text(this.root_id);

        // Init status for all ports
        // Note that the port IDs start at one
        for (let i = 0; i < this.parent.ports.length; i++) {
            this.status[i] = {
                // One of: RP, DP, NDP
                state: "Start",
                cost: this.parent.ports[i].speed
            };
        }
        this.update();
    }

    update() {

        for (let i = 0; i < this.parent.ports.length; i++) {
            // Send initial BPDU
            let bpdu = new SimPacket(0, {
                root: this.root_id,
                // TODO: pass cost from link transmission duration
                cost: this.status[i].cost,
                id: this.bridge_id,
                port: i
            }, "#0000FF");

            // Only send packet if this is not a NDP or RP
            let is_not_rp = !(this.status[i].state === "RP");
            let is_not_ndp = !(this.status[i].state === "NDP");
            if ( is_not_rp & is_not_ndp) {
                this.parent.ports[i].send_packet(bpdu);
            }



        }
        setTimeout(this.update, this.hello_time);
    }

    update_root_port(port) {
        // Root port is updatedd, reset all other port states
        for (let i = 0; i < Object.keys(this.status).length; i++) {
            if (i === port) {
                this.status[i].state = "RP";
            } else {
                this.status[i].state = "DP";
            }
        }
    }

    update_root_cost(cost) {
        // Set new cost for all ports
        for (let i = 0; i < Object.keys(this.status).length; i++) {
            if (this.status[i].state !== "RP") {
                let speed = this.parent.ports[i].speed;
                this.status[i].cost = cost + speed;
            } else {
                this.status[i].cost = cost;
            }
        }
    }

    get_RP() {
        for (let i = 0; i < Object.keys(this.status).length; i++) {
            let port = this.status[i];
            if (port.state === "RP") { return port; }
        }
    }


    // On receive packet
    recveive(packet, port) {

        // Dont handle packets on NDP ports
        if (this.status[port].state === "NDP") {return;}

        let data = packet.data;
        //console.log(packet,this.bridge_id);
        // Check if root id has to be updated
        // TODO: is race condition with sending BPDUs?
        if (data.root < this.root_id) {
            //console.log("Updated root id from to",this.root_id, data.root);
            this.is_root = false;
            this.root_id = data.root;

            // Set root port
            this.update_root_port(port);
            this.update_root_cost(data.cost);

            this.status_viz.attr("fill", "#0000ff");
            this.status_text.text(this.root_id);
            return;

        }

        // Get current root port
        let port_obj = this.status[port];
        let rp = this.get_RP();

        // No root port set, no further handling
        if (rp === undefined) {return;}

        // Update root path cost if received one is lower
        // But onlye accept BPDUs that announce same root bridge
        let correct_root = (data.root === this.root_id); // Advertising bridge uses the correct root bridge
        let better_root_path = (data.cost < rp.cost); // Cost to root is shorter than current RP
        if ( correct_root && better_root_path ) {
            console.log("Updating cost to root",this.bridge_id,"NEW: ",data.cost,"OLD: ",rp.cost);
            // Set root port to new lowest cost port
            this.update_root_port(port);
            this.update_root_cost(data.cost);
            return;
        }

        // Check if the advertised root path cost is lower than this ports cost
        // If yes, then change port state to non-designated port
        let lower_cost_advertised = (data.cost < port_obj.cost); // Other bridge advertises lower cost on network segment
        let received_on_non_rp = (port_obj.state !== "RP"); // Current port is not a root port, this is handled above already
        if ( lower_cost_advertised && received_on_non_rp && correct_root ) {
            // Make port blocking
            this.status[port].state = "NDP";
            return;
        }

    }

}