import './Network.css';
import SwitchNode from './SimComponents';

import * as d3 from "d3";
import * as d3Graphviz from 'd3-graphviz';
import React, { useEffect, useRef } from "react";

import data from "../data/network.json";
import switchSVG from "../img/switch.svg";
import serverSVG from "../img/server.svg";

import { format } from 'react-string-format';

import shuffle from "shuffle-array";

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
      .attr("id", "network-svg")
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Initialize the switches
    var switches = svg
      .selectAll("switches")
      .data(this.network.switches)
      .enter()
      .append("image")
      .attr("xlink:href", "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHdpZHRoPSIxMDJweCIgaGVpZ2h0PSIzMnB4IiB2aWV3Qm94PSItMC41IC0wLjUgMTAyIDMyIj48ZGVmcy8+PGc+PGc+PHJlY3QgeD0iMSIgeT0iMSIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIyNS44NiIgcng9IjUuMTciIHJ5PSI1LjE3IiBmaWxsPSIjZjVmNWY1IiBzdHJva2U9IiM2NjY2NjYiIHN0cm9rZS13aWR0aD0iMiIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxyZWN0IHg9IjExIiB5PSIyNi44NiIgd2lkdGg9IjgwIiBoZWlnaHQ9IjQuMTQiIGZpbGw9IiNmNWY1ZjUiIHN0cm9rZT0iIzY2NjY2NiIgc3Ryb2tlLXdpZHRoPSIyIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PGVsbGlwc2UgY3g9Ijg5IiBjeT0iMTMuOTMiIHJ4PSI4IiByeT0iOC4yNzU4NjIwNjg5NjU1MTgiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxlbGxpcHNlIGN4PSI3NiIgY3k9IjYuMTciIHJ4PSIyIiByeT0iMi4wNjg5NjU1MTcyNDEzNzk0IiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9Im5vbmUiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz48ZWxsaXBzZSBjeD0iNzYiIGN5PSIyMS42OSIgcng9IjIiIHJ5PSIyLjA2ODk2NTUxNzI0MTM3OTQiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxlbGxpcHNlIGN4PSI3NiIgY3k9IjEzLjkzIiByeD0iMiIgcnk9IjIuMDY4OTY1NTE3MjQxMzc5NCIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSJub25lIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PGVsbGlwc2UgY3g9IjY2LjUiIGN5PSIxOC41OSIgcng9IjIiIHJ5PSIyLjA2ODk2NTUxNzI0MTM3OTQiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxlbGxpcHNlIGN4PSI1OCIgY3k9IjE4LjU5IiByeD0iMiIgcnk9IjIuMDY4OTY1NTE3MjQxMzc5NCIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSJub25lIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PGVsbGlwc2UgY3g9IjQ5LjUiIGN5PSIxOC41OSIgcng9IjIiIHJ5PSIyLjA2ODk2NTUxNzI0MTM3OTQiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxlbGxpcHNlIGN4PSI0MSIgY3k9IjE4LjU5IiByeD0iMiIgcnk9IjIuMDY4OTY1NTE3MjQxMzc5NCIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSJub25lIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PGVsbGlwc2UgY3g9IjMyLjUiIGN5PSIxOC41OSIgcng9IjIiIHJ5PSIyLjA2ODk2NTUxNzI0MTM3OTQiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxlbGxpcHNlIGN4PSIyNCIgY3k9IjE4LjU5IiByeD0iMiIgcnk9IjIuMDY4OTY1NTE3MjQxMzc5NCIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSJub25lIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PGVsbGlwc2UgY3g9IjE1LjUiIGN5PSIxOC41OSIgcng9IjIiIHJ5PSIyLjA2ODk2NTUxNzI0MTM3OTQiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxlbGxpcHNlIGN4PSI3IiBjeT0iMTguNTkiIHJ4PSIyIiByeT0iMi4wNjg5NjU1MTcyNDEzNzk0IiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9Im5vbmUiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz48cGF0aCBkPSJNIDQgOC4yNCBMIDEwIDguMjQgTCAxMCAxMS4zNCBMIDggMTEuMzQgTCA4IDEyLjM4IEwgNiAxMi4zOCBMIDYgMTEuMzQgTCA0IDExLjM0IFogTSAxMi41IDguMjQgTCAxOC41IDguMjQgTCAxOC41IDExLjM0IEwgMTYuNSAxMS4zNCBMIDE2LjUgMTIuMzggTCAxNC41IDEyLjM4IEwgMTQuNSAxMS4zNCBMIDEyLjUgMTEuMzQgWiBNIDIxIDguMjQgTCAyNyA4LjI0IEwgMjcgMTEuMzQgTCAyNSAxMS4zNCBMIDI1IDEyLjM4IEwgMjMgMTIuMzggTCAyMyAxMS4zNCBMIDIxIDExLjM0IFogTSAyOS41IDguMjQgTCAzNS41IDguMjQgTCAzNS41IDExLjM0IEwgMzMuNSAxMS4zNCBMIDMzLjUgMTIuMzggTCAzMS41IDEyLjM4IEwgMzEuNSAxMS4zNCBMIDI5LjUgMTEuMzQgWiBNIDM4IDguMjQgTCA0NCA4LjI0IEwgNDQgMTEuMzQgTCA0MiAxMS4zNCBMIDQyIDEyLjM4IEwgNDAgMTIuMzggTCA0MCAxMS4zNCBMIDM4IDExLjM0IFogTSA0Ni41IDguMjQgTCA1Mi41IDguMjQgTCA1Mi41IDExLjM0IEwgNTAuNSAxMS4zNCBMIDUwLjUgMTIuMzggTCA0OC41IDEyLjM4IEwgNDguNSAxMS4zNCBMIDQ2LjUgMTEuMzQgWiBNIDU1IDguMjQgTCA2MSA4LjI0IEwgNjEgMTEuMzQgTCA1OSAxMS4zNCBMIDU5IDEyLjM4IEwgNTcgMTIuMzggTCA1NyAxMS4zNCBMIDU1IDExLjM0IFogTSA2My41IDguMjQgTCA2OS41IDguMjQgTCA2OS41IDExLjM0IEwgNjcuNSAxMS4zNCBMIDY3LjUgMTIuMzggTCA2NS41IDEyLjM4IEwgNjUuNSAxMS4zNCBMIDYzLjUgMTEuMzQgWiIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSJub25lIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PHBhdGggZD0iTSA4MyAxMC4zMSBMIDg1IDguMjQgTCA4NyAxMC4zMSBNIDgzIDE3LjU1IEwgODUgMTkuNjIgTCA4NyAxNy41NSBNIDkxIDEwLjMxIEwgOTMgOC4yNCBMIDk1IDEwLjMxIE0gOTEgMTcuNTUgTCA5MyAxOS42MiBMIDk1IDE3LjU1IE0gOTMgMTkuNjIgTCA5MyAxNi41MiBMIDg1IDExLjM0IEwgODUgOC4yNCBNIDg1IDE5LjYyIEwgODUgMTYuNTIgTCA5MyAxMS4zNCBMIDkzIDguMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzY2NjY2NiIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PC9nPjwvZz48L3N2Zz4=")
      .attr("id", function (d) {
        let id = this_ref.createSwitch(d,this);
        return id;
      });

    // Initialize the links
    var link = svg
      .selectAll("line")
      .data(this.network.links)
      .enter()
      .append("line")
      .style("stroke", "#aaa")
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
    var simulation = d3.forceSimulation(this.network.switches)                 // Force algorithm is applied to data.nodes
      .force("link", d3.forceLink()                               // This force provides links between nodes
        .id(function (d) { return d.id; })                     // This provide  the id of a node
        .links(this.network.links)                                    // and this the list of links
      )
      .force("charge", d3.forceManyBody().strength(-400))         // This adds repulsion between nodes. Play with the -400 for the repulsion strength     // This force attracts nodes to the center of the svg area
      .on("tick", ticked)
      .on("end",  this.init );

    // This function is run at each iteration of the force algorithm, updating the nodes position.
    function ticked() {
      link
        .attr("x1", function (d) { return d.source.x; })
        .attr("y1", function (d) { return d.source.y; })
        .attr("x2", function (d) { return d.target.x; })
        .attr("y2", function (d) { return d.target.y; });

      switches
        .attr("x", function (d) { return d.x - 33; })
        .attr("y", function (d) { return d.y - 20; });

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
      this.switches[i].init();
    }
    
  }

  createSwitch(obj, svg_ref) {
    this.switches.push(new SwitchNode(obj.id, svg_ref));
    console.log(svg_ref);
  }
  createLink(obj, svg_ref) {
    let source = this.switches[obj.source];
    let destination = this.switches[obj.target];

    // Randomly choose connection speed
    let speed = Math.random() * 5000 + 500;
    source.add_connection(destination, svg_ref, speed);
  }

  // Generate and return the network structure as json
  genNetwork() {

    const num_switches = 10;

    // Object will hold network in JSON format for D3 graph
    this.network = {
      servers: [],
      switches: [],
      links: []
    };

    for (let i = 0; i < num_switches; i++) {

      // Generate nodes
      this.network.switches.push({
        id: i,
        num_links: 0
      });

    }

    // Generate all links
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
        this.network.switches[i].num_links += 1;
        this.network.switches[j].num_links += 1;
      }
    }

    // Delete links until every switch is below the max number of links
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
      let source = this.network.switches[link.source];
      let dest = this.network.switches[link.target];

      // Decide what the number of max links for these nodes is
      // Either 2 or 3
      let max_links = Math.random() * 3 + 2;

      if (source.num_links > max_links && dest.num_links > max_links) {

        this.network.links[ind] = null;
        source.num_links -= 1;
        dest.num_links -= 1;
      }
    }

    // Remove all null values
    this.network.links = this.network.links.filter(n => n);

  }

  render() {
    return <div id="network" />;
  }
}




export default NetworkSim;