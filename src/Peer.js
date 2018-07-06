import Highlight from './Highlight';
import React, {Component} from 'react';


class Peer extends Component {
  render() {
    let peer = this.props.peer;
    let pos = peer.pos.end;
    let style = {
      position: 'absolute',
      background: peer.color,
      left: pos.left
    };

    let idx = peer.idx;
    let highlight = '';
    if (idx.start !== idx.end) {
      highlight = <Highlight
                    text={this.props.text}
                    start={idx.start}
                    end={idx.end}
                    color={peer.color} />;
    }

    return (
      <div>
        <div className='peer-label' style={{top: pos.top - pos.height, ...style}}>{peer.name}</div>
        <div className='peer-cursor' style={{top: pos.top, ...style}}></div>
        {highlight}
      </div>);
  }
}

export default Peer;
