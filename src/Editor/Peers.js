import React from 'react';


const localStyle = {
  background: 'rgba(0,0,255,0.2)'
};

// TODO do this per-peer
const remoteStyle = {
  background: 'rgba(0,255,0,0.2)'
};


function Peers(opts) {
  const { localId } = opts;
  const localMark = {
    data: { peerId: localId },
    type: 'peer'
  };
  let lastSelection;

  function onChange(change) {
    let { selection } = change.value;
    if (selection == lastSelection) return;
    if (lastSelection) {
      change = change.removeMarkAtRange(lastSelection, localMark);
    }
    if (!selection.isCollapsed) {
      change.addMark(localMark);
    }
    lastSelection = selection;
  }

  function onBlur(event, change, editor) {
    let { selection } = change.value;
    if (selection.isCollapsed) return;
    change.addMark(localMark);
  }

  function onFocus(event, change, editor) {
    change.removeMark(localMark);
  }

  const renderMark = (props) => {
    let { mark } = props;
    if (mark.type === 'peer') {
      let style = mark.data.get('peerId') == localId ? localStyle : remoteStyle;
      return <span style={style}>{props.children}</span>;
    }
  }

  return { onFocus, onBlur, onChange, renderMark };
};

export default Peers;
