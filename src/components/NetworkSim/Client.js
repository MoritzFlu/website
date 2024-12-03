import NetworkNode from './NetworkNode';
import Ethernet from './Ethernet';
import ARP from './ARP';
import IPv4 from './IPv4';


export default class Client extends NetworkNode {
    ethernet 
    arp
    ip
    type = "client"


    constructor(id, svg) {
        super(id, svg);

        this.ethernet = new Ethernet(this);
        // TODO: move ARP into IP?
        this.arp = new ARP(this,this.ethernet);
        this.ip = new IPv4(this);

        this.init = this.init.bind(this);
    }

    init() {
        // Has to be called first, since is used in ip,init()
        this.ip.register_l2(this.ethernet);

        // Initialize layers
        this.arp.init();
        this.ethernet.init();
        this.ip.init();

        // Register ethernet handling and ARP for IP layer
        this.ip.register_arp(this.arp);
    
        // Add click on SVG to show this object for debug
        this.renderer.register_event(this.id, "click", this.show_debug);
    }

    update() {
        
    }

}