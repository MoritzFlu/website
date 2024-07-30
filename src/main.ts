import * as mermaid from 'mermaid';

type SvgInHtml = HTMLElement & SVGElement;

type Point = {
    x: number
    y: number
}


function point_dist(a: Point, b: Point) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function equal(a: Point, b: Point) {
    if (a.x === b.x && a.y === b.y) { return true; }
    return false;
}

/* Randomize array in-place using Durstenfeld shuffle algorithm */
function shuffleArray(array: Array<any>) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

// Taken from:
// https://stackoverflow.com/questions/9043805/test-if-two-lines-intersect-javascript-function
// returns true if the line from (p1)->(p2) intersects with (q1)->(q2)
function intersects(p1: Point, p2: Point, q1: Point, q2: Point) {
    var det, gamma, lambda;
    det = (p2.x - p1.x) * (q2.y - q1.y) - (q2.x - q1.x) * (p2.y - p1.y);
    if (det === 0) {
        return false;
    } else {
        lambda = ((q2.y - q1.y) * (q2.x - p1.x) + (q1.x - q2.x) * (q2.y - p1.y)) / det;
        gamma = ((p1.y - p2.y) * (q2.x - p1.x) + (p2.x - p1.x) * (q2.y - p1.y)) / det;
        return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }
};

abstract class SvgElement {
    abstract toHTML(): string
}


abstract class NetworkNode extends SvgElement {
    abstract center: Point
    abstract corner: Point

    ports: Array<Port> = [];

    add_port(port: Port) {
        this.ports.push(port);
    }

    add_connection(node: NetworkNode, link: Link) {
        // Generate two ports pointing at each other
        let first_port = new Port(link, null, node);
        let second_port = new Port(link, first_port, this);
        first_port.set_destination(second_port);

        // store reference in local mapping
        this.ports.push(second_port);
    }
    
}

class Port {
    link: Link
    destination: Port | null 
    parent: NetworkNode

    constructor(link: Link, destination: Port | null, parent: NetworkNode) {
        this.link = link;
        this.destination = destination;
        this.parent = parent;
    }

    set_destination(port: Port) {
        this.destination = port;
    }
}

function add_connection(first_node: NetworkNode, second_node: NetworkNode, link: Link) {
    // Generate two ports pointing at each other
    let first_port = new Port(link, null, first_node);
    let second_port = new Port(link, first_port, second_node);
    first_port.set_destination(second_port);

    // Add ports to corresponding nodes
    first_node.add_port(first_port);
    second_node.add_port(second_port);
}


class Link extends SvgElement {
    start: Point
    end: Point
    public did_intersect = false;

    constructor(start: Point, end: Point) {
        super();
        this.start = start;
        this.end = end;
    }

    toHTML(): string {
        let data = '<path d="M' + this.start.x + ' ' + this.start.y + ' L' + this.end.x + ' ' + this.end.y + ' Z" style="fill:none;stroke:white;stroke-width:3"/>';
        return data
    }
}

class ServerNode extends NetworkNode {
    center: Point
    corner: Point

    constructor(center: Point) {
        super();
        this.center = center;
        this.corner = {
            x: center.x - 66.27 / 2,
            y: center.y - 84 / 2
        }

    }

