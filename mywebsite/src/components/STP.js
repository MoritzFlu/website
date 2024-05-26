
import { SimPacket } from "./SimComponents";

export default class STP {
    bridge_id
    root_id
    is_root
    parents
    status

    constructor(bridge_id, parent) {
        this.parent = parent;
        this.bridge_id = bridge_id;
        this.is_root = true;
        this.status = {};

        // Init status for all ports
        for (let i = 0; i < this.parent.ports.length; i++) {
            this.status[i] = {};
        }
    }

    // STP initial actions
    init() {
        
        for (let i = 0; i < this.parent.ports.length; i++) {
            // Send initial BPDU
            let bpdu = new SimPacket(0, {
                root: this.bridge_id,
                // TODO: pass cost from link transmission duration
                cost: 1,
                id: this.bridge_id,
                port: i
            }, "#0000FF");

            this.parent.ports[i].send_packet(bpdu);
        }

    }
    // On receive packet
    recveive(packet) {
        
        if (packet.root < this.bridge_id) {
            this.is_root = false;
            this.root_id = packet.root;
        }
    }

}