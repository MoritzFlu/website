
import { SimPacket } from "./SimComponents";

export default class STP {
    bridge_id
    root_id
    is_root
    parents
    status

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

        // Init status for all ports
        for (let i = 0; i < this.parent.ports.length; i++) {
            this.status[i] = {};
        }

        // Bind update to call it at intervals
        this.update = this.update.bind(this);
        // Bind since receive is called asynchronous and needs to change this
        this.recveive = this.recveive.bind(this);
    }

    // STP initial actions
    init() {
        this.update();
    }

    update() {

        for (let i = 0; i < this.parent.ports.length; i++) {
            // Send initial BPDU
            let bpdu = new SimPacket(0, {
                root: this.root_id,
                // TODO: pass cost from link transmission duration
                cost: 1,
                id: this.bridge_id,
                port: i
            }, "#0000FF");

            this.parent.ports[i].send_packet(bpdu);
        }

        setTimeout(this.update, this.hello_time);
    }


    // On receive packet
    recveive(packet,port) {
        let data = packet.data;
        //console.log(packet,this.bridge_id);
        // Check if root id has to be updated
        // TODO: is race condition with sending BPDUs?
        if (data.root < this.root_id) {
            console.log("Updated root id from to",this.root_id, data.root);

            this.is_root = false;
            this.root_id = data.root;            
        }

    }

}