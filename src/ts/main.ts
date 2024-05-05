type SvgInHtml = HTMLElement & SVGElement;

type Point = {
    x: number
    y: number
}

abstract class SvgImage {
    abstract x: number
    abstract y: number
    abstract toHTML(): string
}

class ServerSVG extends SvgImage {
    x: number
    y: number
    
    constructor(x: number, y: number) {
        super();
        this.x = x;
        this.y = y;
    }

    toHTML(): string {
        let data = '<image x="'+this.x+'" y="'+this.y+'" width="66.27" height="84" xlink:href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA3MSA4OS42Ij48ZyBmaWxsPSJub25lIiBzdHJva2U9IiM2MjYzNjYiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTI0LjMgMzkuMjQybDQ1LjItMjR2NDguOWwtNDUuMSAyNHoiLz48cGF0aCBkPSJNMS41IDI1LjQ0Mmw0NS4yLTIzLjkgMjIuOCAxMy43LTQ1LjIgMjR6Ii8+PHBhdGggZD0iTTI0LjMgMzkuMjQybC4xIDQ4LjktMjIuOS0xMy43di00OXoiLz48L2c+PHBhdGggZD0iTTI0LjMgMzkuMmw0NS4yLTI0djQ5TDI0LjQgODguMXoiIGZpbGw9IiM4OThiOGUiLz48cGF0aCBkPSJNMS41IDI1LjVsNDUuMi0yNCAyMi44IDEzLjctNDUuMiAyNHoiIGZpbGw9IiNiYmJkYmYiLz48cGF0aCBkPSJNMjQuMyAzOS4ybC4xIDQ4LjlMMS41IDc0LjRWMjUuNXoiIGZpbGw9IiNiM2I1YjciLz48cGF0aCBkPSJNMi4yIDI1LjVsMjIuMyAxMy40djQ5IiBmaWxsPSJub25lIiBzdHJva2U9IiNkZmUwZGYiIHN0cm9rZS13aWR0aD0iLjc1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNMjEuMyA0OS4zTDQgMzguOXYtNi41bDE3LjMgMTAuNHptMCA2LjJMNCA0NS4xdi0zLjdsMTcuMyAxMC40em0wIDE5LjJMNCA2NC4zdi0xLjdMMjEuMyA3M3ptMCAzLjhMNCA2OC4xdi0xLjdsMTcuMyAxMC40em0wIDRMNCA3Mi4xdi0xLjdsMTcuMyAxMC40eiIgZmlsbD0iI2ZlZmVmZSIvPjwvc3ZnPg==" />';
        return data
    }
}

let server = '<image x="489.5" y="298.5" width="66.27" height="84" xlink:href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA3MSA4OS42Ij48ZyBmaWxsPSJub25lIiBzdHJva2U9IiM2MjYzNjYiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTI0LjMgMzkuMjQybDQ1LjItMjR2NDguOWwtNDUuMSAyNHoiLz48cGF0aCBkPSJNMS41IDI1LjQ0Mmw0NS4yLTIzLjkgMjIuOCAxMy43LTQ1LjIgMjR6Ii8+PHBhdGggZD0iTTI0LjMgMzkuMjQybC4xIDQ4LjktMjIuOS0xMy43di00OXoiLz48L2c+PHBhdGggZD0iTTI0LjMgMzkuMmw0NS4yLTI0djQ5TDI0LjQgODguMXoiIGZpbGw9IiM4OThiOGUiLz48cGF0aCBkPSJNMS41IDI1LjVsNDUuMi0yNCAyMi44IDEzLjctNDUuMiAyNHoiIGZpbGw9IiNiYmJkYmYiLz48cGF0aCBkPSJNMjQuMyAzOS4ybC4xIDQ4LjlMMS41IDc0LjRWMjUuNXoiIGZpbGw9IiNiM2I1YjciLz48cGF0aCBkPSJNMi4yIDI1LjVsMjIuMyAxMy40djQ5IiBmaWxsPSJub25lIiBzdHJva2U9IiNkZmUwZGYiIHN0cm9rZS13aWR0aD0iLjc1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNMjEuMyA0OS4zTDQgMzguOXYtNi41bDE3LjMgMTAuNHptMCA2LjJMNCA0NS4xdi0zLjdsMTcuMyAxMC40em0wIDE5LjJMNCA2NC4zdi0xLjdMMjEuMyA3M3ptMCAzLjhMNCA2OC4xdi0xLjdsMTcuMyAxMC40em0wIDRMNCA3Mi4xdi0xLjdsMTcuMyAxMC40eiIgZmlsbD0iI2ZlZmVmZSIvPjwvc3ZnPg==" />';

function main() {

    // Instantiate SVG drawing component
    let handler = new SVGHandler();

    handler.draw_circle(500,500,500,"FFFFFF");
    handler.get_dims();

    let network = new NetworkManager(handler);
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

    draw_circle(center_x:number,center_y: number, radius: number, color: string) {
        this.check_ref();

        let circle = document.createElementNS(this.svg_ns,"circle");

        circle.setAttribute("cx",String(center_x));
        circle.setAttribute("cy",String(center_y));

        circle.setAttribute("r",String(radius));
        circle.setAttribute("style", 'fill: #'+color+'; stroke-width:1px;');

        this.svg?.appendChild(circle);
    }

    draw_svg(x: number, y: number, svg: SvgImage) {
        this.check_ref();

        this.svg?.insertAdjacentHTML("beforeend",svg.toHTML());
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
    num_nodes = 5;

    constructor(svg: SVGHandler) {
        this.svg = svg;
        this.setup();
    }

    setup() {
        let pos = this.get_node_positions();

        for ( var i = 0; i < pos.length; i++) {
            let point = pos[i];
            this.svg.draw_svg(point.x, point.y, new ServerSVG(point.x, point.y) );
        }
    }


    // Returns coordinates for center of circle nodes
    get_node_positions() {
        let viewBox = this.svg?.get_dims() ?? [0,0,1000,1000];

        let maxX = viewBox[2];
        let maxY = viewBox[3];

        let center: Point = {x: maxX / 2, y: maxY / 2};

        // Set raidus to smaller value of viewbox boundaries
        //  to ensure that the circle fits
        let r = 0;
        if (viewBox[2] < viewBox[3]) {
            r = viewBox[2] / 2;
        } else {
            r = viewBox[3] / 2;
        }

        
        let result: Point[] = [];

        // Calculate positions of nodes on circle
        for (let i = 0; i < this.num_nodes; i++ ) {
            let node_center: Point = {
                x: center.x + r * Math.cos(2 * Math.PI * i / this.num_nodes), 
                y: center.y + r * Math.sin(2 * Math.PI * i / this.num_nodes)
            };

            result.push(node_center);
        }

        return result;
    }



}


// Load SVG and cables on document load and start packet spawn
document.addEventListener("DOMContentLoaded", main);