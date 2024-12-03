import NetworkNode from './NetworkNode';
import STP from './STP';
import EthernetSwitching from './EthernetSwitching';

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
        this.renderer.register_event(this.id, "click", this.show_debug);
    }

    update() {
        
    }

}
