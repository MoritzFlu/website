import NetworkNode from './NetworkNode';
import STP from '../protocols/STP';
import EthernetSwitching from '../protocols/EthernetSwitching';

export default class Switch extends NetworkNode {
    // Protocols
    stp
    ethernet
    type = "switch"

    constructor(id, svg) {
        super(id, svg);
        this.stp = new STP(this.id,this);
        this.ethernet = new EthernetSwitching(this);
    }

    // Called at the beginning of the simulation
    init() {
        this.stp.init();
        this.ethernet.init();
        this.renderer.register_event(this.id, "click", () => {
            if (!this.renderer.on_node_click) return;
            this.renderer.on_node_click({
                type: 'switch',
                id: this.id,
                stp: {
                    is_root:   this.stp.is_root,
                    root_id:   this.stp.root_id,
                    bridge_id: this.stp.bridge_id,
                    ports: Object.entries(this.stp.status).map(([i, s]) => ({
                        port: Number(i), state: s.state, cost: s.cost,
                        blocked: this.ports[i]?.blocked ?? false,
                    })),
                },
                forwarding_table: Object.entries(this.ethernet.forwarding_table).map(([mac, port]) => ({
                    mac,
                    port,
                })),
            });
        });
    }

    update() {
        
    }

}
