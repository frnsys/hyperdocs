import React, {Component} from 'react';

class Highlight extends Component {
  render() {
    let text = this.props.text;
    let start = text.substr(0, this.props.start);
    let highlight = text.substring(this.props.start, this.props.end);
    let end = text.substr(this.props.end);
    let style = {
      background: this.props.color
    };

    start = <span className='highlight-text'>{start}</span>;
    end = <span className='highlight-text'>{end}</span>;
    highlight = <span className='highlight' style={style}><span className='highlight-text'>{highlight}</span></span>;

    return <div className='highlighter'>{start}{highlight}{end}</div>;
  }
}

export default Highlight;
