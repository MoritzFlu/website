import Ethernet from './Ethernet';
import NetworkNode from './NetworkNode';

export default class Server extends NetworkNode {
    ethernet
    type = "server"

    constructor(id, svg) {
        super(id, svg);

        this.ethernet = new Ethernet(this);
    }

    init() {
        this.renderer.register_event(this.id, "click", this.show_debug);
    }

    update() {

    }

}
