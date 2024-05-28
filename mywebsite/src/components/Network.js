import './Network.css';
import SwitchNode from './SimComponents';

import * as d3 from "d3";
import * as d3Graphviz from 'd3-graphviz';
import React, { useEffect, useRef } from "react";

// SVG images for visualization
import * as icons from "../img/icons.js";

import { format } from 'react-string-format';

import shuffle from "shuffle-array";
import * as Config from './config';

// TODO: move literals to config file


// ---------------------------------------------------------------
//   ENGINE FOR VISUALIZATION AND SIM RUNNING
// ---------------------------------------------------------------

class NetworkSim extends React.Component {

  network = {};
  switches = [];

  // Called when component was rendered
  componentDidMount() {
    this.init = this.init.bind(this);

    console.log("Drawing network");

    this.genNetwork();

    let this_ref = this;

    // set the dimensions and margins of the graph
    var margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // append the svg object to the body of the page
    var svg = d3.select("#network")
      .append("svg")
      .attr("id", Config.NETWORK_SVG_REF)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Initialize the switches
    var nodes = svg
      .selectAll("switches")
      .data(this.network.nodes)
      .enter()
      .append("svg")
      .html(function (obj) {
        if (obj.type === "switch") {
          return icons.Switch;
        } 
        if (obj.type === "server") {
          return icons.Server;
        }
        if (obj.type === "client") {
          return icons.Client;
        }
        console.error("Invalid node TYPE!",obj.type);
        return "";
      })
      .attr("id", function (d) {
        let id = this_ref.createSwitch(d, this);
        return id;
      });

    // Initialize the links
    var link = svg
      .selectAll("line")
      .data(this.network.links)
      .enter()
      .append("line")
      .style("stroke", Config.LINK_COLOR)
      .lower()
      .attr("id", function (d) {
        let id = this_ref.createLink(d, this);
        return id;
      });

    // Initialize the servers
    //var servers = svg
    //  .selectAll("servers")
    //  .data(this.network.servers)
    //  .enter()
    //  .append("circle")
    //  .attr("r", 20)
    //  .style("fill", "#69b3a2");

    // Let's list the force we wanna apply on the network
    var simulation = d3.forceSimulation(this.network.nodes)                 // Force algorithm is applied to data.nodes
      .force("link", d3.forceLink()                               // This force provides links between nodes
        .id(function (d) { return d.id; })                     // This provide  the id of a node
        .links(this.network.links)                                    // and this the list of links
      )
      .force("charge", d3.forceManyBody().strength(-200))         // This adds repulsion between nodes. Play with the -400 for the repulsion strength     // This force attracts nodes to the center of the svg area
      .on("tick", ticked)
      .on("end", this.init);

    // This function is run at each iteration of the force algorithm, updating the nodes position.
    function ticked() {
      link
        .attr("x1", function (d) { return d.source.x; })
        .attr("y1", function (d) { return d.source.y; })
        .attr("x2", function (d) { return d.target.x; })
        .attr("y2", function (d) { return d.target.y; });

      nodes
        // Move servers and switches differently
        // TODO: this has to be somewhat solvable using class methods
        //     Probably by adding nodes as class instances to this.network with the appropriate functions
        .attr("x", function (obj) { 
          if (obj.type === "server") {
            return obj.x - 15; 
          }
          if (obj.type === "switch") {
            return obj.x - 15; 
          }
          if (obj.type === "client") {
            return obj.x - 13; 
          }
        })
        .attr("y", function (obj) { 
          if (obj.type === "server") {
            return obj.y - 16; 
          }
          if (obj.type === "switch") {
            return obj.y - 15; 
          }
          if (obj.type === "client") {
            return obj.y - 18; 
          }
        });

      // Set viewbox of SVG such that it scales correctly
      let bbox = svg.node().getBBox();
      svg.attr("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);

    }
  }

  // Initialize simulation and start
  init() {
    // Initialize all switches
    // TODO: add a small difference in time for each switch
    for (let i = 0; i < this.switches.length; i++) {
      let timeout = Math.random() * Config.MAX_STARTUP_DELAY;
      setTimeout(this.switches[i].init, timeout);
    }

  }

  createSwitch(obj, svg_ref) {
    this.switches.push(new SwitchNode(obj.id, svg_ref));
  }
  createLink(obj, svg_ref) {
    let source = this.switches[obj.source];
    let destination = this.switches[obj.target];

    // Randomly choose connection speed
    let speed = Math.random() * Config.MAX_LINK_SPEED + Config.MAX_LINK_SPEED;
    source.add_connection(destination, svg_ref, speed);
  }

  // Generate and return the network structure as json
  genNetwork() {

    const num_switches = Config.NUM_SWITCHES;
    const num_servers = Config.NUM_SERVERS;
    const num_clients = Config.NUM_CLIENTS;

    // Object will hold network in JSON format for D3 graph
    this.network = {
      nodes: [],
      links: []
    };

    // Generation steps:
    // 1. Generate all switch nodes based on num_switches
    // 2. Connect all switch nodes with all other switch nodes (full mesh)
    // 3. Randomly delete links until all nodes have at max n connections
    // 4. Add server nodes to random switches
    // 5. Add client nodes to random switches
    // TODO: allow replacement with different generation algorithms

    // 1. Generate all switch nodes
    for (let i = 0; i < num_switches; i++) {
      // Generate nodes
      this.network.nodes.push({
        id: i,
        num_links: 0,
        type: "switch"
      });
    }

    // 2. Generate all links
    for (let i = 0; i < num_switches; i++) {
      for (let j = 0; j < num_switches; j++) {

        // No link to itself
        if (j === i) continue;

        // Generate nodes
        this.network.links.push({
          source: i,
          target: j
        });

        // Store number of connected links
        this.network.nodes[i].num_links += 1;
        this.network.nodes[j].num_links += 1;
      }
    }

    // 3. Delete links until every switch is below the max number of links
    // Array with shuffled indices for random access on links
    let indices = [];
    for (let i = 0; i < this.network.links.length; i++) {
      indices.push(i);
    }
    shuffle(indices);
    // Iterate over indices array and delete the corresponding links
    for (let i = 0; i < indices.length; i++) {
      // Get link object and connected nodes
      let ind = indices[i];
      let link = this.network.links[ind];
      let source = this.network.nodes[link.source];
      let dest = this.network.nodes[link.target];
      // Decide what the number of max links for these nodes is
      // Either 2 or 3
      let max_links = Math.random() * 3 + 2;
      if ((source.num_links > max_links &&  dest.num_links > max_links)) {
        this.network.links[ind] = null;
        source.num_links -= 1;
        dest.num_links -= 1;
      }
    }
    // Remove all null values
    this.network.links = this.network.links.filter(n => n);

    // 4. Add server nodes
    for (let i = 0; i < num_servers; i++) {

      // Get random switch ID
      // This also ensures that servers are always connected to a switch
      let target_switch_index = Math.floor((Math.random() * num_switches));

      // Indices have to be unique, choose index greater than last switch index
      let server_id = num_switches + i
      this.network.nodes.push({
        id: server_id,
        type: "server"
      });

      this.network.links.push({
        source: server_id,
        target: target_switch_index
      });

    }

    // 5. Add client nodes
    for (let i = 0; i < num_clients; i++) {

      // Get random switch ID
      // This also ensures that servers are always connected to a switch
      let target_switch_index = Math.floor((Math.random() * num_switches));

      // Indices have to be unique, choose index greater than last switch index
      let client_id = num_switches + num_servers + i
      this.network.nodes.push({
        id: client_id,
        type: "client"
      });

      this.network.links.push({
        source: client_id,
        target: target_switch_index
      });

    }


  }

  render() {
    return <div id="network" />;
  }
}




export default NetworkSim;