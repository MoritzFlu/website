import * as d3 from "d3";
import { SimPacket } from "./SimComponents";
import * as Config from './config';

// TODO: Reconvergence when nodes go missing
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
    hello_time = Config.TIME_SCALE * 2;

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
        // Bind since recolor root paths should be called asynchronously
        this.show_root_path = this.show_root_path.bind(this);
        
    }

    // STP initial actions
    init() {

        // Init status for all ports
        // Note that the port IDs start at one
        for (let i = 0; i < this.parent.ports.length; i++) {
            this.status[i] = {
                // One of: RP, DP, NDP
                id: i,
                state: "Start",
                cost: this.parent.ports[i].speed
            };
        }

        // TODO: Add handler to show  information on click

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
            }, Config.BPDU_COLOR);

            // Only send packet if this is not a NDP or RP
            let is_not_rp = !(this.status[i].state === "RP");
            let is_not_ndp = !(this.status[i].state === "NDP");
            if ( is_not_rp & is_not_ndp) {
                this.parent.ports[i].send_packet(bpdu);
            }



        }
        setTimeout(this.update, this.hello_time);
    }

    show_root_path() {
        let rp = this.get_RP();

        if (rp === undefined) {return;}


        for (let i = 0; i < Object.keys(this.status).length; i++) {
            let state = this.status[i].state;

            //console.log(this.parent.ports[i].link.svg);
            
            if (state === "RP") {
                this.parent.ports[i].link.svg.setAttribute("style","stroke: rgb(255, 0, 10)");
            }

            if (state === "NDP") {
                this.parent.ports[i].link.svg.setAttribute("style","stroke: rgb(170,170,170)");
            }
        }
        
        
    }

    update_root_port(port, cost) {
        // Root port is updatedd, reset all other port states
        if (cost === undefined) {
            console.log(this);
        }
        for (let i = 0; i < Object.keys(this.status).length; i++) {
            if (i === port) {
                this.status[i].state = "RP";
                this.status[i].cost = cost;
            } else {
                this.status[i].state = "DP";
                let speed = this.parent.ports[i].speed;
                if (speed === undefined) {
                    console.log(this);
                }
                this.status[i].cost = cost + speed;
            }

            // Ensure that all ports are not blocked and can send packets
            this.parent.ports[i].unblock();
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
        //this.show_root_path();
        
        let data = packet.data;

        // -----------------------------------
        //  HANDLE NEW LOWER ROOT ID RECEIVED
        // -----------------------------------

        // Check if root id has to be updated
        // TODO: is race condition with sending BPDUs?
        if (data.root < this.root_id) {
            //console.log("Updated root id from to",this.root_id, data.root);
            this.is_root = false;
            this.root_id = data.root;

            // Set root port
            this.update_root_port(port, data.cost);
            return;
        }

        // Receiving a new root id should be handled even on NDP ports
        // All other handling will not be applied if packet arrives on an NDP port
        if (this.status[port].state === "NDP") {return;}

        // -----------------------------------
        //  HANDLE LOWER COST ROOT PATH RECEIVED
        // -----------------------------------

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
            //console.log("Updating cost to root",this.bridge_id,"NEW: ",data.cost,"OLD: ",rp.cost);
            // Set root port to new lowest cost port
            this.update_root_port(port,data.cost);
            return;
        }

        // -----------------------------------
        //  HANDLE LOWER COST ROOT PATH RECEIVED ON 
        // -----------------------------------

        // Check if the advertised root path cost is lower than this ports cost
        // If yes, then change port state to non-designated port
        let lower_cost_advertised = (data.cost < port_obj.cost); // Other bridge advertises lower cost on network segment
        let received_on_non_rp = (port_obj.state !== "RP"); // Current port is not a root port, this is handled above already
        if ( lower_cost_advertised && received_on_non_rp && correct_root ) {
            // Make port blocking
            this.status[port].state = "NDP";
            this.parent.ports[port].block();
            return;
        }

    }

}