    toHTML(): string {
        let data = '<image x="' + this.corner.x + '" y="' + this.corner.y + '" width="66.27" height="84" xlink:href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA3MSA4OS42Ij48ZyBmaWxsPSJub25lIiBzdHJva2U9IiM2MjYzNjYiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTI0LjMgMzkuMjQybDQ1LjItMjR2NDguOWwtNDUuMSAyNHoiLz48cGF0aCBkPSJNMS41IDI1LjQ0Mmw0NS4yLTIzLjkgMjIuOCAxMy43LTQ1LjIgMjR6Ii8+PHBhdGggZD0iTTI0LjMgMzkuMjQybC4xIDQ4LjktMjIuOS0xMy43di00OXoiLz48L2c+PHBhdGggZD0iTTI0LjMgMzkuMmw0NS4yLTI0djQ5TDI0LjQgODguMXoiIGZpbGw9IiM4OThiOGUiLz48cGF0aCBkPSJNMS41IDI1LjVsNDUuMi0yNCAyMi44IDEzLjctNDUuMiAyNHoiIGZpbGw9IiNiYmJkYmYiLz48cGF0aCBkPSJNMjQuMyAzOS4ybC4xIDQ4LjlMMS41IDc0LjRWMjUuNXoiIGZpbGw9IiNiM2I1YjciLz48cGF0aCBkPSJNMi4yIDI1LjVsMjIuMyAxMy40djQ5IiBmaWxsPSJub25lIiBzdHJva2U9IiNkZmUwZGYiIHN0cm9rZS13aWR0aD0iLjc1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNMjEuMyA0OS4zTDQgMzguOXYtNi41bDE3LjMgMTAuNHptMCA2LjJMNCA0NS4xdi0zLjdsMTcuMyAxMC40em0wIDE5LjJMNCA2NC4zdi0xLjdMMjEuMyA3M3ptMCAzLjhMNCA2OC4xdi0xLjdsMTcuMyAxMC40em0wIDRMNCA3Mi4xdi0xLjdsMTcuMyAxMC40eiIgZmlsbD0iI2ZlZmVmZSIvPjwvc3ZnPg==" />';
        return data
    }
}

class SwitchNode extends NetworkNode {
    center: Point
    corner: Point

    constructor(center: Point) {
        super();
        this.center = center;
        this.corner = {
            x: center.x - 66.27 / 2,
            y: center.y - 84 / 2
        }

    }

