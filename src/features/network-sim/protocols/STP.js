import Packet from '../helpers/Packet';
import * as Config from '../helpers/config';

// TODO: Reconvergence when nodes go missing
// TODO: model all port states
// TODO: model correct packet format
export default class STP {
    bridge_id
    root_id
    is_root
    parents
    status
    status_viz
    status_text

    root_path_cost = 0
    hello_count = 0

    // Type used in packets:
    type = 0;

    // Fast during convergence, slow after. Switched in update() after hello_count >= 2.
    hello_time = Config.STP_HELLO_FAST;

    constructor(bridge_id, parent) {
        this.parent = parent;
        this.bridge_id = bridge_id;
        this.root_id = bridge_id;
        this.is_root = true;
        this.status = {};

        // Bind update to call it at intervals
        this.update = this.update.bind(this);
        // Bind since receive is called asynchronous and needs to change this
       this.receive = this.receive.bind(this);
        // Bind since recolor root paths should be called asynchronously
        this.show_root_path = this.show_root_path.bind(this);
        
    }

    // STP initial actions
    init() {
        this.parent.register_packet_handler(this.type, this.receive);

        for (let i = 0; i < this.parent.ports.length; i++) {
            this.status[i] = {
                id: i,
                state: "Start",
                cost: this.parent.ports[i].speed
            };
        }

        // Start as self-declared root (golden glow); cleared when a better root is found.
        this.parent.renderer.set_stp_root(this.parent.id, true);
        this.update();
    }

    update() {
        this.hello_count++;

        for (let i = 0; i < this.parent.ports.length; i++) {
            // Send initial BPDU
            // Root bridge always advertises cost 0 (its cost to reach itself).
            // Non-root bridges advertise the cost stored for each DP port.
            let bpdu = new Packet(this.type, {
                root: this.root_id,
                cost: this.is_root ? 0 : this.status[i].cost,
                id: this.bridge_id,
                port: i
            }, Config.BPDU_COLOR);

            // Only send packet if this is not a NDP or RP
            // TODO: this should be done automatically via the ports state, and only call this.parent.broadcast here
            let is_not_rp = !(this.status[i].state === "RP");
            let is_not_ndp = !(this.status[i].state === "NDP");
            if ( is_not_rp && is_not_ndp) {
                this.parent.ports[i].send_packet(bpdu);
            }

        }
        if (this.hello_count === 5) {
            this.hello_time = Config.STP_HELLO_SLOW;
            // Flush stale MAC entries accumulated during pre-convergence flooding.
            // Non-root switches flush via update_root_port; root bridge has no RP
            // so it must flush here when the convergence phase ends.
            if (this.is_root) {
                this.parent.ethernet.flush();
            }
            // One-time phase spread: place this switch at a random point in the slow
            // interval so it never fires in sync with the rest.
            setTimeout(this.update, Math.random() * Config.STP_HELLO_SLOW);
        } else {
            // After phase is set, ±50 % jitter prevents re-synchronisation over time.
            const jitter = this.hello_count > 2 ? (0.5 + Math.random()) : 1.0;
            setTimeout(this.update, this.hello_time * Config.sim.time_factor * jitter);
        }
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
        for (let i = 0; i < Object.keys(this.status).length; i++) {
            if (i === port) {
                this.status[i].state = "RP";
                this.status[i].cost = cost;
                this.parent.ports[i].unblock();
            } else if (this.status[i].state !== "NDP") {
                // Only touch non-NDP ports. NDP ports stay blocked — re-opening
                // them here is what causes the oscillating loop where a port
                // cycles between NDP (blocked) and DP (open) on every BPDU.
                this.status[i].state = "DP";
                this.status[i].cost = cost + this.parent.ports[i].speed;
                this.parent.ports[i].unblock();
            }
        }
        // Flush MAC table on topology change (TCN) so entries learned during
        // the pre-convergence flood don't persist on the now loop-free topology.
        this.parent.ethernet.flush();
    }

    get_RP() {
        for (let i = 0; i < Object.keys(this.status).length; i++) {
            let port = this.status[i];
            if (port.state === "RP") { return port; }
        }
    }


    // On receive packet
    receive(packet, port) {
        //this.show_root_path();
        
        let data = packet.data;

        // -----------------------------------
        //  HANDLE NEW LOWER ROOT ID RECEIVED
        // -----------------------------------

        // Check if root id has to be updated
        // TODO: is race condition with sending BPDUs?
        if (data.root < this.root_id) {
            this.root_id = data.root;
            if (this.is_root) {
                this.is_root = false;
                this.parent.renderer.set_stp_root(this.parent.id, false);
            }
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
        // If yes, then change port state to non-designated port.
        // Tiebreak equal costs by bridge ID (lower ID = better designated bridge → we yield).
        let lower_cost_advertised = (data.cost < port_obj.cost)
            || (data.cost === port_obj.cost && data.id < this.bridge_id);
        let received_on_non_rp = (port_obj.state !== "RP"); // Current port is not a root port, this is handled above already
        if ( lower_cost_advertised && received_on_non_rp && correct_root ) {
            // Make port blocking
            this.status[port].state = "NDP";
            this.parent.ports[port].block();
            return;
        }

    }

}