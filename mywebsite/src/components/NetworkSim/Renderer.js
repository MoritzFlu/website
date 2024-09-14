import * as d3 from "d3";
import * as Config from './config';

import * as icons from '../../img/icons';

export default class Renderer {
  link
  nodes
  svg

  constructor() {
    this.sim_tick = this.sim_tick.bind(this);
  }

  icon_offset = {
    "switch": {
      "x": -15,
      "y": -15
    },
    "server": {
      "x": -15,
      "y": -16
    },
    "client": {
      "x": -13,
      "y": -18
    }
  }

  anim_packet(link_id, color, speed, reversed) {

    let svg = d3.select("#" + Config.NETWORK_SVG_REF);
    let link = svg.select("#" + link_id).datum();

    let start = { x: link.source.x, y: link.source.y };
    let end = { x: link.target.x, y: link.target.y };

    // Swap start and end if animation should be reversed
    if (reversed) {
      let tmp = end;
      end = start;
      start = tmp;
    }

    let packet = svg
      .append("circle")
      .attr("r", Config.PACKET_SIZE)
      .attr("fill", color)
      .attr("cx", start.x)
      .attr("cy", start.y);

    // Needs to be seperated from top since packet svg reference is needed for remove
    packet.transition()
      .duration(speed)
      .ease(Config.PACKET_EASE)
      .attr("cx", end.x)
      .attr("cy", end.y);

    // Set timeout to delete packet on arrival
    setTimeout(() => { packet.remove(); }, speed);
  }

  register_event(id, event, func) {
    let svg = d3.select("#" + Config.NETWORK_SVG_REF);
    let obj = svg.select("#" + id).node();

    obj.addEventListener(event, func);
  }

  get_icon(name) {
    switch (name) {
      case "switch":
        return icons.Switch;
      case "server":
        return icons.Server;
      case "client":
        return icons.Client;
      default:
        console.error("Unknown icon:", name);
    }
  }

  // TODO: move to we worker and add loading icon: https://observablehq.com/@d3/force-directed-web-worker
  // TODO: move network to a class?
  draw_network(svg_id, network, callback) {
    console.log("Drawing network");

    // append the svg object to the body of the page
    this.svg = d3.select(svg_id)
      .append("svg")
      .attr("id", Config.NETWORK_SVG_REF)
      .attr('preserveAspectRatio', 'xMidYMid meet');


    // Initialize the network nodes
    this.nodes = this.svg
      .selectAll("nodes")
      .data(network.nodes)
      .enter()
      .append("svg")
      .html((obj) => { return this.get_icon(obj.type) })
      .attr("id", (obj) => { return obj.id });

    // Initialize the links
    this.link = this.svg
      .selectAll("line")
      .data(network.links)
      .enter()
      .append("line")
      .style("stroke", Config.LINK_COLOR)
      .lower()
      // TODO: add unique ID to links
      .attr("id", (obj) => { return obj.id });

    // Let's list the force we wanna apply on the network
    var simulation = d3.forceSimulation(network.nodes)
      .force("link", d3.forceLink()
        .id((obj) => { return obj.id; })
        .links(network.links)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .on("tick", this.sim_tick)
      .on("end", callback);
      for (let i = 0; i < 1000; i++) {
        simulation.tick();
      }
  }

  // This function is run at each iteration of the force algorithm, updating the nodes position.
  sim_tick() {

      this.link
        .attr("x1", function (d) { return d.source.x; })
        .attr("y1", function (d) { return d.source.y; })
        .attr("x2", function (d) { return d.target.x; })
        .attr("y2", function (d) { return d.target.y; });
      this.nodes
        // Add an offset in coordinates to all nodes to center the icon
        .attr("x", (obj) => { return obj.x + this.icon_offset[obj.type]["x"] })
        .attr("y", (obj) => { return obj.y + this.icon_offset[obj.type]["y"] });

      // Set viewbox of SVG such that it scales correctly
      let bbox = this.svg.node().getBBox();
      this.svg.attr("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
  }
}