import './Network.css';
import './NetworkNode.js';

import React from "react";
import Server from './Server';
import Client from './Client';
import Switch from './Switch';
import Renderer from './Renderer.js';

import shuffle from "shuffle-array";
import * as Config from './config';

// TODO: move literals to config file


class NetworkSim extends React.Component {

  network = {};
  sim_nodes
  renderer

  // Called when component was rendered
  componentDidMount() {
    this.init = this.init.bind(this);

    this.sim_nodes = [];

    // IMPORTANT: The ID parameter of network nodes and links are used with the renderer
    this.renderer = new Renderer();

    // Generate network architecture
    // TODO: move renderer reference to be passed here
    this.genNetwork();

    this.renderer.draw_network('#network', this.network, this.init);

  }

  // Initialize simulation and start
  init() {
    // Initialize all nodes
    for (let i = 0; i < this.sim_nodes.length; i++) {
      let timeout = Math.random() * Config.MAX_STARTUP_DELAY;
      setTimeout(this.sim_nodes[i].init, timeout);
    }

  }
  // Factory for network sim_nodes
  createNode(type, id) {
    let new_node;
    switch (type) {
      case "client":
        new_node = new Client(id, this.renderer);
        break;
      case "server":
        new_node = new Server(id, this.renderer);
        break;
      case "switch":
        new_node = new Switch(id, this.renderer);
        break;
      default:
        console.error("Unsupported network node type: ", type)
        return
    }
    // Add to internal Sim node reference
    this.sim_nodes.push(new_node);

    // Create renderer node
    this.network.nodes.push({
      id: id,
      num_links: 0,
      type: type
    });
  }

  createLink(link) {
    // Get sim_nodes to connect
    let source = this.sim_nodes[link.source_index];
    let destination = this.sim_nodes[link.target_index];

    // Randomly choose connection speed
    let speed = Math.random() * Config.MAX_LINK_SPEED + Config.MAX_LINK_SPEED;
    
    source.add_connection(destination, speed, link, this.renderer);
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
      // Generate nodes and instantiate sim object
      this.createNode("switch", "switch" + i);
    }

    // 2. Generate all links
    // IMPORTANT: The link sim objects are created AFTER Step 5
    for (let i = 0; i < num_switches; i++) {
      for (let j = 0; j < num_switches; j++) {
        // No link to itself
        if (j === i) continue;
        // Generate link for switch nodes
        this.network.links.push({
          id: "link" + this.network.links.length,
          source: "switch" + i,
          target: "switch" + j,
          source_index: i,
          target_index: j
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
      let source = this.network.nodes[link.source_index];
      let dest = this.network.nodes[link.target_index];

      // Decide what the number of max links for these nodes is
      // Either 2 or 3
      let max_links = Math.random() * 3 + 2;
      if ((source.num_links > max_links && dest.num_links > max_links)) {
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

      let server_id = "server" + i;
      this.createNode("server", server_id);

      // Since node indices start at 0 for all classes, now id offset is needed
      // TODO: move this to some function or clean up
      this.network.links.push({
        id: "link" + this.network.links.length,
        source: server_id,
        target: "switch" + target_switch_index,
        source_index: num_switches + i,
        target_index: target_switch_index
      });

    }

    // 5. Add client nodes
    for (let i = 0; i < num_clients; i++) {

      // Get random switch ID
      // This also ensures that servers are always connected to a switch
      let target_switch_index = Math.floor((Math.random() * num_switches));

      // Indices have to be unique, choose index greater than last switch index
      let client_id = "client" + i;
      this.createNode("client", client_id);

      this.network.links.push({
        id: "link" + this.network.links.length,
        source: client_id,
        target: "switch" + target_switch_index,
        source_index: num_switches + i,
        target_index: target_switch_index
      });

    }

    // Finish by creating link sim object for all links
    for (let i = 0; i < this.network.links.length; i++) {
      this.createLink(this.network.links[i]);
    }

  }

  render() {
    return <div id="network" />;
  }
}

export default NetworkSim;