    toHTML(): string {
        let data = '<image x="' + this.corner.x + '" y="' + this.corner.y + '" width="66.27" height="84" xlink:href="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHdpZHRoPSIxMDJweCIgaGVpZ2h0PSIzMnB4IiB2aWV3Qm94PSItMC41IC0wLjUgMTAyIDMyIj48ZGVmcy8+PGc+PGc+PHJlY3QgeD0iMSIgeT0iMSIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIyNS44NiIgcng9IjUuMTciIHJ5PSI1LjE3IiBmaWxsPSIjZjVmNWY1IiBzdHJva2U9IiM2NjY2NjYiIHN0cm9rZS13aWR0aD0iMiIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxyZWN0IHg9IjExIiB5PSIyNi44NiIgd2lkdGg9IjgwIiBoZWlnaHQ9IjQuMTQiIGZpbGw9IiNmNWY1ZjUiIHN0cm9rZT0iIzY2NjY2NiIgc3Ryb2tlLXdpZHRoPSIyIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PGVsbGlwc2UgY3g9Ijg5IiBjeT0iMTMuOTMiIHJ4PSI4IiByeT0iOC4yNzU4NjIwNjg5NjU1MTgiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxlbGxpcHNlIGN4PSI3NiIgY3k9IjYuMTciIHJ4PSIyIiByeT0iMi4wNjg5NjU1MTcyNDEzNzk0IiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9Im5vbmUiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz48ZWxsaXBzZSBjeD0iNzYiIGN5PSIyMS42OSIgcng9IjIiIHJ5PSIyLjA2ODk2NTUxNzI0MTM3OTQiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxlbGxpcHNlIGN4PSI3NiIgY3k9IjEzLjkzIiByeD0iMiIgcnk9IjIuMDY4OTY1NTE3MjQxMzc5NCIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSJub25lIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PGVsbGlwc2UgY3g9IjY2LjUiIGN5PSIxOC41OSIgcng9IjIiIHJ5PSIyLjA2ODk2NTUxNzI0MTM3OTQiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxlbGxpcHNlIGN4PSI1OCIgY3k9IjE4LjU5IiByeD0iMiIgcnk9IjIuMDY4OTY1NTE3MjQxMzc5NCIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSJub25lIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PGVsbGlwc2UgY3g9IjQ5LjUiIGN5PSIxOC41OSIgcng9IjIiIHJ5PSIyLjA2ODk2NTUxNzI0MTM3OTQiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxlbGxpcHNlIGN4PSI0MSIgY3k9IjE4LjU5IiByeD0iMiIgcnk9IjIuMDY4OTY1NTE3MjQxMzc5NCIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSJub25lIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PGVsbGlwc2UgY3g9IjMyLjUiIGN5PSIxOC41OSIgcng9IjIiIHJ5PSIyLjA2ODk2NTUxNzI0MTM3OTQiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxlbGxpcHNlIGN4PSIyNCIgY3k9IjE4LjU5IiByeD0iMiIgcnk9IjIuMDY4OTY1NTE3MjQxMzc5NCIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSJub25lIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PGVsbGlwc2UgY3g9IjE1LjUiIGN5PSIxOC41OSIgcng9IjIiIHJ5PSIyLjA2ODk2NTUxNzI0MTM3OTQiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxlbGxpcHNlIGN4PSI3IiBjeT0iMTguNTkiIHJ4PSIyIiByeT0iMi4wNjg5NjU1MTcyNDEzNzk0IiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9Im5vbmUiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz48cGF0aCBkPSJNIDQgOC4yNCBMIDEwIDguMjQgTCAxMCAxMS4zNCBMIDggMTEuMzQgTCA4IDEyLjM4IEwgNiAxMi4zOCBMIDYgMTEuMzQgTCA0IDExLjM0IFogTSAxMi41IDguMjQgTCAxOC41IDguMjQgTCAxOC41IDExLjM0IEwgMTYuNSAxMS4zNCBMIDE2LjUgMTIuMzggTCAxNC41IDEyLjM4IEwgMTQuNSAxMS4zNCBMIDEyLjUgMTEuMzQgWiBNIDIxIDguMjQgTCAyNyA4LjI0IEwgMjcgMTEuMzQgTCAyNSAxMS4zNCBMIDI1IDEyLjM4IEwgMjMgMTIuMzggTCAyMyAxMS4zNCBMIDIxIDExLjM0IFogTSAyOS41IDguMjQgTCAzNS41IDguMjQgTCAzNS41IDExLjM0IEwgMzMuNSAxMS4zNCBMIDMzLjUgMTIuMzggTCAzMS41IDEyLjM4IEwgMzEuNSAxMS4zNCBMIDI5LjUgMTEuMzQgWiBNIDM4IDguMjQgTCA0NCA4LjI0IEwgNDQgMTEuMzQgTCA0MiAxMS4zNCBMIDQyIDEyLjM4IEwgNDAgMTIuMzggTCA0MCAxMS4zNCBMIDM4IDExLjM0IFogTSA0Ni41IDguMjQgTCA1Mi41IDguMjQgTCA1Mi41IDExLjM0IEwgNTAuNSAxMS4zNCBMIDUwLjUgMTIuMzggTCA0OC41IDEyLjM4IEwgNDguNSAxMS4zNCBMIDQ2LjUgMTEuMzQgWiBNIDU1IDguMjQgTCA2MSA4LjI0IEwgNjEgMTEuMzQgTCA1OSAxMS4zNCBMIDU5IDEyLjM4IEwgNTcgMTIuMzggTCA1NyAxMS4zNCBMIDU1IDExLjM0IFogTSA2My41IDguMjQgTCA2OS41IDguMjQgTCA2OS41IDExLjM0IEwgNjcuNSAxMS4zNCBMIDY3LjUgMTIuMzggTCA2NS41IDEyLjM4IEwgNjUuNSAxMS4zNCBMIDYzLjUgMTEuMzQgWiIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSJub25lIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PHBhdGggZD0iTSA4MyAxMC4zMSBMIDg1IDguMjQgTCA4NyAxMC4zMSBNIDgzIDE3LjU1IEwgODUgMTkuNjIgTCA4NyAxNy41NSBNIDkxIDEwLjMxIEwgOTMgOC4yNCBMIDk1IDEwLjMxIE0gOTEgMTcuNTUgTCA5MyAxOS42MiBMIDk1IDE3LjU1IE0gOTMgMTkuNjIgTCA5MyAxNi41MiBMIDg1IDExLjM0IEwgODUgOC4yNCBNIDg1IDE5LjYyIEwgODUgMTYuNTIgTCA5MyAxMS4zNCBMIDkzIDguMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzY2NjY2NiIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PC9nPjwvZz48L3N2Zz4="/>';
        return data
    }
}


