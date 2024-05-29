import NetworkNode from './NetworkNode';
import STP from './STP';

export default class Switch extends NetworkNode {
    // Protocols
    stp

    constructor(id, svg) {
        super(id, svg);
        this.stp = new STP(this.id,this);
    }

    // Called at the beginning of the simulation
    init() {
        this.stp.init();
    }

    update() {
        
    }

}
