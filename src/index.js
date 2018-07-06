import App from './App';
import React from 'react';
import HyperDoc from './HyperDoc';
import Hypermerge from 'hypermerge';
import ram from 'random-access-memory';
import {render} from 'react-dom';

// const path = 'docs';
const path = ram;

const colors = [
  '#1313ef',
  '#ef1321',
  '#24b554',
  '#851fd3',
  '#0eaff4',
  '#edc112',
  '#7070ff'
];

const hm = new Hypermerge({
  path: path
});

hm.once('ready', (hm) => {
  hm.joinSwarm({utp: false}); // getting an error with utp?

  let id = hm.swarm.id.toString('hex');
  console.log(`My ID: ${id}`);

  // ugh hacky
  HyperDoc.hm = hm;
  let main = document.getElementById('main');
  render(<App hm={hm} id={id} colors={colors} />, main);
});