class SVGHandler {
    svg: SvgInHtml | null;
    svg_ns = "http://www.w3.org/2000/svg";

    constructor() {
        this.svg = document.getElementById("canvas") as SvgInHtml;
        this.check_ref();
    }

    check_ref() {
        if (this.svg === null) {
            console.error("ERROR: SVG canvas not referencable")
            return
        }
    }

    draw_circle(center: Point, radius: number, color: string) {
        this.check_ref();

        let circle = document.createElementNS(this.svg_ns, "circle");

        circle.setAttribute("cx", String(center.x));
        circle.setAttribute("cy", String(center.y));

        circle.setAttribute("r", String(radius));
        circle.setAttribute("style", 'fill: #' + color + '; stroke-width:1px;');

        this.svg?.appendChild(circle);
    }

    draw_svg(svg: SvgElement) {
        this.check_ref();

        this.svg?.insertAdjacentHTML("beforeend", svg.toHTML());
    }

    get_dims() {
        this.check_ref();

        // Get viewbox and parse to integers
        var result = this.svg?.getAttribute("viewBox")?.split(" ").map(function (x) {
            return parseInt(x, 10);
        });

        return result;
    }

}


class NetworkManager {
    svg: SVGHandler;
    num_nodes = 4;

    switches: Array<SwitchNode>
    servers: Array<ServerNode>
    links: Array<Link>

    center: Point
    bounds: Point

    scale: number


    constructor(svg: SVGHandler) {
        this.svg = svg;

        this.switches = [];
        this.servers = [];
        this.links = [];
        this.center = { x: 0, y: 0 };
        this.bounds = { x: 0, y: 0 };
        this.scale = 0.9;

        this.setup();
    }

    setup() {
        let pos = this.get_points_on_circle(this.num_nodes);

        for (var i = 0; i < pos.length; i++) {
            let point = pos[i];
            let server_node = new ServerNode(point);
            this.servers.push(server_node);
        }
    }


    // Returns coordinates for center of circle nodes
    get_points_on_circle(n: number) {
        let viewBox = this.svg?.get_dims() ?? [0, 0, 1000, 1000];

        this.bounds = { x: viewBox[2], y: viewBox[3] };
        this.center = { x: this.bounds.x / 2, y: this.bounds.y / 2 };

        // Set raidus to smaller value of viewbox boundaries
        //  to ensure that the circle fits
        let r = 0;
        if (viewBox[2] < viewBox[3]) {
            r = viewBox[2] / 2;
        } else {
            r = viewBox[3] / 2;
        }

        // Scale circle to wanted size
        r = r * this.scale;

        let result: Point[] = [];

        // Calculate positions of nodes on circle
        for (let i = 0; i < n; i++) {
            let node_center: Point = {
                x: this.center.x + r * Math.cos(2 * Math.PI * i / n),
                y: this.center.y + r * Math.sin(2 * Math.PI * i / n)
            };

            result.push(node_center);
        }

        return result;
    }

    get_random_range(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }

    generate_network() {
        // TODO: make this muuuuuuuuuch prettier, into sub functions

        // TODO: https://stackoverflow.com/questions/9090361/finding-neighbor-nodes-in-graph-connection-algorithm






    }

}

// Load SVG and cables on document load and start packet spawn
document.addEventListener("DOMContentLoaded", main);

function main() {

    // Instantiate SVG drawing component
    let handler = new SVGHandler();

    //handler.draw_circle({x: 500, y: 500},500,"FFFFFF");
    //handler.get_dims();

    let network = new NetworkManager(handler);
    network.generate_network();
}